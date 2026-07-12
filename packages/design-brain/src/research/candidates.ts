import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  BrainResearchCandidate,
  BrainResearchCandidateStatus,
} from '@logo-platform/shared';
import { getBrainResearchDir } from '../storage/paths';

const STORE_FILE = 'candidates.json';

function storePath(): string {
  return join(getBrainResearchDir(), STORE_FILE);
}

function ensureStore(): BrainResearchCandidate[] {
  mkdirSync(getBrainResearchDir(), { recursive: true });
  const path = storePath();
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as BrainResearchCandidate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(candidates: BrainResearchCandidate[]): void {
  mkdirSync(getBrainResearchDir(), { recursive: true });
  writeFileSync(storePath(), JSON.stringify(candidates, null, 2), 'utf-8');
}

export function listResearchCandidates(
  status?: BrainResearchCandidateStatus,
): BrainResearchCandidate[] {
  const rows = ensureStore();
  return status ? rows.filter((row) => row.status === status) : rows;
}

export function getResearchCandidate(id: string): BrainResearchCandidate | null {
  return ensureStore().find((row) => row.id === id) ?? null;
}

export function findCandidateByUrl(url: string): BrainResearchCandidate | null {
  const normalized = url.trim().toLowerCase();
  return (
    ensureStore().find((row) => row.sourceUrl.trim().toLowerCase() === normalized) ?? null
  );
}

export function saveResearchCandidate(
  input: Omit<BrainResearchCandidate, 'id' | 'createdAt' | 'status'> & {
    id?: string;
    status?: BrainResearchCandidateStatus;
  },
): BrainResearchCandidate {
  const candidates = ensureStore();
  const candidate: BrainResearchCandidate = {
    id: input.id ?? randomUUID(),
    status: input.status ?? 'pending',
    createdAt: new Date().toISOString(),
    ...input,
  };

  const index = candidates.findIndex((row) => row.id === candidate.id);
  if (index >= 0) {
    candidates[index] = candidate;
  } else {
    candidates.unshift(candidate);
  }

  writeStore(candidates);
  return candidate;
}

export function updateResearchCandidate(
  id: string,
  patch: Partial<BrainResearchCandidate>,
): BrainResearchCandidate {
  const candidates = ensureStore();
  const index = candidates.findIndex((row) => row.id === id);
  if (index < 0) {
    throw new Error(`Research candidate not found: ${id}`);
  }

  const updated = { ...candidates[index]!, ...patch };
  candidates[index] = updated;
  writeStore(candidates);
  return updated;
}
