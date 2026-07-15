import './load-env';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  createClient,
  type SupabaseClient,
  type User as SupabaseUser,
} from '@supabase/supabase-js';
import { db, disconnect } from '../src';

const email = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase();
const name = (process.env.OWNER_NAME ?? 'Dmitrii Kosach').trim();
const organizationName = (process.env.OWNER_ORGANIZATION_NAME ?? 'Logo Modernism').trim();
const organizationSlug = (process.env.OWNER_ORGANIZATION_SLUG ?? 'logo-modernism')
  .trim()
  .toLowerCase();
const attachExistingOrganization = process.env.ATTACH_EXISTING_ORGANIZATION === 'true';
const resetExistingPassword = process.env.RESET_OWNER_PASSWORD === 'true';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function temporaryPassword(): string {
  return `${randomBytes(18).toString('base64url')}Aa1!`;
}

async function findAuthUser(
  supabase: SupabaseClient<any, any, any, any, any>,
): Promise<SupabaseUser | null> {
  const perPage = 1_000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
}

async function main(): Promise<void> {
  if (!email) throw new Error('OWNER_EMAIL is required');
  const supabaseUrl = required('SUPABASE_URL').replace(/\/+$/, '');
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let authUser = await findAuthUser(supabase);
  let generatedPassword: string | null = null;
  if (!authUser) {
    generatedPassword = process.env.OWNER_PASSWORD?.trim() || temporaryPassword();
    if (generatedPassword.length < 12) {
      throw new Error('OWNER_PASSWORD must contain at least 12 characters');
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw error;
    authUser = data.user;
  } else if (resetExistingPassword) {
    generatedPassword = process.env.OWNER_PASSWORD?.trim() || temporaryPassword();
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { ...authUser.user_metadata, name },
    });
    if (error) throw error;
    authUser = data.user;
  }

  const result = await db.transaction(
    async (tx) => {
      const [sameEmail, sameId, existingOrganization] = await Promise.all([
        tx.maybeOne<{ id: string; email: string }>(
          'SELECT id, email FROM users WHERE email = $1',
          [email],
        ),
        tx.maybeOne<{ id: string; email: string }>(
          'SELECT id, email FROM users WHERE id = $1',
          [authUser.id],
        ),
        tx.maybeOne<{ id: string; name: string; slug: string }>(
          'SELECT id, name, slug FROM organizations WHERE slug = $1',
          [organizationSlug],
        ),
      ]);
      if (sameEmail && sameEmail.id !== authUser.id) {
        throw new Error(`Application user ${email} is linked to a different Auth UUID`);
      }
      if (sameId && sameId.email.toLowerCase() !== email) {
        throw new Error(`Auth UUID ${authUser.id} is linked to a different application email`);
      }
      if (
        existingOrganization &&
        !(await tx.maybeOne<{ userId: string }>(
          `SELECT user_id
           FROM organization_members
           WHERE organization_id = $1 AND user_id = $2`,
          [existingOrganization.id, authUser.id],
        )) &&
        !attachExistingOrganization
      ) {
        throw new Error(
          `Organization slug ${organizationSlug} already exists; set ATTACH_EXISTING_ORGANIZATION=true to attach the owner`,
        );
      }

      const user = await tx.one<{
        id: string;
        email: string;
        platformRole: 'PLATFORM_ADMIN';
      }>(
        `INSERT INTO users (id, email, name, platform_role, updated_at)
         VALUES ($1, $2, $3, 'PLATFORM_ADMIN'::"PlatformRole", NOW())
         ON CONFLICT (id) DO UPDATE
           SET email = EXCLUDED.email,
               name = EXCLUDED.name,
               platform_role = EXCLUDED.platform_role,
               updated_at = NOW()
         RETURNING id, email, platform_role`,
        [authUser.id, email, name],
      );
      const organization =
        existingOrganization ??
        (await tx.one<{ id: string; name: string; slug: string }>(
          `INSERT INTO organizations (id, name, slug, updated_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, name, slug`,
          [randomUUID(), organizationName, organizationSlug],
        ));
      const membership = await tx.one<{ role: 'OWNER' }>(
        `INSERT INTO organization_members (id, organization_id, user_id, role)
         VALUES ($1, $2, $3, 'OWNER'::"Role")
         ON CONFLICT (organization_id, user_id) DO UPDATE
           SET role = EXCLUDED.role
         RETURNING role`,
        [randomUUID(), organization.id, user.id],
      );
      return { user, organization, membership };
    },
    { isolationLevel: 'READ COMMITTED' },
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        email: result.user.email,
        userId: result.user.id,
        organizationId: result.organization.id,
        organizationSlug: result.organization.slug,
        role: result.membership.role,
        platformRole: result.user.platformRole,
        temporaryPassword: generatedPassword,
        passwordChanged: Boolean(generatedPassword),
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
