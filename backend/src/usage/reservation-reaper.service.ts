import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { UsageService } from './usage.service';

@Injectable()
export class ReservationReaperService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly usage: UsageService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.usage.reapExpired().catch(() => undefined);
    }, 60_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
