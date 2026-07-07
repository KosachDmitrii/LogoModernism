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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImagesController = void 0;
const common_1 = require("@nestjs/common");
const images_service_1 = require("./images.service");
const generate_image_dto_1 = require("./dto/generate-image.dto");
const image_storage_1 = require("./image-storage");
let ImagesController = class ImagesController {
    imagesService;
    constructor(imagesService) {
        this.imagesService = imagesService;
    }
    getProviders() {
        return { providers: this.imagesService.getProviders() };
    }
    serveFile(filename, res) {
        const filePath = (0, image_storage_1.resolveGeneratedFile)(filename);
        if (!filePath) {
            throw new common_1.NotFoundException('Image not found');
        }
        res.setHeader('Cache-Control', 'public, max-age=86400');
        if (filename.endsWith('.svg') || filename.endsWith('.svg+xml')) {
            res.type('image/svg+xml');
        }
        return res.sendFile(filePath);
    }
    async generate(dto) {
        return this.imagesService.generate(dto);
    }
    async generateFromPrompt(dto) {
        return this.imagesService.generateFromComposedPrompt(dto);
    }
};
exports.ImagesController = ImagesController;
__decorate([
    (0, common_1.Get)('providers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ImagesController.prototype, "getProviders", null);
__decorate([
    (0, common_1.Get)('files/:filename'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ImagesController.prototype, "serveFile", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_image_dto_1.GenerateImageDto]),
    __metadata("design:returntype", Promise)
], ImagesController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)('generate-from-prompt'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_image_dto_1.GenerateFromComposedPromptDto]),
    __metadata("design:returntype", Promise)
], ImagesController.prototype, "generateFromPrompt", null);
exports.ImagesController = ImagesController = __decorate([
    (0, common_1.Controller)('images'),
    __metadata("design:paramtypes", [images_service_1.ImagesService])
], ImagesController);
//# sourceMappingURL=images.controller.js.map