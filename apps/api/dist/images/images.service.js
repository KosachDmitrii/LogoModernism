"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImagesService = void 0;
const common_1 = require("@nestjs/common");
const image_generator_1 = require("@logo-platform/image-generator");
const image_storage_1 = require("./image-storage");
let ImagesService = class ImagesService {
    getProviders() {
        return (0, image_generator_1.getAvailableProviders)();
    }
    async generate(dto) {
        const result = await (0, image_generator_1.generateImages)({
            prompt: dto.prompt,
            companyName: dto.companyName,
            provider: dto.provider,
            size: dto.size,
            count: dto.count ?? 1,
        });
        return this.toPersistedResult(result);
    }
    async generateFromComposedPrompt(dto) {
        const result = await (0, image_generator_1.generateImages)({
            prompt: dto.text,
            companyName: dto.companyName,
            provider: dto.provider,
            size: dto.size,
            count: 1,
        });
        return this.toPersistedResult(result);
    }
    async generateFromPromptObject(prompt, provider) {
        const result = await (0, image_generator_1.generateImages)({
            prompt: prompt.text,
            companyName: prompt.industry,
            provider,
            count: 1,
        });
        return this.toPersistedResult(result);
    }
    toPersistedResult(result) {
        return {
            ...result,
            images: result.images.map((image) => ({
                ...image,
                url: (0, image_storage_1.persistImageUrl)(image.url, image.id),
            })),
        };
    }
};
exports.ImagesService = ImagesService;
exports.ImagesService = ImagesService = __decorate([
    (0, common_1.Injectable)()
], ImagesService);
//# sourceMappingURL=images.service.js.map