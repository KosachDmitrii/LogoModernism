import { Global, Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { BackgroundTaskHandlersService } from './background-task-handlers.service';
import { BackgroundTaskRunnerService } from './background-task-runner.service';
import { BackgroundTasksController } from './background-tasks.controller';
import { BackgroundTasksService } from './background-tasks.service';

@Global()
@Module({
  imports: [StorageModule],
  controllers: [BackgroundTasksController],
  providers: [
    BackgroundTasksService,
    BackgroundTaskHandlersService,
    BackgroundTaskRunnerService,
  ],
  exports: [BackgroundTasksService, BackgroundTaskRunnerService],
})
export class BackgroundTasksModule {}
