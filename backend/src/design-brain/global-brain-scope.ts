import { ServiceUnavailableException } from '@nestjs/common';
import { db } from '@logo-platform/database';
import type { BrainTenantScope } from '@logo-platform/shared';

let cachedOrganizationId: string | undefined;

export async function getGlobalBrainScope(
  userId?: string,
): Promise<BrainTenantScope> {
  if (!cachedOrganizationId) {
    const slug =
      process.env.BRAIN_GLOBAL_ORGANIZATION_SLUG?.trim() || 'logo-modernism';
    const organization = await db.maybeOne<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = $1',
      [slug],
    );
    if (!organization) {
      throw new ServiceUnavailableException(
        `Global Brain organization is not configured: ${slug}`,
      );
    }
    cachedOrganizationId = organization.id;
  }
  return {
    organizationId: cachedOrganizationId,
    userId,
  };
}
