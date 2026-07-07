import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import type { CatalogCandidate } from '@logo-platform/shared';
import {
  loadCandidates,
  saveCandidates,
  loadApproved,
  saveApproved,
  getPipelineStats,
  loadPagesIndex,
  PIPELINE_DIR,
  approveCandidate,
  rejectCandidate,
  bulkRejectCandidates,
  importApprovedToCatalog,
} from '@logo-platform/catalog-importer';
import { writeFileSync } from 'node:fs';

@Injectable()
export class CatalogImportService {
  getStats() {
    return getPipelineStats();
  }

  getPagesIndex() {
    return loadPagesIndex();
  }

  listCandidates(status?: string) {
    const all = loadCandidates();
    if (!status) return all;
    return all.filter((c) => c.status === status);
  }

  getCandidate(id: string) {
    const c = loadCandidates().find((x) => x.id === id);
    if (!c) throw new NotFoundException('Candidate not found');
    return c;
  }

  updateCandidate(id: string, patch: Partial<CatalogCandidate>) {
    const candidates = loadCandidates();
    const idx = candidates.findIndex((c) => c.id === id);
    if (idx < 0) throw new NotFoundException('Candidate not found');
    candidates[idx] = { ...candidates[idx], ...patch };
    saveCandidates(candidates);
    return candidates[idx];
  }

  approve(id: string, patch?: Partial<CatalogCandidate>) {
    const updated = approveCandidate(loadCandidates(), id, patch);
    saveCandidates(updated);
    this.syncImportedCatalog();
    return updated.find((c) => c.id === id);
  }

  reject(id: string, notes?: string) {
    const updated = rejectCandidate(loadCandidates(), id, notes);
    saveCandidates(updated);
    this.syncImportedCatalog();
    return updated.find((c) => c.id === id);
  }

  bulkReject(ids: string[], notes?: string) {
    const updated = bulkRejectCandidates(loadCandidates(), ids, notes);
    saveCandidates(updated);
    const synced = this.syncImportedCatalog();
    return { rejected: ids.length, ...synced };
  }

  bulkApprove(ids: string[]) {
    let candidates = loadCandidates();
    for (const id of ids) {
      candidates = approveCandidate(candidates, id);
    }
    saveCandidates(candidates);
    const synced = this.syncImportedCatalog();
    return { approved: ids.length, ...synced };
  }

  listApproved() {
    return loadApproved();
  }

  syncImportedCatalog() {
    const entries = importApprovedToCatalog();
    const out = join(PIPELINE_DIR, 'imported-catalog.json');
    writeFileSync(out, JSON.stringify(entries, null, 2));
    return { count: entries.length, path: out };
  }

  getPageImagePath(filename: string): string | null {
    const safe = filename.replace(/[^a-zA-Z0-9._/-]/g, '');
    const full = join(PIPELINE_DIR, safe);
    return existsSync(full) ? full : null;
  }

  createPageImageStream(filename: string) {
    const path = this.getPageImagePath(filename);
    if (!path) throw new NotFoundException('Page image not found');
    return createReadStream(path);
  }
}
