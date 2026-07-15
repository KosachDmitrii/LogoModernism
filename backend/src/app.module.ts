import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PromptsModule } from './prompts/prompts.module';
import { PrinciplesModule } from './principles/principles.module';
import { EnginesModule } from './engines/engines.module';
import { ImagesModule } from './images/images.module';
import { DesignBrainModule } from './design-brain/design-brain.module';
import { HealthController } from './health.controller';
import { requestIdMiddleware } from './common/request-id.middleware';
import { PostgreSqlPoolTimeoutFilter } from './common/postgresql-pool-timeout.filter';
import { DatabaseShutdownService } from './common/database-shutdown.service';
import { RequestTimingInterceptor } from './observability/request-timing.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsageModule } from './usage/usage.module';
import { BillingModule } from './billing/billing.module';
import { GuestModule } from './guest/guest.module';
import { BackgroundTasksModule } from './background-tasks/background-tasks.module';

@Module({
  imports: [
    AuthModule,
    UsageModule,
    BillingModule,
    GuestModule,
    BackgroundTasksModule,
    PromptsModule,
    PrinciplesModule,
    EnginesModule,
    ImagesModule,
    DesignBrainModule,
  ],
  controllers: [HealthController],
  providers: [
    DatabaseShutdownService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTimingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: PostgreSqlPoolTimeoutFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(requestIdMiddleware)
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });
  }
}
