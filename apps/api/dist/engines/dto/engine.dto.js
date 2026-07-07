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
exports.SVGBlueprintRequestDto = exports.FullPipelineRequestDto = exports.ReverseAnalysisRequestDto = exports.GeometryRequestDto = exports.LetterDNARequestDto = exports.BrandDNARequestDto = void 0;
const class_validator_1 = require("class-validator");
class BrandDNARequestDto {
    companyName;
    industry;
    values;
    targetAudience;
    personality;
    markType;
    typographyStyle;
}
exports.BrandDNARequestDto = BrandDNARequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BrandDNARequestDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BrandDNARequestDto.prototype, "industry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], BrandDNARequestDto.prototype, "values", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BrandDNARequestDto.prototype, "targetAudience", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['bold', 'refined', 'playful', 'technical', 'luxurious', 'approachable']),
    __metadata("design:type", String)
], BrandDNARequestDto.prototype, "personality", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['wordmark', 'lettermark', 'combination']),
    __metadata("design:type", String)
], BrandDNARequestDto.prototype, "markType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['standard', 'constructed']),
    __metadata("design:type", String)
], BrandDNARequestDto.prototype, "typographyStyle", void 0);
class LetterDNARequestDto {
    text;
    style;
}
exports.LetterDNARequestDto = LetterDNARequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LetterDNARequestDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['geometric', 'humanist', 'grotesque', 'monoline', 'custom']),
    __metadata("design:type", String)
], LetterDNARequestDto.prototype, "style", void 0);
class GeometryRequestDto {
    industry;
    preferredShapes;
    complexity;
}
exports.GeometryRequestDto = GeometryRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeometryRequestDto.prototype, "industry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], GeometryRequestDto.prototype, "preferredShapes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['minimal', 'medium', 'high']),
    __metadata("design:type", String)
], GeometryRequestDto.prototype, "complexity", void 0);
class ReverseAnalysisRequestDto {
    description;
    observedShapes;
    observedColors;
}
exports.ReverseAnalysisRequestDto = ReverseAnalysisRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReverseAnalysisRequestDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ReverseAnalysisRequestDto.prototype, "observedShapes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ReverseAnalysisRequestDto.prototype, "observedColors", void 0);
class FullPipelineRequestDto {
    companyName;
    industry;
    variationCount;
    markType;
}
exports.FullPipelineRequestDto = FullPipelineRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FullPipelineRequestDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FullPipelineRequestDto.prototype, "industry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], FullPipelineRequestDto.prototype, "variationCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['symbol', 'wordmark', 'combination', 'emblem']),
    __metadata("design:type", String)
], FullPipelineRequestDto.prototype, "markType", void 0);
class SVGBlueprintRequestDto {
    primitiveIds;
}
exports.SVGBlueprintRequestDto = SVGBlueprintRequestDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], SVGBlueprintRequestDto.prototype, "primitiveIds", void 0);
//# sourceMappingURL=engine.dto.js.map