import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useT } from '../i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile, signIn, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const destination =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== '/login'
      ? (location.state as { from: string }).from
      : '/';

  if (session && profile) return <Navigate to={destination} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    try {
      await signIn(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('auth.loginFailed'));
    }
  }

  return (
    <main className="auth-page min-h-screen text-zinc-100 grid place-items-center px-5">
      <section className="auth-card w-full max-w-md rounded-2xl border border-zinc-800 p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <BrainCircuit className="text-violet-400 mb-4" size={32} />
            <h1 className="text-2xl font-semibold">{t('auth.title')}</h1>
            <p className="mt-2 text-sm text-zinc-400">{t('auth.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <LanguageSwitcher compact />
            <ThemeSwitcher compact />
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-300">{t('auth.email')}</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-field w-full rounded-lg border border-zinc-700 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-300">{t('auth.password')}</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-field w-full rounded-lg border border-zinc-700 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
            />
          </label>
          {(submitError || authError) && (
            <p className="rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {submitError ?? authError}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
          <p className="text-center text-sm text-zinc-500">
            {t('auth.noAccount')}{' '}
            <Link className="font-medium text-violet-400 hover:text-violet-300" to="/register">
              {t('auth.createAccount')}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
