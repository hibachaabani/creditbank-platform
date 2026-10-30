import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Shield, Brain, TrendingUp, Clock, FileCheck, ChevronRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">CréditBank</p>
            <p className="text-slate-400 text-xs">Plateforme intelligente</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Se connecter
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
          >
            Créer un compte
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-300 text-xs font-medium mb-6">
          <Brain size={12} />
          Plateforme propulsée par l'Intelligence Artificielle
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
          Votre crédit, décidé en
          <span className="text-blue-400"> toute transparence</span>
        </h1>
        <p className="text-slate-400 text-lg mt-4 max-w-xl mx-auto leading-relaxed">
          Simulez, soumettez et suivez votre demande de crédit en ligne. Notre IA analyse votre dossier et vous offre une réponse rapide et objective.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
          <Link
            to="/register"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/30"
          >
            Déposer ma demande <ChevronRight size={18} />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/20"
          >
            J'ai déjà un compte
          </Link>
        </div>
      </section>

      {/* Types de crédits */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <p className="text-center text-slate-400 text-sm uppercase tracking-widest mb-8 font-medium">
          Nos produits de crédit
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Immobilier', emoji: '🏠', rate: '8%', desc: 'Achat ou construction' },
            { label: 'Auto',       emoji: '🚗', rate: '10.5%', desc: 'Véhicule neuf ou occasion' },
            { label: 'Consommation', emoji: '💳', rate: '12%', desc: 'Dépense personnelle' },
            { label: 'Professionnel', emoji: '💼', rate: '9.5%', desc: 'Investissement pro' },
            { label: 'Étudiant',  emoji: '🎓', rate: '6%', desc: 'Frais de scolarité' },
          ].map(product => (
            <div key={product.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 transition-colors">
              <div className="text-3xl mb-2">{product.emoji}</div>
              <p className="text-white font-semibold text-sm">{product.label}</p>
              <p className="text-blue-400 font-bold text-lg mt-1">{product.rate}</p>
              <p className="text-slate-500 text-xs mt-0.5">taux indicatif</p>
              <p className="text-slate-400 text-xs mt-2">{product.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <p className="text-center text-slate-400 text-sm uppercase tracking-widest mb-8 font-medium">
          Pourquoi choisir CréditBank ?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: <Brain size={24} className="text-blue-400" />,
              title: 'Scoring IA automatique',
              desc: 'Notre algorithme analyse votre profil financier en quelques secondes et génère un score de risque objectif.',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
            {
              icon: <Clock size={24} className="text-green-400" />,
              title: 'Réponse en 24h',
              desc: 'Grâce à l\'automatisation, votre dossier est traité en quelques heures contre plusieurs semaines en agence.',
              bg: 'bg-green-500/10 border-green-500/20',
            },
            {
              icon: <TrendingUp size={24} className="text-purple-400" />,
              title: 'Simulateur avancé',
              desc: 'Comparez 3 scénarios de remboursement simultanément et visualisez l\'évolution de votre capital.',
              bg: 'bg-purple-500/10 border-purple-500/20',
            },
            {
              icon: <FileCheck size={24} className="text-orange-400" />,
              title: 'Dépôt de documents en ligne',
              desc: 'Uploadez vos justificatifs depuis votre espace sécurisé. Plus besoin de vous déplacer en agence.',
              bg: 'bg-orange-500/10 border-orange-500/20',
            },
            {
              icon: <Shield size={24} className="text-red-400" />,
              title: 'Sécurité bancaire',
              desc: 'Vos données sont protégées par un chiffrement de niveau bancaire. JWT, bcrypt et HTTPS.',
              bg: 'bg-red-500/10 border-red-500/20',
            },
            {
              icon: <Building2 size={24} className="text-teal-400" />,
              title: 'Suivi en temps réel',
              desc: 'Suivez l\'avancement de votre dossier à chaque étape : soumission, analyse, décision.',
              bg: 'bg-teal-500/10 border-teal-500/20',
            },
          ].map(f => (
            <div key={f.title} className={`border rounded-2xl p-5 ${f.bg} hover:scale-[1.01] transition-transform`}>
              <div className="mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="text-center px-6 pb-20">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">Prêt à déposer votre demande ?</h2>
          <p className="text-slate-400 mb-6">Créez votre compte gratuitement et obtenez une simulation en temps réel.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/30"
          >
            Commencer maintenant <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-5 flex items-center justify-between">
        <p className="text-slate-500 text-sm">© 2026 CréditBank — Plateforme intelligente de gestion des crédits</p>
        <p className="text-slate-600 text-xs">Projet Fin d'Études • Architecture Microservices • IA intégrée</p>
      </footer>
    </div>
  );
};
