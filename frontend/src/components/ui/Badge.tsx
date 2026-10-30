import React from 'react';
import type { RequestStatus } from '../../types';

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:                  { label: 'Brouillon',       className: 'bg-gray-100 text-gray-600' },
  SUBMITTED:              { label: 'Soumis',           className: 'bg-blue-100 text-blue-700' },
  UNDER_REVIEW:           { label: 'En révision',      className: 'bg-yellow-100 text-yellow-700' },
  IN_ANALYSIS:            { label: 'En analyse',       className: 'bg-orange-100 text-orange-700' },
  PENDING_DECISION:       { label: 'En attente',       className: 'bg-purple-100 text-purple-700' },
  APPROVED:               { label: 'Approuvé',         className: 'bg-green-100 text-green-700' },
  CONDITIONALLY_APPROVED: { label: 'Cond. approuvé',  className: 'bg-teal-100 text-teal-700' },
  REJECTED:               { label: 'Refusé',           className: 'bg-red-100 text-red-700' },
  ACCEPTED_BY_CLIENT:     { label: 'Accepté',          className: 'bg-green-100 text-green-800' },
  REFUSED_BY_CLIENT:      { label: 'Refusé client',   className: 'bg-red-100 text-red-700' },
  ACTIVE:                 { label: 'Actif',            className: 'bg-green-100 text-green-700' },
  CLOSED:                 { label: 'Clôturé',          className: 'bg-gray-100 text-gray-600' },
  DEFAULTED:              { label: 'En défaut',        className: 'bg-red-200 text-red-800' },
};

const creditTypeLabels: Record<string, string> = {
  IMMOBILIER: 'Immobilier', AUTO: 'Auto', CONSOMMATION: 'Consommation',
  PROFESSIONNEL: 'Professionnel', ETUDIANT: 'Étudiant',
};

export const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

export const CreditTypeBadge: React.FC<{ type: string }> = ({ type }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
    {creditTypeLabels[type] ?? type}
  </span>
);
