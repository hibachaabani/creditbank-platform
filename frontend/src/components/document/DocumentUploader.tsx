import React, { useState, useRef, useEffect } from 'react';
import { Upload, File, CheckCircle, XCircle, Clock, Trash2, Eye, Download } from 'lucide-react';
import { documentService, type Document, type DocType } from '../../services/documentService';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  CNI: 'Carte Nationale d\'Identité',
  PASSEPORT: 'Passeport',
  BULLETIN_SALAIRE: 'Bulletin de salaire',
  RELEVE_COMPTE: 'Relevé de compte',
  CONTRAT_TRAVAIL: 'Contrat de travail',
  ATTESTATION_EMPLOYEUR: 'Attestation d\'employeur',
  JUSTIFICATIF_DOMICILE: 'Justificatif de domicile',
  COMPROMIS_VENTE: 'Compromis de vente',
  DECLARATION_FISCALE: 'Déclaration fiscale',
  AUTRE: 'Autre document',
};

const statusIcons = {
  PENDING:   <Clock size={14} className="text-yellow-500" />,
  VALIDATED: <CheckCircle size={14} className="text-green-500" />,
  REJECTED:  <XCircle size={14} className="text-red-500" />,
};

const statusColors = {
  PENDING:   'bg-yellow-50 border-yellow-200',
  VALIDATED: 'bg-green-50 border-green-200',
  REJECTED:  'bg-red-50 border-red-200',
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Props {
  requestId: string;
  creditType?: string;
  canValidate?: boolean;
  canUpload?: boolean;
}

export const DocumentUploader: React.FC<Props> = ({ requestId, creditType, canValidate, canUpload = true }) => {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [completeness, setCompleteness] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<DocType>('CNI');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [docsRes, compRes] = await Promise.all([
      documentService.getByRequest(requestId),
      creditType ? documentService.checkCompleteness(requestId, creditType) : Promise.resolve(null),
    ]);
    setDocuments(docsRes.documents);
    setCompleteness(compRes);
  };

  useEffect(() => { load(); }, [requestId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await documentService.upload(requestId, selectedType, file);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleValidate = async (id: string, status: 'VALIDATED' | 'REJECTED') => {
    await documentService.validate(id, status);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    await documentService.remove(id);
    await load();
  };

  return (
    <div className="space-y-4">
      {/* Complétude */}
      {completeness && (
        <div className={`p-4 rounded-xl border ${completeness.isComplete ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {completeness.isComplete
                ? <CheckCircle size={18} className="text-green-600" />
                : <Clock size={18} className="text-orange-600" />}
              <span className="font-medium text-sm">
                {completeness.isComplete ? 'Dossier complet' : `${completeness.uploadedCount}/${completeness.requiredCount} documents fournis`}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {Math.round((completeness.uploadedCount / completeness.requiredCount) * 100)}%
            </div>
          </div>
          {!completeness.isComplete && completeness.missingDocuments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {completeness.missingDocuments.map((doc: DocType) => (
                <span key={doc} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {DOC_TYPE_LABELS[doc]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Zone d'upload — uniquement pour le client */}
      {canUpload && (
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
        <Upload size={32} className="text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700 mb-1">Glissez un fichier ou cliquez pour sélectionner</p>
        <p className="text-xs text-gray-400 mb-4">PDF, JPEG, PNG — Max 10 MB</p>

        <div className="flex items-center justify-center gap-3">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as DocType)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none"
          >
            {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <Button
            size="sm"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} /> Uploader
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleUpload}
          className="hidden"
        />

        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
      )}  {/* fin canUpload */}

      {/* Liste des documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">{documents.length} document{documents.length > 1 ? 's' : ''} uploadé{documents.length > 1 ? 's' : ''}</p>
          {documents.map(doc => (
            <div key={doc.id} className={`flex items-center gap-3 p-3 border rounded-xl ${statusColors[doc.validationStatus]}`}>
              <File size={20} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{DOC_TYPE_LABELS[doc.docType]}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">{formatSize(doc.fileSize)}</span>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1">
                    {statusIcons[doc.validationStatus]}
                    <span className="text-xs capitalize">{doc.validationStatus === 'PENDING' ? 'En attente' : doc.validationStatus === 'VALIDATED' ? 'Validé' : 'Rejeté'}</span>
                  </div>
                </div>
                {doc.validationNote && (
                  <p className="text-xs text-red-600 mt-1">{doc.validationNote}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <a href={documentService.getPreviewUrl(doc.id)} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm"><Eye size={14} /></Button>
                </a>
                <a href={documentService.getDownloadUrl(doc.id)} download>
                  <Button variant="ghost" size="sm"><Download size={14} /></Button>
                </a>
                {canValidate && doc.validationStatus === 'PENDING' && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleValidate(doc.id, 'VALIDATED')}>
                      <CheckCircle size={14} className="text-green-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleValidate(doc.id, 'REJECTED')}>
                      <XCircle size={14} className="text-red-600" />
                    </Button>
                  </>
                )}
                {(doc.uploadedBy === user?.id) && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                    <Trash2 size={14} className="text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
