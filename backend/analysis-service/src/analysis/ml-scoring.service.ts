import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScoringInput, ScoringResult, ScoringFactor } from './scoring.engine';

// Forme exacte du JSON retourné par le service Python
interface MlPredictResponse {
  score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  recommendation: 'FAVORABLE' | 'CONDITIONAL' | 'UNFAVORABLE';
  debt_ratio: number;
  repayment_capacity: number;
  net_income_after: number;
  factors: Array<{
    name: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    weight: number;
    description: string;
  }>;
  model_used: 'ML' | 'RULES';
  inference_ms: number;
}

@Injectable()
export class MlScoringService {
  private readonly logger = new Logger(MlScoringService.name);
  private readonly aiServiceUrl: string;
  private readonly timeoutMs = 5000; // 5 secondes max avant fallback

  constructor(private readonly config: ConfigService) {
    this.aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  /**
   * Appelle le service Python ML.
   * Retourne null si le service est indisponible (le caller fera le fallback).
   */
  async predict(input: ScoringInput): Promise<ScoringResult | null> {
    const url = `${this.aiServiceUrl}/predict`;

    const body = {
      monthly_income: input.monthlyIncome,
      existing_debts: input.existingDebts,
      estimated_monthly: input.estimatedMonthly,
      requested_amount: input.requestedAmount,
      requested_duration: input.requestedDuration,
      credit_type: input.creditType,
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown error');
        this.logger.warn(`ML service HTTP ${response.status}: ${errText}`);
        return null;
      }

      const data: MlPredictResponse = await response.json();
      this.logger.log(
        `ML score: ${data.score}/1000 | ${data.risk_level} | inférence: ${data.inference_ms}ms`,
      );

      return this.mapToScoringResult(data, input);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        this.logger.warn(`ML service timeout (>${this.timeoutMs}ms) — fallback règles activé`);
      } else {
        this.logger.warn(`ML service indisponible: ${err?.message} — fallback règles activé`);
      }
      return null;
    }
  }

  /** Vérifie si le service Python est vivant */
  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.aiServiceUrl}/health`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Mapping Python → TypeScript ────────────────────────────────────────────
  private mapToScoringResult(data: MlPredictResponse, input: ScoringInput): ScoringResult {
    const factors: ScoringFactor[] = data.factors.map((f) => ({
      name: f.name,
      impact: f.impact,
      weight: f.weight,
      description: f.description,
    }));

    const totalMonthly = input.existingDebts + input.estimatedMonthly;
    const repaymentCapacity = input.monthlyIncome - totalMonthly;

    return {
      score: data.score,
      riskLevel: data.risk_level,
      recommendation: data.recommendation,
      debtRatio: data.debt_ratio,
      repaymentCapacity: data.repayment_capacity ?? repaymentCapacity,
      netIncomeAfter: data.net_income_after ?? repaymentCapacity,
      factors,
    };
  }
}
