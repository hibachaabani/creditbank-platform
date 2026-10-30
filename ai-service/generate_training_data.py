"""
Génère ~12 000 exemples synthétiques de demandes de crédit bancaire
basés sur les règles métier réelles du projet.
Résultat : data/training_data.csv
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
N = 12000

CREDIT_TYPES = ['IMMOBILIER', 'AUTO', 'CONSOMMATION', 'PROFESSIONNEL', 'ETUDIANT']
CREDIT_TYPE_RATES = {
    'IMMOBILIER': 8.0,
    'AUTO': 10.5,
    'CONSOMMATION': 12.0,
    'PROFESSIONNEL': 9.5,
    'ETUDIANT': 6.0,
}
CREDIT_TYPE_BONUS = {
    'IMMOBILIER': 50,
    'AUTO': 0,
    'CONSOMMATION': -30,
    'PROFESSIONNEL': 0,
    'ETUDIANT': 0,
}


def monthly_payment(amount: float, duration: int, annual_rate: float) -> float:
    r = (annual_rate / 100) / 12
    if r == 0:
        return amount / duration
    return amount * (r * (1 + r) ** duration) / ((1 + r) ** duration - 1)


def compute_score_rule(row) -> dict:
    """Réplique exacte de la logique scoring.engine.ts"""
    monthly_income = row['monthly_income']
    existing_debts = row['existing_debts']
    estimated_monthly = row['estimated_monthly']
    requested_amount = row['requested_amount']
    requested_duration = row['requested_duration']
    credit_type = row['credit_type']

    score = 500

    # 1. Taux d'endettement
    total_monthly = existing_debts + estimated_monthly
    debt_ratio = (total_monthly / monthly_income * 100) if monthly_income > 0 else 100

    if debt_ratio <= 20:
        score += 200
    elif debt_ratio <= 33:
        score += 100
    elif debt_ratio <= 40:
        score += 0
    elif debt_ratio <= 50:
        score -= 150
    else:
        score -= 300

    # 2. Capacité de remboursement
    coverage = monthly_income / estimated_monthly if estimated_monthly > 0 else 0
    if coverage >= 5:
        score += 100
    elif coverage >= 3:
        score += 50
    elif coverage < 2:
        score -= 100

    # 3. Durée
    if requested_duration <= 60:
        score += 80
    elif requested_duration <= 120:
        score += 40
    elif requested_duration > 240:
        score -= 60

    # 4. Ratio montant / revenus annuels
    annual_income = monthly_income * 12
    lti = requested_amount / annual_income if annual_income > 0 else 99
    if lti <= 2:
        score += 80
    elif lti <= 4:
        score += 20
    elif lti > 6:
        score -= 120

    # 5. Type de crédit
    score += CREDIT_TYPE_BONUS.get(credit_type, 0)

    # 6. Dettes existantes
    if existing_debts == 0:
        score += 60
    elif existing_debts > monthly_income * 0.2:
        score -= 80

    score = max(0, min(1000, score))

    if score >= 700:
        risk = 'LOW'
        rec = 'FAVORABLE'
    elif score >= 550:
        risk = 'MEDIUM'
        rec = 'CONDITIONAL'
    elif score >= 400:
        risk = 'HIGH'
        rec = 'CONDITIONAL'
    else:
        risk = 'VERY_HIGH'
        rec = 'UNFAVORABLE'

    if debt_ratio > 50:
        rec = 'UNFAVORABLE'

    return {
        'score': score,
        'debt_ratio': round(debt_ratio, 2),
        'repayment_capacity': round(monthly_income - total_monthly, 2),
        'risk_level': risk,
        'recommendation': rec,
    }


# ── Génération des features ───────────────────────────────────────────────────

monthly_incomes = np.random.lognormal(mean=np.log(8000), sigma=0.6, size=N).clip(2000, 80000)
existing_debts_ratio = np.random.beta(2, 5, N)
existing_debts = (monthly_incomes * existing_debts_ratio).clip(0, monthly_incomes * 0.6)
# 20% sans dettes
no_debt_mask = np.random.random(N) < 0.20
existing_debts[no_debt_mask] = 0.0

credit_types = np.random.choice(CREDIT_TYPES, N, p=[0.35, 0.20, 0.25, 0.12, 0.08])

requested_amounts = []
requested_durations = []
for ct in credit_types:
    if ct == 'IMMOBILIER':
        amt = np.random.uniform(200_000, 2_000_000)
        dur = np.random.choice([120, 180, 240, 300, 360])
    elif ct == 'AUTO':
        amt = np.random.uniform(50_000, 400_000)
        dur = np.random.choice([24, 36, 48, 60, 72, 84])
    elif ct == 'CONSOMMATION':
        amt = np.random.uniform(5_000, 150_000)
        dur = np.random.choice([12, 24, 36, 48, 60])
    elif ct == 'PROFESSIONNEL':
        amt = np.random.uniform(30_000, 500_000)
        dur = np.random.choice([36, 60, 84, 120])
    else:  # ETUDIANT
        amt = np.random.uniform(10_000, 80_000)
        dur = np.random.choice([24, 36, 48, 60])
    requested_amounts.append(amt)
    requested_durations.append(dur)

requested_amounts = np.array(requested_amounts)
requested_durations = np.array(requested_durations)

estimated_monthlies = np.array([
    monthly_payment(requested_amounts[i], requested_durations[i], CREDIT_TYPE_RATES[credit_types[i]])
    for i in range(N)
])

# ── Construire le DataFrame ───────────────────────────────────────────────────
df = pd.DataFrame({
    'monthly_income': monthly_incomes,
    'existing_debts': existing_debts,
    'estimated_monthly': estimated_monthlies,
    'requested_amount': requested_amounts,
    'requested_duration': requested_durations,
    'credit_type': credit_types,
})

# Calcul des labels avec les règles métier
results = df.apply(compute_score_rule, axis=1, result_type='expand')
df['score'] = results['score']
df['debt_ratio'] = results['debt_ratio']
df['repayment_capacity'] = results['repayment_capacity']
df['risk_level'] = results['risk_level']
df['recommendation'] = results['recommendation']

# ── Features dérivées pour le modèle ─────────────────────────────────────────
df['coverage_ratio'] = df['monthly_income'] / df['estimated_monthly'].replace(0, 1)
df['loan_to_income'] = df['requested_amount'] / (df['monthly_income'] * 12)

os.makedirs('data', exist_ok=True)
df.to_csv('data/training_data.csv', index=False)

print(f"✅ {N} exemples générés → data/training_data.csv")
print(f"\nDistribution des scores :")
print(f"  LOW (≥700)       : {(df['risk_level']=='LOW').sum():>5} ({(df['risk_level']=='LOW').mean()*100:.1f}%)")
print(f"  MEDIUM (550-699) : {(df['risk_level']=='MEDIUM').sum():>5} ({(df['risk_level']=='MEDIUM').mean()*100:.1f}%)")
print(f"  HIGH (400-549)   : {(df['risk_level']=='HIGH').sum():>5} ({(df['risk_level']=='HIGH').mean()*100:.1f}%)")
print(f"  VERY_HIGH (<400) : {(df['risk_level']=='VERY_HIGH').sum():>5} ({(df['risk_level']=='VERY_HIGH').mean()*100:.1f}%)")
print(f"\nDistribution recommandations :")
print(df['recommendation'].value_counts())
