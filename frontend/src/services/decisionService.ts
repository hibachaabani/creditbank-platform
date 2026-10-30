import api from './api';

export interface Decision {
  id: string;
  requestId: string;
  decidedBy: string;
  decisionType: 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
  approvedAmount?: number;
  approvedDuration?: number;
  interestRate?: number;
  monthlyPayment?: number;
  conditions?: string[];
  refusalReason?: string;
  refusalDetails?: string;
  signedAt?: string;
  createdAt: string;
}

export const decisionService = {
  create: (data: Record<string, unknown>) =>
    api.post<Decision>('/decisions', data).then(r => r.data),

  getByRequest: (requestId: string) =>
    api.get<Decision>(`/decisions/${requestId}`).then(r => r.data),

  getPending: () =>
    api.get<any[]>('/decisions/pending').then(r => r.data),

  getStats: () =>
    api.get('/decisions/stats').then(r => r.data),
};
