import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { Tenant, type TenantScope } from '../auth/tenant-context';
import { CONTRIBUTORS, Roles } from '../auth/roles.decorator';
import { BackgroundTaskRunnerService } from './background-task-runner.service';
import { BackgroundTasksService } from './background-tasks.service';

@Controller('tasks')
export class BackgroundTasksController {
  constructor(
    private readonly tasks: BackgroundTasksService,
    private readonly runner: BackgroundTaskRunnerService,
  ) {}

  @Get(':id')
  @Roles(...CONTRIBUTORS)
  async get(@Param('id') id: string, @Tenant() tenant?: TenantScope) {
    const task = await this.tasks.get(id, tenant?.organizationId);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  @Post(':id/cancel')
  @Roles(...CONTRIBUTORS)
  async cancel(@Param('id') id: string, @Tenant() tenant?: TenantScope) {
    const task = await this.tasks.cancel(id, tenant?.organizationId);
    if (!task) throw new NotFoundException('Task not found');
    this.runner.cancelLocal(id);
    return { id, status: task.status, cancellationRequested: true };
  }
}
