import { Global, Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { ReservationReaperService } from './reservation-reaper.service';

@Global()
@Module({
  controllers: [UsageController],
  providers: [UsageService, ReservationReaperService],
  exports: [UsageService],
})
export class UsageModule {}
