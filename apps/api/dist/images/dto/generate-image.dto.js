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
exports.GenerateFromComposedPromptDto = exports.GenerateImageDto = void 0;
const class_validator_1 = require("class-validator");
class GenerateImageDto {
    prompt;
    companyName;
    provider;
    size;
    count;
}
exports.GenerateImageDto = GenerateImageDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateImageDto.prototype, "prompt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateImageDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['openai', 'mock']),
    __metadata("design:type", String)
], GenerateImageDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['1024x1024', '1024x1792', '1792x1024']),
    __metadata("design:type", String)
], GenerateImageDto.prototype, "size", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(4),
    __metadata("design:type", Number)
], GenerateImageDto.prototype, "count", void 0);
class GenerateFromComposedPromptDto {
    text;
    industry;
    companyName;
    provider;
    markType;
    typographyStyle;
    size;
}
exports.GenerateFromComposedPromptDto = GenerateFromComposedPromptDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateFromComposedPromptDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateFromComposedPromptDto.prototype, "industry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateFromComposedPromptDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['openai', 'mock']),
    __metadata("design:type", String)
], GenerateFromComposedPromptDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['wordmark', 'lettermark', 'combination']),
    __metadata("design:type", String)
], GenerateFromComposedPromptDto.prototype, "markType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['standard', 'constructed']),
    __metadata("design:type", String)
], GenerateFromComposedPromptDto.prototype, "typographyStyle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['1024x1024', '1024x1792', '1792x1024']),
    __metadata("design:type", String)
], GenerateFromComposedPromptDto.prototype, "size", void 0);
//# sourceMappingURL=generate-image.dto.js.map