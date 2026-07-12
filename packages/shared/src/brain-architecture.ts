import type { ClientVisualIntent } from './client-visual-intent';
import type { DesignStrategy } from './design-strategy';
import type { BriefInterviewQuestion } from './brain-types';

export interface AgentContribution {
  role: 'strategist' | 'symbol' | 'typography' | 'art-director';
  summary: string;
  fragments: string[];
}

export interface BrainArchitecture {
  clientIntent: ClientVisualIntent;
  designStrategy: DesignStrategy;
  agentContributions: AgentContribution[];
  interviewQuestions: BriefInterviewQuestion[];
  visualReferences: Array<{
    id: string;
    title?: string | null;
    summary?: string | null;
    similarity?: number;
    imageUrl?: string;
  }>;
  projectMemorySummary?: string;
}
