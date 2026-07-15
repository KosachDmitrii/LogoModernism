import {
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { prisma } from '@logo-platform/database';
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

    await prisma.$transaction(
      async (tx) => {
        const [sameId, sameEmail] = await Promise.all([
          tx.user.findUnique({
            where: { id: identity.userId },
          }),
          tx.user.findUnique({ where: { email } }),
        ]);
        if (sameEmail && sameEmail.id !== identity.userId) {
          throw new ConflictException('Email is already linked to another account');
        }
        if (sameId && sameId.email.toLowerCase() !== email) {
          throw new ConflictException('Account is linked to another email');
        }
        const user = await tx.user.upsert({
          where: { id: identity.userId },
          create: { id: identity.userId, email, name: body.name.trim() },
          update: { name: body.name.trim() },
        });
        const existingMembership = await tx.organizationMember.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });
        if (existingMembership) return;

        const baseSlug = slugify(body.organizationName);
        const slugExists = await tx.organization.findUnique({ where: { slug: baseSlug } });
        const organization = await tx.organization.create({
          data: {
            name: body.organizationName.trim(),
            slug: slugExists ? `${baseSlug}-${identity.userId.slice(0, 8)}` : baseSlug,
          },
        });
        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: 'OWNER',
          },
        });
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    return this.me(identity);
  }

  @Get('me')
  @AuthenticatedOnly()
  async me(@AuthUser() identity?: AuthIdentity) {
    if (!identity) throw new UnauthorizedException('Authenticated user is required');

    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: {
        id: true,
        email: true,
        name: true,
        organizations: {
          select: {
            role: true,
            organization: {
              select: { id: true, name: true, slug: true, plan: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User has not been provisioned');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      memberships: user.organizations.map(({ role, organization }) => ({
        role,
        organization,
      })),
    };
  }
}
