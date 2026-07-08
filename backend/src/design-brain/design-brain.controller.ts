import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { BrainResearchCandidateStatus, BrainSourceType } from '@logo-platform/shared';
import { DesignBrainApiService } from './design-brain.service';
import {
  BrainFeedbackDto,
  BrainPdfIngestCheckDto,
  BrainResearchPreviewDto,
  BrainResearchRunDto,
} from './dto/brain.dto';

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@Controller('brain')
export class DesignBrainController {
  constructor(private readonly service: DesignBrainApiService) {}

  @Get('health')
  health() {
    return this.service.getCapabilities();
  }

  @Get('stats')
  stats() {
    return this.service.getStats();
  }

  @Get('taste-profile')
  tasteProfile() {
    return this.service.getTasteProfile();
  }

  @Post('consolidate')
  consolidate() {
    return this.service.consolidate();
  }

  @Get('experiences')
  experiences(
    @Query('sourceType') sourceType?: BrainSourceType,
    @Query('limit') limit?: string,
  ) {
    return this.service.listExperiences(sourceType, limit ? Number(limit) : undefined);
  }

  @Get('experiences/:id')
  experience(@Param('id') id: string) {
    return this.service.getExperience(id);
  }

  @Get('principles')
  principles(@Query('limit') limit?: string) {
    return this.service.listPrinciples(limit ? Number(limit) : undefined);
  }

  @Post('research/run')
  runResearch(@Body() body: BrainResearchRunDto) {
    return this.service.runResearch(body.query, body.maxSources);
  }

  @Post('research/preview')
  previewResearch(@Body() body: BrainResearchPreviewDto) {
    return this.service.previewResearch(body.query, body.url);
  }

  @Get('research/candidates')
  researchCandidates(@Query('status') status?: BrainResearchCandidateStatus) {
    return this.service.listResearchCandidates(status);
  }

  @Get('research/candidates/:id')
  researchCandidate(@Param('id') id: string) {
    return this.service.getResearchCandidate(id);
  }

  @Post('research/candidates/:id/approve')
  approveResearch(@Param('id') id: string) {
    return this.service.approveResearch(id);
  }

  @Post('research/candidates/:id/reject')
  rejectResearch(@Param('id') id: string) {
    return this.service.rejectResearch(id);
  }

  @Post('ingest/pdf/check')
  checkPdfIngest(@Body() body: BrainPdfIngestCheckDto) {
    return this.service.checkPdfIngest(body.title, body.contentHash);
  }

  @Post('ingest/pdf')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  ingestPdf(
    @UploadedFile() file: UploadedFile,
    @Body('title') title?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('PDF file is required (field name: file)');
    }
    if (!title?.trim()) {
      throw new BadRequestException('Title is required');
    }
    return this.service.ingestPdf(file.buffer, file.originalname, title);
  }

  @Post('ingest/image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  ingestImage(
    @UploadedFile() file: UploadedFile,
    @Body('title') title?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new Error('Image file is required (field name: file)');
    }
    return this.service.ingestImage(file.buffer, file.originalname, title, file.mimetype);
  }

  @Post('ingest/feedback')
  ingestFeedback(@Body() body: BrainFeedbackDto) {
    return this.service.ingestFeedback(body);
  }
}
