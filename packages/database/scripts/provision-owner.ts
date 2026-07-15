import './load-env';
import { randomBytes } from 'node:crypto';
import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from '../src';

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
  supabase: ReturnType<typeof createClient>,
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

  const result = await prisma.$transaction(
    async (tx) => {
      const [sameEmail, sameId, existingOrganization] = await Promise.all([
        tx.user.findUnique({ where: { email } }),
        tx.user.findUnique({ where: { id: authUser.id } }),
        tx.organization.findUnique({
          where: { slug: organizationSlug },
          include: { members: { select: { userId: true, role: true } } },
        }),
      ]);
      if (sameEmail && sameEmail.id !== authUser.id) {
        throw new Error(`Application user ${email} is linked to a different Auth UUID`);
      }
      if (sameId && sameId.email.toLowerCase() !== email) {
        throw new Error(`Auth UUID ${authUser.id} is linked to a different application email`);
      }
      if (
        existingOrganization &&
        !existingOrganization.members.some((member) => member.userId === authUser.id) &&
        !attachExistingOrganization
      ) {
        throw new Error(
          `Organization slug ${organizationSlug} already exists; set ATTACH_EXISTING_ORGANIZATION=true to attach the owner`,
        );
      }

      const user = await tx.user.upsert({
        where: { id: authUser.id },
        create: { id: authUser.id, email, name, platformRole: 'PLATFORM_ADMIN' },
        update: { email, name, platformRole: 'PLATFORM_ADMIN' },
      });
      const organization =
        existingOrganization ??
        (await tx.organization.create({
          data: { name: organizationName, slug: organizationSlug },
        }));
      const membership = await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: user.id,
          },
        },
        create: {
          organizationId: organization.id,
          userId: user.id,
          role: 'OWNER',
        },
        update: { role: 'OWNER' },
      });
      return { user, organization, membership };
    },
    { maxWait: 10_000, timeout: 30_000 },
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
  .finally(() => prisma.$disconnect());
