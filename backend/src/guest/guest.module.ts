import { Module } from '@nestjs/common';
import { PromptsModule } from '../prompts/prompts.module';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { GuestController } from './guest.controller';

@Module({
  imports: [PromptsModule],
  controllers: [GuestController],
  providers: [RateLimitService],
})
export class GuestModule {}
