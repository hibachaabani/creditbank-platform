import api from './api';

export interface ScoringFactor {
  name: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  weight: number;
  description: string;
}

export interface ScoringResult {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  debtRatio: number;
  repaymentCapacity: number;
  netIncomeAfter: number;
  factors: ScoringFactor[];
  recommendation: 'FAVORABLE' | 'UNFAVORABLE' | 'CONDITIONAL';
}

export interface Analysis {
  id: string;
  requestId: string;
  analystId?: string;
  debtRatio?: number;
  repaymentCapacity?: number;
  netIncomeAfter?: number;
  creditScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  fraudAlert: boolean;
  recommendation?: 'FAVORABLE' | 'UNFAVORABLE' | 'CONDITIONAL';
  recommendationNotes?: string;
  narrativeReport?: string;
  aiExplanation?: { factors: ScoringFactor[] };
  submittedAt?: string;
  createdAt: string;
  scoring?: ScoringResult;
}

export const analysisService = {
  getScore: (requestId: string) =>
    api.get<ScoringResult>(`/analyses/score/${requestId}`).then(r => r.data),

  create: (requestId: string) =>
    api.post<Analysis>('/analyses', { requestId }).then(r => r.data),

  getByRequest: (requestId: string) =>
    api.get<Analysis>(`/analyses/${requestId}`).then(r => r.data),

  update: (requestId: string, data: Partial<Analysis>) =>
    api.patch<Analysis>(`/analyses/${requestId}`, data).then(r => r.data),

  submit: (requestId: string) =>
    api.post<Analysis>(`/analyses/${requestId}/submit`).then(r => r.data),
};
