import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

type JsonApiResponse<T> = {
  data?: { id: string; attributes?: T };
  errors?: Array<{ detail?: string; title?: string }>;
};

@Injectable()
export class LemonSqueezyClient {
  private readonly apiBase = 'https://api.lemonsqueezy.com/v1';

  async createCheckout(input: {
    variantId: string;
    userId: string;
    organizationId: string;
    checkoutSessionId: string;
    nonce: string;
    checkoutKind?: 'subscription' | 'logo_addon';
    pack?: string;
  }): Promise<string> {
    const storeId = this.required('LEMON_SQUEEZY_STORE_ID');
    const frontendUrl = this.required('FRONTEND_URL').replace(/\/+$/, '');
    const response = await this.request<{ url?: string }>('/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                user_id: input.userId,
                organization_id: input.organizationId,
                checkout_session_id: input.checkoutSessionId,
                nonce: input.nonce,
                checkout_kind: input.checkoutKind ?? 'subscription',
                ...(input.pack ? { pack: input.pack } : {}),
              },
            },
            product_options: {
              redirect_url: `${frontendUrl}/settings?billing=success`,
            },
            checkout_options: {
              embed: false,
              media: false,
              logo: true,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: storeId } },
            variant: { data: { type: 'variants', id: input.variantId } },
          },
        },
      }),
    });
    const url = response.data?.attributes?.url;
    if (!url) throw new BadGatewayException('Billing provider returned no checkout URL');
    return url;
  }

  async getCustomerPortalUrl(customerId: string): Promise<string> {
    const response = await this.request<{ urls?: { customer_portal?: string } }>(
      `/customers/${encodeURIComponent(customerId)}`,
    );
    const url = response.data?.attributes?.urls?.customer_portal;
    if (!url) throw new BadGatewayException('Billing provider returned no portal URL');
    return url;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<JsonApiResponse<T>> {
    const apiKey = this.required('LEMON_SQUEEZY_API_KEY');
    const response = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
        ...init.headers,
      },
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await response.json().catch(() => ({}))) as JsonApiResponse<T>;
    if (!response.ok) {
      const detail = body.errors?.[0]?.detail ?? body.errors?.[0]?.title;
      throw new BadGatewayException(detail ?? `Billing provider failed (${response.status})`);
    }
    return body;
  }

  private required(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new ServiceUnavailableException(`${name} is not configured`);
    return value;
  }
}
