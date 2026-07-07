"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchPrinciplesDto = exports.GeneratePromptDto = void 0;
const class_validator_1 = require("class-validator");
class GeneratePromptDto {
    industry;
    companyName;
    variationCount;
    inspirationMode;
    preferredEra;
    minimalismLevel;
    analysisPrincipleIds;
    catalogReferenceIds;
    catalogNarrative;
    markType;
    typographyStyle;
}
exports.GeneratePromptDto = GeneratePromptDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePromptDto.prototype, "industry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePromptDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], GeneratePromptDto.prototype, "variationCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['swiss', 'bauhaus', 'ibm', 'nasa', 'lufthansa', 'braun', 'cbs', 'abc', 'olivetti', 'westinghouse']),
    __metadata("design:type", String)
], GeneratePromptDto.prototype, "inspirationMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePromptDto.prototype, "preferredEra", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], GeneratePromptDto.prototype, "minimalismLevel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], GeneratePromptDto.prototype, "analysisPrincipleIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], GeneratePromptDto.prototype, "catalogReferenceIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePromptDto.prototype, "catalogNarrative", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['wordmark', 'lettermark', 'combination']),
    __metadata("design:type", String)
], GeneratePromptDto.prototype, "markType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['standard', 'constructed']),
    __metadata("design:type", String)
], GeneratePromptDto.prototype, "typographyStyle", void 0);
class SearchPrinciplesDto {
    query;
    category;
    industry;
    era;
}
exports.SearchPrinciplesDto = SearchPrinciplesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchPrinciplesDto.prototype, "query", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchPrinciplesDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchPrinciplesDto.prototype, "industry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchPrinciplesDto.prototype, "era", void 0);
//# sourceMappingURL=generate-prompt.dto.js.map