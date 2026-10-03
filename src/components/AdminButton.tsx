import { useState } from 'react';

import { Lock, LogOut } from 'lucide-react';

import { Dialog } from '@/components/ui/dialog';
import { useFamily } from '@/lib/family-store';
import { useT } from '@/lib/i18n';
import { btn, btnPrimary, input } from '@/lib/utils';

/** Signs in with the admin passcode, or out when already signed in. */
export function AdminButton({ onLogout }: { onLogout: () => void }) {
  const { isAdmin, login, logout } = useFamily();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');

  const [status, setStatus] = useState<
    'idle' | 'checking' | 'wrong' | 'locked'
  >('idle');

  const close = (next: boolean) => {
    setOpen(next);
    setCode('');
    setStatus('idle');
  };

  return (
    <>
      <button
        onClick={() => {
          if (!isAdmin) return close(true);
          onLogout();
          void logout();
        }}
        className={`${btn} flex items-center gap-1`}
      >
        {isAdmin ? (
          <LogOut className="h-3.5 w-3.5" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
        {t('admin')}
      </button>
      <Dialog open={open} onOpenChange={close} title={t('adminPasscode')}>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!code || status === 'checking') return;
            setStatus('checking');

            try {
              const result = await login(code);
              if (result === 'ok') close(false);
              else setStatus(result);
            } catch {
              setStatus('wrong');
            }
          }}
        >
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label={t('adminPasscode')}
            aria-invalid={status === 'wrong' || status === 'locked'}
            className={input}
          />
          {(status === 'wrong' || status === 'locked') && (
            <p role="alert" className="text-sm text-destructive">
              {t(status === 'wrong' ? 'wrongPasscode' : 'tooManyAttempts')}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => close(false)} className={btn}>
              {t('cancel')}
            </button>
            <button
              disabled={!code || status === 'checking'}
              className={btnPrimary}
            >
              {t('signIn')}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
