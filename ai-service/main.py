"""
AI Service — Scoring de crédit ML
FastAPI + XGBoost
Port : 8000
"""

from __future__ import annotations

import json
import os
import time
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Constantes ────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model', 'credit_scorer.pkl')
META_PATH  = os.path.join(os.path.dirname(__file__), 'model', 'feature_names.json')

CREDIT_TYPE_RATES: dict[str, float] = {
    'IMMOBILIER': 8.0,
    'AUTO': 10.5,
    'CONSOMMATION': 12.0,
    'PROFESSIONNEL': 9.5,
    'ETUDIANT': 6.0,
}

# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title='Credit Scoring ML Service',
    description='Service de scoring de crédit basé sur XGBoost',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── Chargement du modèle au démarrage ────────────────────────────────────────
pipeline = None
feature_meta: dict = {}

@app.on_event('startup')
def load_model() -> None:
    global pipeline, feature_meta
    if os.path.exists(MODEL_PATH):
        pipeline = joblib.load(MODEL_PATH)
        with open(META_PATH) as f:
            feature_meta = json.load(f)
        print(f'✅ Modèle chargé : {MODEL_PATH}')
    else:
        print('⚠️  Modèle introuvable — lancez train_model.py d\'abord')


# ── Schémas Pydantic ──────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    monthly_income: float = Field(..., gt=0, description='Revenus mensuels nets (MAD)')
    existing_debts: float = Field(0.0, ge=0, description='Charges mensuelles existantes (MAD)')
    estimated_monthly: float = Field(..., gt=0, description='Mensualité estimée du nouveau crédit (MAD)')
    requested_amount: float = Field(..., gt=0, description='Montant demandé (MAD)')
    requested_duration: int = Field(..., gt=0, description='Durée en mois')
    credit_type: Literal['IMMOBILIER', 'AUTO', 'CONSOMMATION', 'PROFESSIONNEL', 'ETUDIANT']


class FactorDetail(BaseModel):
    name: str
    impact: Literal['POSITIVE', 'NEGATIVE', 'NEUTRAL']
    weight: float
    description: str


class PredictResponse(BaseModel):
    score: int
    risk_level: Literal['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']
    recommendation: Literal['FAVORABLE', 'CONDITIONAL', 'UNFAVORABLE']
    debt_ratio: float
    repayment_capacity: float
    net_income_after: float
    factors: list[FactorDetail]
    model_used: Literal['ML', 'RULES']
    inference_ms: float


# ── Helpers ───────────────────────────────────────────────────────────────────

def derive_features(req: PredictRequest) -> pd.DataFrame:
    total_monthly = req.existing_debts + req.estimated_monthly
    debt_ratio = (total_monthly / req.monthly_income * 100) if req.monthly_income > 0 else 100.0
    coverage_ratio = req.monthly_income / req.estimated_monthly if req.estimated_monthly > 0 else 0.0
    loan_to_income = req.requested_amount / (req.monthly_income * 12) if req.monthly_income > 0 else 99.0
    repayment_capacity = req.monthly_income - total_monthly

    return pd.DataFrame([{
        'monthly_income': req.monthly_income,
        'existing_debts': req.existing_debts,
        'estimated_monthly': req.estimated_monthly,
        'requested_amount': req.requested_amount,
        'requested_duration': req.requested_duration,
        'debt_ratio': round(debt_ratio, 4),
        'coverage_ratio': round(coverage_ratio, 4),
        'loan_to_income': round(loan_to_income, 4),
        'repayment_capacity': round(repayment_capacity, 4),
        'credit_type': req.credit_type,
    }])


def score_to_risk(score: int, debt_ratio: float) -> tuple[str, str]:
    if score >= 700:
        risk, rec = 'LOW', 'FAVORABLE'
    elif score >= 550:
        risk, rec = 'MEDIUM', 'CONDITIONAL'
    elif score >= 400:
        risk, rec = 'HIGH', 'CONDITIONAL'
    else:
        risk, rec = 'VERY_HIGH', 'UNFAVORABLE'

    if debt_ratio > 50:
        rec = 'UNFAVORABLE'

    return risk, rec


def build_factors(req: PredictRequest, score: int, debt_ratio: float) -> list[FactorDetail]:
    """Génère les facteurs explicatifs à partir des features."""
    factors: list[FactorDetail] = []

    # Taux d'endettement
    if debt_ratio <= 20:
        factors.append(FactorDetail(name="Taux d'endettement", impact='POSITIVE', weight=200,
                                    description=f"Excellent : {debt_ratio:.1f}% (≤ 20%)"))
    elif debt_ratio <= 33:
        factors.append(FactorDetail(name="Taux d'endettement", impact='POSITIVE', weight=100,
                                    description=f"Bon : {debt_ratio:.1f}% (≤ 33%)"))
    elif debt_ratio <= 40:
        factors.append(FactorDetail(name="Taux d'endettement", impact='NEUTRAL', weight=0,
                                    description=f"Acceptable : {debt_ratio:.1f}% (≤ 40%)"))
    elif debt_ratio <= 50:
        factors.append(FactorDetail(name="Taux d'endettement", impact='NEGATIVE', weight=-150,
                                    description=f"Élevé : {debt_ratio:.1f}% (> 40%)"))
    else:
        factors.append(FactorDetail(name="Taux d'endettement", impact='NEGATIVE', weight=-300,
                                    description=f"Très élevé : {debt_ratio:.1f}% (> 50%)"))

    # Capacité de remboursement
    coverage = req.monthly_income / req.estimated_monthly if req.estimated_monthly > 0 else 0
    if coverage >= 5:
        factors.append(FactorDetail(name="Capacité de remboursement", impact='POSITIVE', weight=100,
                                    description=f"Très forte capacité (revenus x{coverage:.1f} la mensualité)"))
    elif coverage >= 3:
        factors.append(FactorDetail(name="Capacité de remboursement", impact='POSITIVE', weight=50,
                                    description=f"Bonne capacité (revenus x{coverage:.1f} la mensualité)"))
    elif coverage < 2:
        factors.append(FactorDetail(name="Capacité de remboursement", impact='NEGATIVE', weight=-100,
                                    description=f"Capacité limitée (revenus x{coverage:.1f} la mensualité)"))

    # Durée
    if req.requested_duration <= 60:
        factors.append(FactorDetail(name="Durée du crédit", impact='POSITIVE', weight=80,
                                    description=f"Courte durée : {req.requested_duration} mois"))
    elif req.requested_duration <= 120:
        factors.append(FactorDetail(name="Durée du crédit", impact='POSITIVE', weight=40,
                                    description=f"Durée modérée : {req.requested_duration} mois"))
    elif req.requested_duration > 240:
        factors.append(FactorDetail(name="Durée du crédit", impact='NEGATIVE', weight=-60,
                                    description=f"Longue durée : {req.requested_duration} mois"))

    # Ratio montant/revenus
    lti = req.requested_amount / (req.monthly_income * 12) if req.monthly_income > 0 else 99
    if lti <= 2:
        factors.append(FactorDetail(name="Montant vs revenus", impact='POSITIVE', weight=80,
                                    description=f"Montant raisonnable ({lti:.1f}x revenus annuels)"))
    elif lti <= 4:
        factors.append(FactorDetail(name="Montant vs revenus", impact='POSITIVE', weight=20,
                                    description=f"Montant acceptable ({lti:.1f}x revenus annuels)"))
    elif lti > 6:
        factors.append(FactorDetail(name="Montant vs revenus", impact='NEGATIVE', weight=-120,
                                    description=f"Montant très élevé ({lti:.1f}x revenus annuels)"))

    # Type de crédit
    credit_impacts = {
        'IMMOBILIER': ('POSITIVE', 50, 'Crédit immobilier avec garantie réelle'),
        'CONSOMMATION': ('NEGATIVE', -30, 'Crédit à la consommation sans garantie'),
    }
    if req.credit_type in credit_impacts:
        imp, w, desc = credit_impacts[req.credit_type]
        factors.append(FactorDetail(name="Type de crédit", impact=imp, weight=w, description=desc))

    # Dettes existantes
    if req.existing_debts == 0:
        factors.append(FactorDetail(name="Engagements existants", impact='POSITIVE', weight=60,
                                    description="Aucune dette en cours"))
    elif req.existing_debts > req.monthly_income * 0.2:
        factors.append(FactorDetail(name="Engagements existants", impact='NEGATIVE', weight=-80,
                                    description=f"Dettes existantes importantes : {req.existing_debts:.0f} MAD/mois"))

    return factors


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get('/health')
def health() -> dict:
    return {
        'status': 'ok',
        'model_loaded': pipeline is not None,
        'version': '1.0.0',
    }


@app.post('/predict', response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    t0 = time.perf_counter()

    total_monthly = req.existing_debts + req.estimated_monthly
    debt_ratio = (total_monthly / req.monthly_income * 100) if req.monthly_income > 0 else 100.0
    repayment_capacity = req.monthly_income - total_monthly

    if pipeline is None:
        raise HTTPException(
            status_code=503,
            detail='Modèle ML non chargé. Lancez train_model.py puis redémarrez.',
        )

    # Inférence ML
    X = derive_features(req)
    raw_score = float(pipeline.predict(X)[0])
    score = int(np.clip(round(raw_score), 0, 1000))

    risk_level, recommendation = score_to_risk(score, debt_ratio)
    factors = build_factors(req, score, debt_ratio)

    inference_ms = (time.perf_counter() - t0) * 1000

    return PredictResponse(
        score=score,
        risk_level=risk_level,
        recommendation=recommendation,
        debt_ratio=round(debt_ratio, 2),
        repayment_capacity=round(repayment_capacity, 2),
        net_income_after=round(repayment_capacity, 2),
        factors=factors,
        model_used='ML',
        inference_ms=round(inference_ms, 2),
    )


@app.post('/predict/batch')
def predict_batch(requests: list[PredictRequest]) -> list[PredictResponse]:
    """Scoring en lot (utile pour les rapports)."""
    return [predict(r) for r in requests]
