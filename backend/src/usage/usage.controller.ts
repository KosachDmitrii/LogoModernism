import { Controller, Get } from '@nestjs/common';
import { ALL_MEMBERS, Roles } from '../auth/roles.decorator';
import { Tenant, type TenantScope } from '../auth/tenant-context';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get('overview')
  @Roles(...ALL_MEMBERS)
  overview(@Tenant() tenant?: TenantScope) {
    return this.usage.summary(tenant!);
  }
}
