import { Agent, AgentContext, AgentResponse } from './base.agent';
import { getAIProvider } from '../providers';
import { welfareRepo } from '../repositories';
import { Worker, WelfareMatch, WelfareMatchResult, WelfareScheme } from '../types';

const SYSTEM_PROMPT = `You are the Welfare Scheme Matching Agent for AgariyaCare AI, helping Agariya salt pan workers in Gujarat discover government welfare schemes they may be eligible for.

Your responsibilities:
- Match worker profiles with relevant government welfare schemes
- Explain eligibility in simple, clear language (English or Gujarati)
- Describe required documents and application process
- Prioritise schemes with highest impact for salt pan workers

IMPORTANT RULES:
1. Never invent eligibility requirements — only use the data provided
2. Always add: "Verify current eligibility on official government portals before applying"
3. Development data is illustrative — real eligibility may differ
4. Be encouraging and action-oriented — tell workers their clear next step
5. Mention specific document names that are commonly available to workers`;

export class WelfareAgent implements Agent {
  type = 'welfare' as const;
  name = 'Welfare Scheme Matching Agent';
  description = 'Matches worker profiles to government welfare schemes and explains eligibility';

  canHandle(intent: string, query: string): boolean {
    const keywords = ['welfare', 'scheme', 'government', 'yojana', 'benefit', 'insurance', 'pmjay', 'ayushman',
      'eshram', 'subsidy', 'support', 'housing', 'help', 'apply', 'eligible', 'bpl', 'yojana',
      'સરકારી', 'યોજના', 'વીમો', 'ફાયદો', 'imeji'];
    const q = query.toLowerCase();
    return keywords.some(k => q.includes(k)) || intent === 'welfare';
  }

  async handle(query: string, context: AgentContext): Promise<AgentResponse> {
    const ai = getAIProvider();
    const schemes = await welfareRepo.findAllSchemes(true);

    let matchContext = '';
    let matches: WelfareMatch[] = [];

    if (context.worker) {
      matches = this.matchSchemes(context.worker, schemes);
      matchContext = matches.map(m =>
        `- ${m.scheme.name} [${m.result}]: ${m.explanation} | Next: ${m.nextStep}`
      ).join('\n');
    } else {
      matchContext = schemes.map(s =>
        `- ${s.name} (${s.category}): ${s.description} | Criteria: ${s.eligibilityCriteria.join(', ')}`
      ).join('\n');
    }

    const augmentedSystem = `${SYSTEM_PROMPT}

Welfare Scheme Data (DEVELOPMENT/ILLUSTRATIVE DATA):
${matchContext}

Worker: ${context.worker ? `${context.worker.name}, Age ${context.worker.age}, ${context.worker.location}, BPL: ${context.worker.isBPL}, Bank Account: ${context.worker.hasBankAccount}, Aadhaar: ${context.worker.hasAadhaar}` : 'Profile not provided'}

⚠️ This is illustrative development data. Eligibility must be verified with official government portals.`;

    let message: string;
    try {
      message = await ai.chat([{ role: 'user', content: query }], augmentedSystem);
    } catch {
      if (matches.length > 0) {
        const topMatches = matches.filter(m => m.result !== 'NOT_MATCHING');
        message = `Based on your profile, here are potentially relevant welfare schemes:\n\n${topMatches.map(m =>
          `**${m.scheme.name}** [${m.result}]\n${m.explanation}\nNext step: ${m.nextStep}`
        ).join('\n\n')}\n\n⚠️ Verify eligibility on official government portals before applying.`;
      } else {
        message = `Available welfare schemes for salt pan workers:\n\n${schemes.map(s =>
          `**${s.name}** — ${s.description}`
        ).join('\n\n')}\n\n⚠️ This is illustrative development data.`;
      }
    }

    return {
      message,
      agentType: 'welfare',
      actions: [{ label: 'View Welfare Matches', link: '/welfare' }, { label: 'View All Schemes', link: '/welfare' }],
      data: { matches },
    };
  }

  matchSchemes(worker: Worker, schemes: WelfareScheme[]): WelfareMatch[] {
    return schemes.map(scheme => this.evaluateScheme(worker, scheme));
  }

  private evaluateScheme(worker: Worker, scheme: WelfareScheme): WelfareMatch {
    const matchedCriteria: string[] = [];
    const missingInfo: string[] = [];
    let score = 0;

    switch (scheme.id) {
      case 'ws-001': // PMJJBY
        if (worker.age >= 18 && worker.age <= 50) { matchedCriteria.push('Age 18–50'); score++; }
        else missingInfo.push('Age must be 18–50');
        if (worker.hasBankAccount) { matchedCriteria.push('Has bank account'); score++; }
        else missingInfo.push('Bank account required');
        if (worker.hasAadhaar) { matchedCriteria.push('Has Aadhaar'); score++; }
        else missingInfo.push('Aadhaar required');
        break;

      case 'ws-002': // PMSBY
        if (worker.age >= 18 && worker.age <= 70) { matchedCriteria.push('Age 18–70'); score++; }
        if (worker.hasBankAccount) { matchedCriteria.push('Has bank account'); score++; }
        else missingInfo.push('Bank account required');
        if (worker.hasAadhaar) { matchedCriteria.push('Has Aadhaar'); score++; }
        else missingInfo.push('Aadhaar required');
        break;

      case 'ws-003': // Gujarat worker welfare
        if (worker.isRegisteredWorker) { matchedCriteria.push('Registered worker'); score += 2; }
        else missingInfo.push('Worker registration needed — consider E-Shram registration first');
        if (worker.isGujaratResident) { matchedCriteria.push('Gujarat resident'); score++; }
        if (worker.annualIncome < 120000) { matchedCriteria.push('Income below ₹1.2L'); score++; }
        break;

      case 'ws-004': // Ayushman Bharat
        if (worker.isBPL) { matchedCriteria.push('BPL status'); score += 2; }
        else missingInfo.push('BPL status required');
        if (!worker.hasHealthInsurance) { matchedCriteria.push('Not covered by other insurance'); score++; }
        if (worker.hasAadhaar) { matchedCriteria.push('Has Aadhaar'); score++; }
        break;

      case 'ws-005': // E-Shram
        if (!worker.isRegisteredWorker) { matchedCriteria.push('Unorganised sector worker'); score += 2; }
        if (worker.age >= 16 && worker.age <= 59) { matchedCriteria.push('Age 16–59'); score++; }
        if (worker.hasAadhaar) { matchedCriteria.push('Has Aadhaar'); score++; }
        if (!worker.hasAadhaar) missingInfo.push('Aadhaar required for registration');
        break;

      case 'ws-006': // PMAY-G
        if (worker.isBPL) { matchedCriteria.push('BPL status'); score += 2; }
        else missingInfo.push('BPL status required');
        if (worker.housingStatus === 'rented' || worker.housingStatus === 'homeless') {
          matchedCriteria.push('No owned house'); score++;
        }
        if (worker.isGujaratResident) { matchedCriteria.push('Gujarat rural resident'); score++; }
        break;
    }

    const maxScore = 3;
    const result: WelfareMatchResult = score >= maxScore * 0.8
      ? 'HIGHLY_RELEVANT'
      : score >= maxScore * 0.5
        ? 'POTENTIALLY_ELIGIBLE'
        : missingInfo.length > 0 && score > 0
          ? 'MORE_INFO_REQUIRED'
          : 'NOT_MATCHING';

    const explanation = matchedCriteria.length > 0
      ? `You match: ${matchedCriteria.join(', ')}.`
      : 'You may not currently meet the key criteria.';

    const nextStep = result === 'HIGHLY_RELEVANT' || result === 'POTENTIALLY_ELIGIBLE'
      ? `Apply at: ${scheme.applicationMethod}`
      : missingInfo.length > 0
        ? `To become eligible: ${missingInfo[0]}`
        : 'Check official portal for latest criteria.';

    return {
      scheme,
      result,
      matchedCriteria,
      missingInfo,
      explanation,
      nextStep,
    };
  }
}
