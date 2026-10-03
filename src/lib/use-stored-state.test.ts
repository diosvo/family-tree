// @vitest-environment jsdom
import { createElement } from 'react';

import { renderToString } from 'react-dom/server';

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { jsonCodec, oneOf, useStoredState } from './use-stored-state';

const colors = oneOf(['red', 'blue'] as const);
const use = () => useStoredState('color', 'red', colors);

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useStoredState', () => {
  it('starts from the initial value, then saves changes', () => {
    const { result } = renderHook(use);
    expect(result.current[0]).toBe('red');

    act(() => result.current[1]('blue'));
    expect(result.current[0]).toBe('blue');
    expect(localStorage.getItem('color')).toBe('blue');
  });

  it('loads a saved value and ignores invalid ones', () => {
    localStorage.setItem('color', 'blue');
    expect(renderHook(use).result.current[0]).toBe('blue');

    localStorage.setItem('color', 'green');
    expect(renderHook(use).result.current[0]).toBe('red');
  });

  it('ignores saved values that do not parse', () => {
    localStorage.setItem('n', '{oops');
    const codec = jsonCodec((v) => v as number);
    const { result } = renderHook(() => useStoredState('n', 1, codec));
    expect(result.current[0]).toBe(1);

    act(() => result.current[1](2));
    expect(localStorage.getItem('n')).toBe('2');
    expect(result.current[0]).toBe(2);
  });

  it('follows changes made in other tabs', () => {
    const { result } = renderHook(use);

    act(() => {
      localStorage.setItem('color', 'blue');
      window.dispatchEvent(new StorageEvent('storage', { key: 'color' }));
    });

    expect(result.current[0]).toBe('blue');
  });

  it('keeps working in memory when storage is refused', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    const { result } = renderHook(use);
    act(() => result.current[1]('blue'));
    expect(result.current[0]).toBe('blue');

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(renderHook(use).result.current[0]).toBe('blue');

    // Nothing kept in memory for this key: the initial value
    expect(
      renderHook(() => useStoredState('size', 'small', oneOf(['small']))).result
        .current[0],
    ).toBe('small');
  });

  it('renders the initial value on the server', () => {
    localStorage.setItem('color', 'blue');

    const Probe = () => use()[0];
    expect(renderToString(createElement(Probe))).toBe('red');
  });
});
