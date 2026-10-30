#!/usr/bin/env bash
# Démarre le service ML de scoring de crédit
# Détecte automatiquement si le modèle doit être entraîné.

set -e
cd "$(dirname "$0")"

# ── Environnement virtuel ──────────────────────────────────────────────────
if [ ! -d ".venv" ]; then
  echo "[AI] Création de l'environnement virtuel Python..."
  python3 -m venv .venv
fi

source .venv/bin/activate

# ── Dépendances ────────────────────────────────────────────────────────────
echo "[AI] Vérification des dépendances..."
pip install -q -r requirements.txt

# ── Entraînement automatique si le modèle est absent ──────────────────────
if [ ! -f "model/credit_scorer.pkl" ]; then
  echo "[AI] Modèle absent — génération des données d'entraînement..."
  python generate_training_data.py

  echo "[AI] Entraînement du modèle XGBoost..."
  python train_model.py
else
  echo "[AI] Modèle existant détecté — skip entraînement."
fi

# ── Démarrage du service ────────────────────────────────────────────────────
echo "[AI] Démarrage du service ML sur http://localhost:8000"
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
