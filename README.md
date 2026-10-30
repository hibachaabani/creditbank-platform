# 🏦 CréditBank — Plateforme intelligente de gestion des crédits bancaires

Plateforme web qui dématérialise tout le traitement d'une demande de crédit, du dépôt en ligne par le client jusqu'à la décision finale, avec un **scoring de risque par machine learning** et un **assistant conversationnel basé sur un LLM**.

## ✨ Fonctionnalités

- **Parcours complet d'une demande de crédit** : dépôt en ligne, pièces justificatives, suivi du dossier par statut et traçabilité de chaque changement
- **5 espaces métier** : client, agent, analyste, décideur et administrateur, avec contrôle des droits côté serveur
- **Scoring du risque de 0 à 1000** par un modèle **XGBoost**, relayé automatiquement par un **moteur de règles** si le service IA est indisponible
- **CréditBot** : assistant virtuel (LLM) qui répond aux questions des clients
- **Sécurité** : authentification JWT (access + refresh token), contrôle d'accès par rôle

## 🧱 Architecture

Architecture **microservices** : chaque domaine métier est un service indépendant.

| Service | Rôle | Port |
|---|---|---|
| `auth-service` | Authentification JWT, utilisateurs et rôles | 3001 |
| `dossier-service` | Demandes de crédit et cycle de vie des dossiers | 3003 |
| `document-service` | Dépôt et gestion des pièces justificatives | 3004 |
| `analysis-service` | Analyse du dossier, appel au scoring IA, moteur de règles de secours, CréditBot | 3005 |
| `decision-service` | Décision finale et historique | 3006 |
| `ai-service` | Modèle XGBoost de scoring (FastAPI) | 8000 |
| `frontend` | Interface React | 5174 |

## 🛠️ Stack technique

- **Back-end** : NestJS, TypeScript, Prisma, PostgreSQL, Swagger
- **Front-end** : React, TypeScript, Vite, Tailwind CSS
- **IA** : Python, FastAPI, XGBoost, scikit-learn, LLM via l'API Groq
- **Outils** : Docker, Git

## 🚀 Démarrage

### Prérequis
Node.js 18+, Python 3.9+, PostgreSQL

### 1. Configuration
Dans chaque service (`backend/*-service` et `ai-service`), copier le fichier d'exemple puis le compléter :
```bash
cp .env.example .env
```

### 2. Installation et base de données
```bash
cd backend/auth-service
npm install
npm run prisma:migrate
npm run prisma:seed
```
Répéter `npm install` dans chaque service et dans `frontend`.

### 3. Lancer toute la plateforme
Depuis la racine :
```bash
npm install
npm start
```
Le modèle XGBoost est entraîné automatiquement au premier démarrage du service IA (environ 30 secondes), sur un jeu de données **synthétique** généré par `ai-service/generate_training_data.py`.

| Service | URL |
|---|---|
| Frontend | http://localhost:5174 |
| API Auth (Swagger) | http://localhost:3001/api/docs |
| Service IA (docs) | http://localhost:8000/docs |

### Comptes de démonstration (créés par le seed)
| Rôle | Email | Mot de passe |
|---|---|---|
| Client | client@example.com | password123 |
| Agent | agent@bank.ma | password123 |
| Analyste | analyst@bank.ma | password123 |
| Décideur | decider@bank.ma | password123 |
| Admin | admin@bank.ma | password123 |

> Comptes fictifs, uniquement pour un environnement local.

## 👩‍💻 Auteure

**Hiba Chaabani** — Élève ingénieure en informatique (ESPRIT)
[LinkedIn](https://www.linkedin.com/in/hiba-chaabani-2b40bb440)
