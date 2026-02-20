export interface OpportunityJob {
  id: string;
  title: string;
  summary: string;
  skills: string[];
  budget?: string | null;
  zkVerified?: boolean;
  createdAt?: string;
}

export interface ReputationEntry {
  id: string;
  alias: string;
  address: string;
  score: number;
  proofCount: number;
  role: 'seeker' | 'giver';
}
