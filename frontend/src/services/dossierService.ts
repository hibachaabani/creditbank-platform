import api from './api';
import type { CreditRequest, SimulationResult, PaginatedResponse, StatusHistory, DossierMessage } from '../types';

export const dossierService = {
  simulate: (amount: number, duration: number, rate?: number, creditType?: string) =>
    api.get<SimulationResult>(`/dossiers/simulate?amount=${amount}&duration=${duration}${rate ? `&rate=${rate}` : ''}${creditType ? `&creditType=${creditType}` : ''}`).then(r => r.data),

  create: (data: Record<string, unknown>) =>
    api.post<CreditRequest>('/dossiers', data).then(r => r.data),

  getAll: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<CreditRequest>>('/dossiers', { params }).then(r => r.data),

  getOne: (id: string) =>
    api.get<CreditRequest>(`/dossiers/${id}`).then(r => r.data),

  submit: (id: string) =>
    api.patch<CreditRequest>(`/dossiers/${id}/submit`).then(r => r.data),

  updateStatus: (id: string, status: string, comment?: string) =>
    api.patch<CreditRequest>(`/dossiers/${id}/status`, { status, comment }).then(r => r.data),

  assign: (id: string, analystId: string) =>
    api.patch(`/dossiers/${id}/assign`, { analystId }).then(r => r.data),

  getHistory: (id: string) =>
    api.get<StatusHistory[]>(`/dossiers/${id}/history`).then(r => r.data),

  getMessages: (id: string) =>
    api.get<DossierMessage[]>(`/dossiers/${id}/messages`).then(r => r.data),

  sendMessage: (id: string, content: string) =>
    api.post<DossierMessage>(`/dossiers/${id}/messages`, { content }).then(r => r.data),

  getStats: () =>
    api.get('/dossiers/stats').then(r => r.data),
};
