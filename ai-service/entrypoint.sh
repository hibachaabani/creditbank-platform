#!/bin/sh
set -e

if [ ! -f "model/credit_scorer.pkl" ]; then
  echo "[AI] Modèle absent — entraînement en cours..."
  python generate_training_data.py
  python train_model.py
else
  echo "[AI] Modèle déjà présent — skip entraînement."
fi

echo "[AI] Démarrage FastAPI sur :8000"
exec uvicorn main:app --host 0.0.0.0 --port 8000
