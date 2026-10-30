import api from './api';

export type DocType = 'CNI' | 'PASSEPORT' | 'BULLETIN_SALAIRE' | 'RELEVE_COMPTE' |
  'CONTRAT_TRAVAIL' | 'ATTESTATION_EMPLOYEUR' | 'JUSTIFICATIF_DOMICILE' |
  'COMPROMIS_VENTE' | 'DECLARATION_FISCALE' | 'AUTRE';

export interface Document {
  id: string;
  requestId: string;
  uploadedBy: string;
  docType: DocType;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  validationStatus: 'PENDING' | 'VALIDATED' | 'REJECTED';
  validationNote?: string;
  uploadedAt: string;
  validatedAt?: string;
}

export interface Completeness {
  isComplete: boolean;
  uploadedCount: number;
  requiredCount: number;
  missingDocuments: DocType[];
  uploadedDocuments: DocType[];
}

export const documentService = {
  upload: (requestId: string, docType: DocType, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Document>(`/documents/upload/${requestId}?docType=${docType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  getByRequest: (requestId: string) =>
    api.get<{ documents: Document[]; total: number }>(`/documents/request/${requestId}`).then(r => r.data),

  checkCompleteness: (requestId: string, creditType: string) =>
    api.get<Completeness>(`/documents/request/${requestId}/completeness?creditType=${creditType}`).then(r => r.data),

  validate: (id: string, status: 'VALIDATED' | 'REJECTED', note?: string) =>
    api.patch<Document>(`/documents/${id}/validate`, { status, note }).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/documents/${id}`).then(r => r.data),

  getPreviewUrl: (id: string) => `/api/documents/${id}/preview`,
  getDownloadUrl: (id: string) => `/api/documents/${id}/download`,
};
