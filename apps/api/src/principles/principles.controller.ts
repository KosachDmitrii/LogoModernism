import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrinciplesService } from './principles.service';

@Controller('principles')
export class PrinciplesController {
  constructor(private readonly principlesService: PrinciplesService) {}

  @Get()
  overview() {
    return this.principlesService.findAll();
  }

  @Get('search')
  search(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('industry') industry?: string,
    @Query('era') era?: string,
  ) {
    return this.principlesService.search({ query, category, industry, era });
  }

  @Get('graph')
  graph() {
    return this.principlesService.getGraph();
  }

  @Get('references')
  references() {
    return this.principlesService.getReferences();
  }

  @Get('catalog/taxonomy')
  catalogTaxonomy() {
    return this.principlesService.getCatalogTaxonomy();
  }

  @Get('catalog/stats')
  catalogStats() {
    return this.principlesService.getCatalogStats();
  }

  @Get('catalog/case-studies')
  caseStudies() {
    return this.principlesService.getCaseStudies();
  }

  @Get('catalog/designers')
  designerProfiles() {
    return this.principlesService.getDesignerProfiles();
  }

  @Get('catalog/search')
  catalogSearch(
    @Query('q') query?: string,
    @Query('chapter') chapter?: string,
    @Query('section') section?: string,
    @Query('era') era?: string,
    @Query('industry') industry?: string,
    @Query('designer') designer?: string,
    @Query('entryKind') entryKind?: string,
    @Query('markType') markType?: string,
  ) {
    return this.principlesService.searchCatalog({
      query,
      chapter,
      section,
      era,
      industry,
      designer,
      entryKind,
      markType,
    });
  }

  @Get('catalog/:id')
  catalogEntry(@Param('id') id: string) {
    return this.principlesService.getCatalogEntry(id);
  }

  @Get('templates')
  templates(@Query('tags') tags?: string) {
    return this.principlesService.getTemplates(tags);
  }

  @Get('category/:category')
  byCategory(@Param('category') category: string) {
    return this.principlesService.findByCategory(category);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.principlesService.findOne(id);
  }
}
