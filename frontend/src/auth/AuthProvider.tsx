import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import { getApiBase } from '../lib/api-base';
import { getSupabaseClient } from '../lib/supabase';
import { useAppStore } from '../store';
import { useBrainIngestStore } from '../stores/brain-ingest-store';
import {
  BRIEF_BUILD_ADVANCE_KEY,
  BRIEF_BUILD_SECTION_KEY,
  clearPersistedPromptsWizardStep,
} from '../lib/brief-navigation';

const PENDING_REGISTRATION_KEY = 'logo-platform.pending-registration';

type RegistrationDetails = {
  name: string;
  organizationName?: string;
};

export type AuthProfile = {
  id: string;
  email: string;
  name: string | null;
  accessRole: 'ADMIN' | 'USER';
  plan: 'FREE' | 'PLUS' | 'PRO';
  organizationName: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    details: RegistrationDetails,
  ) => Promise<{ confirmationRequired: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fetchProfile(session: Session): Promise<AuthProfile> {
  const response = await fetch(`${getApiBase()}/auth/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Unable to load account (${response.status})`);
  }
  return response.json() as Promise<AuthProfile>;
}

async function registerProfile(
  session: Session,
  details: RegistrationDetails,
): Promise<AuthProfile> {
  const response = await fetch(`${getApiBase()}/auth/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(details),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Unable to create account (${response.status})`);
  }
  return response.json() as Promise<AuthProfile>;
}

function readPendingRegistration(): RegistrationDetails | null {
  const raw = localStorage.getItem(PENDING_REGISTRATION_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as RegistrationDetails;
    if (!value.name) return null;
    return value;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionWorkRef = useRef<{ token: string; promise: Promise<void> } | null>(null);

  const establishSession = useCallback(async (nextSession: Session | null) => {
    const userChanged = useAppStore
      .getState()
      .activateUser(nextSession?.user.id ?? null);
    if (userChanged) {
      queryClient.clear();
      clearPersistedPromptsWizardStep();
      sessionStorage.removeItem(BRIEF_BUILD_SECTION_KEY);
      sessionStorage.removeItem(BRIEF_BUILD_ADVANCE_KEY);
      useBrainIngestStore.setState({ jobs: [], activeJobId: null });
    }
    setSession(nextSession);
    setError(null);
    if (!nextSession) {
      sessionWorkRef.current = null;
      setProfile(null);
      setLoading(false);
      return;
    }

    const existingWork = sessionWorkRef.current;
    if (existingWork?.token === nextSession.access_token) {
      return existingWork.promise;
    }

    const promise = (async () => {
      setLoading(true);
      try {
        const pendingRegistration = readPendingRegistration();
        if (pendingRegistration) {
          await registerProfile(nextSession, pendingRegistration);
          localStorage.removeItem(PENDING_REGISTRATION_KEY);
        }
        const nextProfile = await fetchProfile(nextSession);
        setProfile(nextProfile);
      } catch (nextError) {
        setProfile(null);
        setError(errorMessage(nextError));
      } finally {
        setLoading(false);
      }
    })();

    sessionWorkRef.current = { token: nextSession.access_token, promise };
    return promise;
  }, [queryClient]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = getSupabaseClient();
      void supabase.auth.getSession().then(({ data }) => {
        if (mounted) void establishSession(data.session);
      });
      const subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (mounted) void establishSession(nextSession);
      });
      unsubscribe = () => subscription.data.subscription.unsubscribe();
    } catch (configurationError) {
      setError(errorMessage(configurationError));
      setLoading(false);
    }
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [establishSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: signInError } = await getSupabaseClient().auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        await establishSession(data.session);
      } catch (signInError) {
        const message = errorMessage(signInError);
        setError(message);
        setLoading(false);
        throw signInError;
      }
    },
    [establishSession],
  );

  const signUp = useCallback(
    async (email: string, password: string, details: RegistrationDetails) => {
      setLoading(true);
      setError(null);
      localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(details));
      try {
        const { data, error: signUpError } = await getSupabaseClient().auth.signUp({
          email,
          password,
          options: {
            data: { name: details.name, organization_name: details.organizationName ?? null },
            emailRedirectTo: `${window.location.origin}/register`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          await establishSession(data.session);
        } else {
          setLoading(false);
        }
        return { confirmationRequired: !data.session };
      } catch (signUpError) {
        localStorage.removeItem(PENDING_REGISTRATION_KEY);
        const message = errorMessage(signUpError);
        setError(message);
        setLoading(false);
        throw signUpError;
      }
    },
    [establishSession],
  );

  const signOut = useCallback(async () => {
    await getSupabaseClient().auth.signOut();
    localStorage.removeItem('logo-platform.project-id');
    localStorage.removeItem('logo-platform.access-token');
    localStorage.removeItem('logo-platform.user-id');
    queryClient.clear();
    await establishSession(null);
  }, [establishSession, queryClient]);

  useEffect(() => {
    const handleUnauthorized = () => void signOut();
    window.addEventListener('logo-platform:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('logo-platform:unauthorized', handleUnauthorized);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      error,
      signIn,
      signUp,
      signOut,
    }),
    [error, loading, profile, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
