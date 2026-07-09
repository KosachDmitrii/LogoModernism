import type { BrainExperienceRecord } from '@logo-platform/shared';

export interface VisualReference {
  id: string;
  title?: string | null;
  summary?: string | null;
  similarity?: number;
  imageUrl?: string;
}

export function selectVisualReferences(
  experiences: BrainExperienceRecord[],
  limit = 4,
): VisualReference[] {
  return experiences
    .filter((exp) => exp.sourceType === 'IMAGE' || exp.filePath?.match(/\.(png|jpg|jpeg|webp|svg)$/i))
    .slice(0, limit)
    .map((exp) => ({
      id: exp.id,
      title: exp.title,
      summary: exp.summary,
      similarity: exp.similarity,
      imageUrl: exp.filePath ? `/api/brain/experiences/${exp.id}/file` : undefined,
    }));
}
