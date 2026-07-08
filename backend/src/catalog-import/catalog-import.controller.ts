import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import type { CatalogCandidate } from '@logo-platform/shared';
import { CatalogImportService } from './catalog-import.service';

@Controller('catalog-import')
export class CatalogImportController {
  constructor(private readonly service: CatalogImportService) {}

  @Get('stats')
  stats() {
    return this.service.getStats();
  }

  @Get('pages-index')
  pagesIndex() {
    return this.service.getPagesIndex();
  }

  @Get('candidates')
  candidates(@Query('status') status?: string) {
    return this.service.listCandidates(status);
  }

  @Get('candidates/:id')
  one(@Param('id') id: string) {
    return this.service.getCandidate(id);
  }

  @Patch('candidates/:id')
  update(@Param('id') id: string, @Body() patch: Partial<CatalogCandidate>) {
    return this.service.updateCandidate(id, patch);
  }

  @Post('candidates/:id/approve')
  approve(@Param('id') id: string, @Body() patch?: Partial<CatalogCandidate>) {
    return this.service.approve(id, patch);
  }

  @Post('candidates/:id/reject')
  reject(@Param('id') id: string, @Body() body?: { notes?: string }) {
    return this.service.reject(id, body?.notes);
  }

  @Post('bulk-approve')
  bulkApprove(@Body() body: { ids: string[] }) {
    return this.service.bulkApprove(body.ids ?? []);
  }

  @Post('bulk-reject')
  bulkReject(@Body() body: { ids: string[]; notes?: string }) {
    return this.service.bulkReject(body.ids ?? [], body.notes);
  }

  @Get('approved')
  approved() {
    return this.service.listApproved();
  }

  @Post('sync-catalog')
  syncCatalog() {
    return this.service.syncImportedCatalog();
  }

  @Get('page-image/:filename')
  servePage(@Param('filename') filename: string, @Res({ passthrough: true }) res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const stream = this.service.createPageImageStream(`pages/${safe}`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png');
    return new StreamableFile(stream);
  }
}
