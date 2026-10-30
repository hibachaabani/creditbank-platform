import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class ChatbotService {
  private groq: Groq;

  constructor(private configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async chat(
    userMessage: string,
    userContext: {
      firstName: string;
      lastName: string;
      role: string;
      monthlyIncome?: number;
      activeDossiers?: number;
    },
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(userContext);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-6), // Garder les 6 derniers messages pour le contexte
      { role: 'user' as const, content: userMessage },
    ];

    const completion = await this.groq.chat.completions.create({
      model: 'groq/compound-mini',
      messages,
      max_tokens: 512,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content ?? "Je n'ai pas pu générer une réponse. Veuillez réessayer.";
  }

  private buildSystemPrompt(ctx: {
    firstName: string;
    lastName: string;
    role: string;
    monthlyIncome?: number;
    activeDossiers?: number;
  }): string {
    const roleDescriptions: Record<string, string> = {
      CLIENT: 'un client de la banque',
      AGENT: 'un conseiller bancaire',
      ANALYST: 'un analyste crédit',
      DECIDER: 'un responsable crédit',
      ADMIN: 'un administrateur système',
    };

    const taux = `
- Crédit Immobilier : 8% par an
- Crédit Auto : 10,5% par an
- Crédit Consommation : 12% par an
- Crédit Professionnel : 9,5% par an
- Crédit Étudiant : 6% par an`;

    const contextInfo = ctx.monthlyIncome
      ? `\nRevenus mensuels déclarés : ${ctx.monthlyIncome} TND\nCapacité maximale d'emprunt (33%) : ${Math.round(ctx.monthlyIncome * 0.33 * 60)} TND sur 60 mois`
      : '';

    return `Tu es CréditBot, l'assistant IA de la plateforme bancaire CréditBank Tunisie.
Tu es expert en crédits bancaires tunisiens et en gestion financière personnelle.

Tu parles actuellement avec ${ctx.firstName} ${ctx.lastName}, qui est ${roleDescriptions[ctx.role] ?? 'un utilisateur'}.${contextInfo}

Taux d'intérêt actuels pratiqués par CréditBank :${taux}

Règles importantes :
- Réponds toujours en français
- Sois professionnel, précis et bienveillant
- Si on te demande un calcul (mensualité, capacité d'emprunt), effectue-le avec la formule d'annuité constante
- Le taux d'endettement maximum autorisé est de 40% des revenus nets
- N'invente jamais des informations — si tu ne sais pas, dis-le clairement
- Tu peux expliquer le processus de demande de crédit, les documents requis, les délais
- Si une question sort du domaine bancaire, redirige poliment vers ton domaine d'expertise
- Garde tes réponses concises (maximum 4-5 phrases) sauf si l'utilisateur demande des détails

Documents requis selon le type de crédit :
- Immobilier : CNI, bulletins de salaire (3 derniers), relevés bancaires, contrat de travail, compromis de vente
- Auto : CNI, bulletins de salaire (3 derniers), relevés bancaires, contrat de travail
- Consommation : CNI, bulletins de salaire, relevés bancaires
- Étudiant : CNI, justificatif de domicile`;
  }
}
