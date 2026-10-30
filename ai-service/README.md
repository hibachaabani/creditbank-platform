# AI Service — Scoring de crédit ML

Service Python FastAPI qui expose un modèle XGBoost de scoring de crédit.  
Remplace le scoring par règles codées en dur dans `analysis-service`.

## Architecture

```
analysis-service (NestJS :3005)
        │
        │  POST /predict  (timeout 5s)
        ▼
  ai-service (FastAPI :8000)
        │
        ▼
  XGBoost Pipeline
  (StandardScaler + OneHotEncoder + XGBRegressor)
        │
        ▼
  Score 0–1000  +  facteurs explicatifs
```

Si le service ML est down → fallback automatique sur les règles locales (aucune interruption).

## Démarrage rapide

```bash
cd ai-service

# 1ère fois : créer venv + installer deps + entraîner + démarrer
./start.sh --train

# Fois suivantes (modèle déjà entraîné)
./start.sh
```

## Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | Statut du service + modèle chargé |
| POST | `/predict` | Score pour un dossier |
| POST | `/predict/batch` | Score pour plusieurs dossiers |
| GET | `/docs` | Swagger UI interactif |

## Exemple de requête

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_income": 15000,
    "existing_debts": 1000,
    "estimated_monthly": 2500,
    "requested_amount": 300000,
    "requested_duration": 120,
    "credit_type": "IMMOBILIER"
  }'
```

## Réponse

```json
{
  "score": 712,
  "risk_level": "LOW",
  "recommendation": "FAVORABLE",
  "debt_ratio": 23.33,
  "repayment_capacity": 11500.0,
  "net_income_after": 11500.0,
  "factors": [...],
  "model_used": "ML",
  "inference_ms": 3.2
}
```

## Re-entraîner le modèle

```bash
source .venv/bin/activate
python generate_training_data.py   # → data/training_data.csv (12 000 lignes)
python train_model.py              # → model/credit_scorer.pkl
```

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `8000` | Port du service |
| `HOST` | `0.0.0.0` | Interface d'écoute |
| `MODEL_PATH` | `model/credit_scorer.pkl` | Chemin du modèle |
