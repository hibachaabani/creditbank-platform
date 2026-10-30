"""
Entraîne un modèle XGBoost de scoring de crédit.
Lit  : data/training_data.csv
Écrit: model/credit_scorer.pkl   (pipeline complet : préprocessing + XGBoost)
       model/feature_names.json
"""

import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from xgboost import XGBRegressor

# ── Chargement ────────────────────────────────────────────────────────────────
df = pd.read_csv('data/training_data.csv')
print(f"Données chargées : {len(df)} lignes")

# ── Features / Target ────────────────────────────────────────────────────────
NUMERIC_FEATURES = [
    'monthly_income',
    'existing_debts',
    'estimated_monthly',
    'requested_amount',
    'requested_duration',
    'debt_ratio',
    'coverage_ratio',
    'loan_to_income',
    'repayment_capacity',
]
CATEGORICAL_FEATURES = ['credit_type']
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

X = df[ALL_FEATURES]
y = df['score']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

# ── Préprocessing ─────────────────────────────────────────────────────────────
preprocessor = ColumnTransformer(transformers=[
    ('num', StandardScaler(), NUMERIC_FEATURES),
    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), CATEGORICAL_FEATURES),
])

# ── Modèle XGBoost ────────────────────────────────────────────────────────────
xgb = XGBRegressor(
    n_estimators=400,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.85,
    colsample_bytree=0.85,
    reg_alpha=0.1,
    reg_lambda=1.0,
    random_state=42,
    n_jobs=-1,
    verbosity=0,
)

pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', xgb),
])

# ── Entraînement ──────────────────────────────────────────────────────────────
print("Entraînement du modèle XGBoost...")
pipeline.fit(X_train, y_train)

# ── Évaluation ────────────────────────────────────────────────────────────────
y_pred = pipeline.predict(X_test)
y_pred_clipped = np.clip(y_pred, 0, 1000)

mae = mean_absolute_error(y_test, y_pred_clipped)
r2 = r2_score(y_test, y_pred_clipped)
print(f"\n📊 Résultats sur le jeu de test ({len(X_test)} exemples) :")
print(f"   MAE  : {mae:.2f} points")
print(f"   R²   : {r2:.4f}")

# Précision par tranche de ±50 points
within_50 = np.mean(np.abs(y_test.values - y_pred_clipped) <= 50) * 100
within_25 = np.mean(np.abs(y_test.values - y_pred_clipped) <= 25) * 100
print(f"   ±25 pts : {within_25:.1f}%")
print(f"   ±50 pts : {within_50:.1f}%")

# ── Sauvegarde ────────────────────────────────────────────────────────────────
os.makedirs('model', exist_ok=True)
joblib.dump(pipeline, 'model/credit_scorer.pkl')

feature_meta = {
    'numeric_features': NUMERIC_FEATURES,
    'categorical_features': CATEGORICAL_FEATURES,
    'all_features': ALL_FEATURES,
    'target': 'score',
    'score_range': [0, 1000],
    'risk_thresholds': {
        'LOW': 700,
        'MEDIUM': 550,
        'HIGH': 400,
        'VERY_HIGH': 0,
    },
}
with open('model/feature_names.json', 'w') as f:
    json.dump(feature_meta, f, indent=2)

print(f"\n✅ Modèle sauvegardé → model/credit_scorer.pkl")
print(f"✅ Métadonnées    → model/feature_names.json")
