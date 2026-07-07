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
exports.PrinciplesController = void 0;
const common_1 = require("@nestjs/common");
const principles_service_1 = require("./principles.service");
let PrinciplesController = class PrinciplesController {
    principlesService;
    constructor(principlesService) {
        this.principlesService = principlesService;
    }
    overview() {
        return this.principlesService.findAll();
    }
    search(query, category, industry, era) {
        return this.principlesService.search({ query, category, industry, era });
    }
    graph() {
        return this.principlesService.getGraph();
    }
    references() {
        return this.principlesService.getReferences();
    }
    templates(tags) {
        return this.principlesService.getTemplates(tags);
    }
    byCategory(category) {
        return this.principlesService.findByCategory(category);
    }
    one(id) {
        return this.principlesService.findOne(id);
    }
};
exports.PrinciplesController = PrinciplesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PrinciplesController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('industry')),
    __param(3, (0, common_1.Query)('era')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], PrinciplesController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('graph'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PrinciplesController.prototype, "graph", null);
__decorate([
    (0, common_1.Get)('references'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PrinciplesController.prototype, "references", null);
__decorate([
    (0, common_1.Get)('templates'),
    __param(0, (0, common_1.Query)('tags')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrinciplesController.prototype, "templates", null);
__decorate([
    (0, common_1.Get)('category/:category'),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrinciplesController.prototype, "byCategory", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrinciplesController.prototype, "one", null);
exports.PrinciplesController = PrinciplesController = __decorate([
    (0, common_1.Controller)('principles'),
    __metadata("design:paramtypes", [principles_service_1.PrinciplesService])
], PrinciplesController);
//# sourceMappingURL=principles.controller.js.map