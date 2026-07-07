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
exports.CatalogImportController = void 0;
const common_1 = require("@nestjs/common");
const catalog_import_service_1 = require("./catalog-import.service");
let CatalogImportController = class CatalogImportController {
    service;
    constructor(service) {
        this.service = service;
    }
    stats() {
        return this.service.getStats();
    }
    pagesIndex() {
        return this.service.getPagesIndex();
    }
    candidates(status) {
        return this.service.listCandidates(status);
    }
    one(id) {
        return this.service.getCandidate(id);
    }
    update(id, patch) {
        return this.service.updateCandidate(id, patch);
    }
    approve(id, patch) {
        return this.service.approve(id, patch);
    }
    reject(id, body) {
        return this.service.reject(id, body?.notes);
    }
    bulkApprove(body) {
        return this.service.bulkApprove(body.ids ?? []);
    }
    bulkReject(body) {
        return this.service.bulkReject(body.ids ?? [], body.notes);
    }
    approved() {
        return this.service.listApproved();
    }
    syncCatalog() {
        return this.service.syncImportedCatalog();
    }
    servePage(filename, res) {
        const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
        const stream = this.service.createPageImageStream(`pages/${safe}`);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.type('image/png');
        return new common_1.StreamableFile(stream);
    }
};
exports.CatalogImportController = CatalogImportController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)('pages-index'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "pagesIndex", null);
__decorate([
    (0, common_1.Get)('candidates'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "candidates", null);
__decorate([
    (0, common_1.Get)('candidates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "one", null);
__decorate([
    (0, common_1.Patch)('candidates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('candidates/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)('candidates/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)('bulk-approve'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "bulkApprove", null);
__decorate([
    (0, common_1.Post)('bulk-reject'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "bulkReject", null);
__decorate([
    (0, common_1.Get)('approved'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "approved", null);
__decorate([
    (0, common_1.Post)('sync-catalog'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "syncCatalog", null);
__decorate([
    (0, common_1.Get)('page-image/:filename'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CatalogImportController.prototype, "servePage", null);
exports.CatalogImportController = CatalogImportController = __decorate([
    (0, common_1.Controller)('catalog-import'),
    __metadata("design:paramtypes", [catalog_import_service_1.CatalogImportService])
], CatalogImportController);
//# sourceMappingURL=catalog-import.controller.js.map