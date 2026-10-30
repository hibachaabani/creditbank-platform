import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
    <p className="text-8xl font-bold text-gray-200">404</p>
    <h1 className="text-2xl font-bold text-gray-900 mt-4">Page introuvable</h1>
    <p className="text-gray-500 mt-2">Cette page n'existe pas ou a été déplacée.</p>
    <Link to="/dashboard" className="mt-6"><Button>Retour au tableau de bord</Button></Link>
  </div>
);
