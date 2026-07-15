import {
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { db } from '@logo-platform/database';
import { AuthenticatedOnly } from './authenticated.decorator';
import { AuthUser, type AuthIdentity } from './tenant-context';
import { RegisterDto } from './dto/register.dto';

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return slug || 'organization';
}

@Controller('auth')
export class AuthController {
  @Post('register')
  @AuthenticatedOnly()
  async register(@Body() body: RegisterDto, @AuthUser() identity?: AuthIdentity) {
    if (!identity?.email) {
      throw new UnauthorizedException('Authenticated email is required');
    }
    const email = identity.email.trim().toLowerCase();

    await db.transaction(
      async (tx) => {
        const [sameId, sameEmail] = await Promise.all([
          tx.maybeOne<{ id: string; email: string }>(
            'SELECT id, email FROM users WHERE id = $1',
            [identity.userId],
          ),
          tx.maybeOne<{ id: string; email: string }>(
            'SELECT id, email FROM users WHERE email = $1',
            [email],
          ),
        ]);
        if (sameEmail && sameEmail.id !== identity.userId) {
          throw new ConflictException('Email is already linked to another account');
        }
        if (sameId && sameId.email.toLowerCase() !== email) {
          throw new ConflictException('Account is linked to another email');
        }
        const user = await tx.one<{ id: string }>(
          `INSERT INTO users (id, email, name, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (id) DO UPDATE
             SET name = EXCLUDED.name, updated_at = NOW()
           RETURNING id`,
          [identity.userId, email, body.name.trim()],
        );
        const existingMembership = await tx.maybeOne<{ id: string }>(
          'SELECT id FROM organization_members WHERE user_id = $1 LIMIT 1',
          [user.id],
        );
        if (existingMembership) return;

        const baseSlug = slugify(body.organizationName);
        const slugExists = await tx.maybeOne<{ id: string }>(
          'SELECT id FROM organizations WHERE slug = $1',
          [baseSlug],
        );
        const organization = await tx.one<{ id: string }>(
          `INSERT INTO organizations (id, name, slug, updated_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id`,
          [
            randomUUID(),
            body.organizationName.trim(),
            slugExists ? `${baseSlug}-${identity.userId.slice(0, 8)}` : baseSlug,
          ],
        );
        await tx.query(
          `INSERT INTO organization_members (id, organization_id, user_id, role)
           VALUES ($1, $2, $3, 'OWNER'::"Role")`,
          [randomUUID(), organization.id, user.id],
        );
      },
      { isolationLevel: 'READ COMMITTED' },
    );

    return this.me(identity);
  }

  @Get('me')
  @AuthenticatedOnly()
  async me(@AuthUser() identity?: AuthIdentity) {
    if (!identity) throw new UnauthorizedException('Authenticated user is required');

    const user = await db.maybeOne<{
      id: string;
      email: string;
      name: string | null;
      platformRole: 'USER' | 'PLATFORM_ADMIN';
    }>(
      'SELECT id, email, name, platform_role FROM users WHERE id = $1',
      [identity.userId],
    );
    if (!user) {
      throw new UnauthorizedException('User has not been provisioned');
    }
    const memberships = await db.query<{
      role: string;
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
      organizationPlan: string;
    }>(
      `SELECT om.role, o.id AS organization_id, o.name AS organization_name,
              o.slug AS organization_slug, o.plan AS organization_plan
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1
       ORDER BY om.created_at ASC`,
      [user.id],
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.platformRole,
      memberships: memberships.rows.map((membership) => ({
        role: membership.role,
        organization: {
          id: membership.organizationId,
          name: membership.organizationName,
          slug: membership.organizationSlug,
          plan: membership.organizationPlan,
        },
      })),
    };
  }
}
