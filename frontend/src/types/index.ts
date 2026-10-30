export type Role = 'CLIENT' | 'AGENT' | 'ANALYST' | 'DECIDER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: { id: string; name: Role };
  agency?: { id: string; name: string; city: string } | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type CreditType = 'IMMOBILIER' | 'AUTO' | 'CONSOMMATION' | 'PROFESSIONNEL' | 'ETUDIANT';

export type RequestStatus =
  | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_ANALYSIS'
  | 'PENDING_DECISION' | 'APPROVED' | 'CONDITIONALLY_APPROVED'
  | 'REJECTED' | 'ACCEPTED_BY_CLIENT' | 'REFUSED_BY_CLIENT'
  | 'ACTIVE' | 'CLOSED' | 'DEFAULTED';

export interface CreditRequest {
  id: string;
  reference: string;
  clientId: string;
  agentId?: string;
  creditType: CreditType;
  requestedAmount: number;
  requestedDuration: number;
  monthlyIncome: number;
  existingDebts: number;
  purpose?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface SimulationResult {
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
  annualRate: number;
  duration: number;
  amount: number;
}

export interface StatusHistory {
  id: string;
  oldStatus?: string;
  newStatus: string;
  changedBy: string;
  comment?: string;
  changedAt: string;
}

export interface DossierMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
