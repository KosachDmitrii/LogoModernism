"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogImportService = void 0;
const common_1 = require("@nestjs/common");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const catalog_importer_1 = require("@logo-platform/catalog-importer");
const node_fs_2 = require("node:fs");
let CatalogImportService = class CatalogImportService {
    getStats() {
        return (0, catalog_importer_1.getPipelineStats)();
    }
    getPagesIndex() {
        return (0, catalog_importer_1.loadPagesIndex)();
    }
    listCandidates(status) {
        const all = (0, catalog_importer_1.loadCandidates)();
        if (!status)
            return all;
        return all.filter((c) => c.status === status);
    }
    getCandidate(id) {
        const c = (0, catalog_importer_1.loadCandidates)().find((x) => x.id === id);
        if (!c)
            throw new common_1.NotFoundException('Candidate not found');
        return c;
    }
    updateCandidate(id, patch) {
        const candidates = (0, catalog_importer_1.loadCandidates)();
        const idx = candidates.findIndex((c) => c.id === id);
        if (idx < 0)
            throw new common_1.NotFoundException('Candidate not found');
        candidates[idx] = { ...candidates[idx], ...patch };
        (0, catalog_importer_1.saveCandidates)(candidates);
        return candidates[idx];
    }
    approve(id, patch) {
        const updated = (0, catalog_importer_1.approveCandidate)((0, catalog_importer_1.loadCandidates)(), id, patch);
        (0, catalog_importer_1.saveCandidates)(updated);
        this.syncImportedCatalog();
        return updated.find((c) => c.id === id);
    }
    reject(id, notes) {
        const updated = (0, catalog_importer_1.rejectCandidate)((0, catalog_importer_1.loadCandidates)(), id, notes);
        (0, catalog_importer_1.saveCandidates)(updated);
        this.syncImportedCatalog();
        return updated.find((c) => c.id === id);
    }
    bulkReject(ids, notes) {
        const updated = (0, catalog_importer_1.bulkRejectCandidates)((0, catalog_importer_1.loadCandidates)(), ids, notes);
        (0, catalog_importer_1.saveCandidates)(updated);
        const synced = this.syncImportedCatalog();
        return { rejected: ids.length, ...synced };
    }
    bulkApprove(ids) {
        let candidates = (0, catalog_importer_1.loadCandidates)();
        for (const id of ids) {
            candidates = (0, catalog_importer_1.approveCandidate)(candidates, id);
        }
        (0, catalog_importer_1.saveCandidates)(candidates);
        const synced = this.syncImportedCatalog();
        return { approved: ids.length, ...synced };
    }
    listApproved() {
        return (0, catalog_importer_1.loadApproved)();
    }
    syncImportedCatalog() {
        const entries = (0, catalog_importer_1.importApprovedToCatalog)();
        const out = (0, node_path_1.join)(catalog_importer_1.PIPELINE_DIR, 'imported-catalog.json');
        (0, node_fs_2.writeFileSync)(out, JSON.stringify(entries, null, 2));
        return { count: entries.length, path: out };
    }
    getPageImagePath(filename) {
        const safe = filename.replace(/[^a-zA-Z0-9._/-]/g, '');
        const full = (0, node_path_1.join)(catalog_importer_1.PIPELINE_DIR, safe);
        return (0, node_fs_1.existsSync)(full) ? full : null;
    }
    createPageImageStream(filename) {
        const path = this.getPageImagePath(filename);
        if (!path)
            throw new common_1.NotFoundException('Page image not found');
        return (0, node_fs_1.createReadStream)(path);
    }
};
exports.CatalogImportService = CatalogImportService;
exports.CatalogImportService = CatalogImportService = __decorate([
    (0, common_1.Injectable)()
], CatalogImportService);
//# sourceMappingURL=catalog-import.service.js.map