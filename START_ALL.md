# 🚀 Comment démarrer toute la plateforme

## Option A — Tout en une commande (recommandé)

```bash
npm start
```

Lance tous les services en parallèle avec des couleurs par service.

---

## Option B — Terminaux séparés

### Terminal 1 — Auth Service (port 3001)
```bash
cd backend/auth-service
npm run start:dev
```

### Terminal 2 — Dossier Service (port 3003)
```bash
cd backend/dossier-service
npm run start:dev
```

### Terminal 3 — Document Service (port 3004)
```bash
cd backend/document-service
npm run start:dev
```

### Terminal 4 — Analysis Service (port 3005)
```bash
cd backend/analysis-service
npm run start:dev
```

### Terminal 5 — Decision Service (port 3006)
```bash
cd backend/decision-service
npm run start:dev
```

### Terminal 6 — Frontend React (port 5174)
```bash
cd frontend
npm run dev
```

### Terminal 7 — AI Scoring Service (port 8000)
```bash
cd ai-service
./start.sh
```
> Le modèle XGBoost est entraîné automatiquement au premier démarrage (~30s).  
> Les démarrages suivants sont instantanés (modèle déjà présent).

---

## ✅ Vérification

| Service | URL | Swagger / Docs |
|---------|-----|----------------|
| Auth | http://localhost:3001/api | http://localhost:3001/api/docs |
| Dossier | http://localhost:3003/api | http://localhost:3003/api/docs |
| Document | http://localhost:3004/api | http://localhost:3004/api/docs |
| Analysis | http://localhost:3005/api | http://localhost:3005/api/docs |
| Decision | http://localhost:3006/api | http://localhost:3006/api/docs |
| Frontend | http://localhost:5174 | — |
| **AI Scoring ML** | **http://localhost:8000** | **http://localhost:8000/docs** |

> ⚠️ Si le service AI est down, l'analysis-service bascule automatiquement sur le moteur de règles local — aucune interruption.

---

## 👥 Comptes de test
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| client@example.com | password123 | CLIENT |
| agent@bank.ma | password123 | AGENT |
| analyst@bank.ma | password123 | ANALYST |
| decider@bank.ma | password123 | DECIDER |
| admin@bank.ma | password123 | ADMIN |
