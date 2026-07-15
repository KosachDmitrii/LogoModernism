import { useState, type FormEvent } from 'react';
import { Building2 } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useT } from '../i18n';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function RegisterPage() {
  const t = useT();
  const navigate = useNavigate();
  const { session, profile, signUp, loading, error: authError } = useAuth();
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  if (session && profile) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (password !== confirmation) {
      setSubmitError(t('auth.passwordMismatch'));
      return;
    }
    try {
      const result = await signUp(email.trim(), password, {
        name: name.trim(),
        organizationName: organizationName.trim() || undefined,
      });
      if (result.confirmationRequired) {
        setConfirmationRequired(true);
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('auth.registrationFailed'));
    }
  }

  return (
    <main className="auth-page min-h-screen text-zinc-100 grid place-items-center px-5 py-10">
      <section className="auth-card w-full max-w-lg rounded-2xl border border-zinc-800 p-7 shadow-2xl">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <Building2 className="mb-4 text-violet-400" size={32} />
            <h1 className="text-2xl font-semibold">{t('auth.registerTitle')}</h1>
            <p className="mt-2 text-sm text-zinc-400">{t('auth.registerSubtitle')}</p>
          </div>
          <div className="flex gap-2">
            <LanguageSwitcher compact />
            <ThemeSwitcher compact />
          </div>
        </div>

        {confirmationRequired ? (
          <div className="space-y-5">
            <p className="rounded-xl border border-emerald-800/40 bg-emerald-950/30 p-4 text-sm text-emerald-300">
              {t('auth.checkEmail')}
            </p>
            <Link
              to="/login"
              className="block w-full rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-violet-500"
            >
              {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField
                label={t('auth.name')}
                value={name}
                onChange={setName}
                autoComplete="name"
              />
              <AuthField
                label={t('auth.organization')}
                value={organizationName}
                onChange={setOrganizationName}
                autoComplete="organization"
                required={false}
              />
            </div>
            <AuthField
              label={t('auth.email')}
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField
                label={t('auth.password')}
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete="new-password"
                minLength={12}
              />
              <AuthField
                label={t('auth.confirmPassword')}
                value={confirmation}
                onChange={setConfirmation}
                type="password"
                autoComplete="new-password"
                minLength={12}
              />
            </div>
            {(submitError || authError) && (
              <p className="rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300">
                {submitError ?? authError}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </Button>
            <p className="text-center text-sm text-zinc-500">
              {t('auth.hasAccount')}{' '}
              <Link className="font-medium text-violet-400 hover:text-violet-300" to="/login">
                {t('auth.signIn')}
              </Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}

function AuthField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  minLength,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-zinc-300">{label}</span>
      <Input
        required={required}
        type={type}
        value={value}
        minLength={minLength}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="auth-field w-full rounded-lg border border-zinc-700 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
      />
    </label>
  );
}
