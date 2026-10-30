import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LandingPage } from './pages/LandingPage';
import { DashboardRouter } from './pages/dashboard/DashboardRouter';
import { DossiersListPage } from './pages/dossier/DossiersListPage';
import { NouveauDossierPage } from './pages/dossier/NouveauDossierPage';
import { DossierDetailPage } from './pages/dossier/DossierDetailPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { UsersPage } from './pages/admin/UsersPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protégé */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="/dossiers" element={<DossiersListPage />} />
        <Route path="/dossiers/nouveau" element={<NouveauDossierPage />} />
        <Route path="/dossiers/:id" element={<DossierDetailPage />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/utilisateurs" element={<UsersPage />} />
        <Route path="/rapports" element={<ReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
