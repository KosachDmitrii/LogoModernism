import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { ALL_MEMBERS, Roles } from '../auth/roles.decorator';
import { Tenant, type TenantScope } from '../auth/tenant-context';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';
import { AddonCheckoutDto } from './dto/addon-checkout.dto';
import { WebhookVerifierService } from './webhook-verifier.service';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly verifier: WebhookVerifierService,
  ) {}

  @Get('current')
  @Roles(...ALL_MEMBERS)
  current(@Tenant() tenant?: TenantScope) {
    return this.billing.overview(tenant!);
  }

  @Post('checkout')
  @Roles('OWNER', 'ADMIN')
  checkout(@Body() body: CheckoutDto, @Tenant() tenant?: TenantScope) {
    return this.billing.createCheckout(tenant!, body.plan);
  }

  @Post('addons/checkout')
  @Roles('OWNER', 'ADMIN')
  addonCheckout(@Body() body: AddonCheckoutDto, @Tenant() tenant?: TenantScope) {
    return this.billing.createAddonCheckout(tenant!, body.pack);
  }

  @Post('portal')
  @Roles('OWNER', 'ADMIN')
  portal(@Tenant() tenant?: TenantScope) {
    return this.billing.customerPortal(tenant!);
  }

  @Public()
  @Post('webhooks/lemon-squeezy')
  webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-signature') signature?: string,
    @Headers('x-event-name') eventName?: string,
  ) {
    if (!request.rawBody) throw new BadRequestException('Raw webhook body is required');
    this.verifier.verify(request.rawBody, signature);
    return this.billing.processWebhook(request.rawBody, eventName);
  }
}
