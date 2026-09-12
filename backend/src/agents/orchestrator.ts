// Enhanced AI Orchestrator — routes to specialized agents with real database tools
// Supports marketplace, offers, inventory, sales, healthcare, welfare, safety

import { Agent, AgentContext } from './base.agent';
import { HealthcareAgent } from './healthcare.agent';
import { SaltPriceAgent } from './salt-price.agent';
import { WelfareAgent } from './welfare.agent';
import { SafetyAgent } from './safety.agent';
import { CommunityAgent } from './community.agent';
import { MarketplaceAgent } from './marketplace.agent';
import { AgentType, ChatRequest, ChatResponse } from '../types';
import { userRepo, workerProfileRepo, saltInventoryRepo, saltListingRepo, offerRepo, transactionRepo, buyerRequestRepo, marketPriceRepo } from '../repositories';

// ─── Intent classification ────────────────────────────────────────────────────

interface IntentSignal {
  agentType: AgentType;
  keywords: string[];
  weight: number;
}

const INTENT_SIGNALS: IntentSignal[] = [
  {
    agentType: 'marketplace',
    weight: 4,
    keywords: [
      'salt', 'sell', 'listing', 'buyer', 'offer', 'price', 'inventory', 'kg', 'tonne', 'ton',
      'transaction', 'sale', 'selling', 'earn', 'earning', 'market', 'negotiate', 'counter',
      'accept', 'reject', 'demand', 'available', 'quantity', 'grade', 'industrial', 'raw',
      'refined', '₹', 'rupee', 'payment', 'buy', 'purchase', 'how much', 'total', 'value',
      // Gujarati
      'મીઠ', 'વેચ', 'ભાવ', 'ઑફ', 'જથ્', 'ટ', 'કમ', 'ક',
    ],
  },
  {
    agentType: 'healthcare',
    weight: 3,
    keywords: ['sick', 'ill', 'pain', 'fever', 'vomit', 'nausea', 'symptom', 'doctor', 'hospital', 'medicine', 'health', 'headache', 'camp', 'medical', 'treatment', 'injury', 'heat stroke', 'heat exhaustion', 'eye', 'skin', 'आरोग्य'],
  },
  {
    agentType: 'welfare',
    weight: 3,
    keywords: ['welfare', 'scheme', 'yojana', 'government', 'benefit', 'insurance', 'subsidy', 'apply', 'eligible', 'bpl', 'ayushman', 'pmjay', 'eshram', 'housing', 'allowance', 'pension', 'ration', 'card'],
  },
  {
    agentType: 'safety',
    weight: 3,
    keywords: ['safe', 'danger', 'emergency', 'heat', 'hot', 'temperature', 'dehydrat', 'faint', 'collapse', 'accident', 'unsafe', 'risk', 'alert', 'water shortage', 'extreme', 'sos', 'work today', 'can i work'],
  },
  {
    agentType: 'community',
    weight: 2,
    keywords: ['community', 'notice', 'announce', 'event', 'meeting', 'coordinator', 'news', 'update', 'support', 'message'],
  },
];

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class AIOrchestrator {
  private agents: Agent[];

  constructor() {
    this.agents = [
      new MarketplaceAgent(),
      new HealthcareAgent(),
      new SaltPriceAgent(),
      new WelfareAgent(),
      new SafetyAgent(),
      new CommunityAgent(),
    ];
  }

  private classifyIntent(query: string): AgentType[] {
    const q = query.toLowerCase();
    const scores = new Map<AgentType, number>();

    for (const signal of INTENT_SIGNALS) {
      let score = 0;
      for (const kw of signal.keywords) {
        if (q.includes(kw)) score += signal.weight;
      }
      if (score > 0) scores.set(signal.agentType, score);
    }

    if (scores.size === 0) return ['general'];

    const maxScore = Math.max(...scores.values());
    const threshold = maxScore * 0.5;

    return Array.from(scores.entries())
      .filter(([, score]) => score >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);
  }

  async process(request: ChatRequest): Promise<ChatResponse> {
    const intents = this.classifyIntent(request.message);
    const primaryIntent = intents[0] ?? 'general';

    // Fetch user context if available
    let user = null;
    let workerProfile = null;
    const userId = request.userId || request.workerId;

    if (userId) {
      user = await userRepo.findById(userId);
      if (user?.role === 'worker') {
        workerProfile = await workerProfileRepo.findByUserId(userId);
      }
    }

    const context: AgentContext = {
      workerId: userId,
      worker: user ? {
        id: user.id, name: user.name, workerId: workerProfile?.workerId ?? '',
        age: 0, gender: 'male', location: workerProfile?.village ?? '',
        occupation: 'Salt pan worker', experienceYears: workerProfile?.yearsOfWork ?? 0,
        familySize: workerProfile?.familySize ?? 0,
        annualIncome: workerProfile?.annualIncome ?? 0,
        isGujaratResident: true, isBPL: workerProfile?.isBPL ?? false,
        hasDisability: workerProfile?.hasDisability ?? false,
        housingStatus: workerProfile?.housingStatus ?? 'rented',
        hasBankAccount: workerProfile?.hasBankAccount ?? false,
        hasAadhaar: workerProfile?.hasAadhaar ?? false,
        isRegisteredWorker: workerProfile?.isRegisteredWorker ?? false,
        hasHealthInsurance: workerProfile?.hasHealthInsurance ?? false,
        saltProduction: workerProfile?.saltProductionTonnesPerSeason ?? 0,
        role: user.role,
        createdAt: user.createdAt,
      } : null,
      conversationHistory: request.conversationHistory,
      language: request.language ?? 'en',
    };

    const matchingAgents = this.agents.filter(agent =>
      intents.includes(agent.type) || agent.canHandle(primaryIntent, request.message)
    );

    if (matchingAgents.length === 0) {
      return {
        message: this.buildGeneralResponse(request.message, request.language ?? 'en'),
        agentsUsed: ['general'],
        timestamp: new Date().toISOString(),
      };
    }

    if (matchingAgents.length === 1) {
      const agent = matchingAgents[0];
      const response = await agent.handle(request.message, context);
      return {
        message: response.message,
        agentsUsed: [response.agentType],
        actions: response.actions,
        timestamp: new Date().toISOString(),
      };
    }

    // Multi-agent: use primary only to keep response focused
    const primaryAgent = matchingAgents[0];
    const response = await primaryAgent.handle(request.message, context);
    return {
      message: response.message,
      agentsUsed: [response.agentType],
      actions: response.actions,
      timestamp: new Date().toISOString(),
    };
  }

  private buildGeneralResponse(query: string, language: string): string {
    if (language === 'gu') {
      return `નમસ્તે! હું AgariyaCare AI છું. હું આ વિષયોમાં મદદ કરી શકું છું:

🧂 **મારું મીઠ** — ઈન્વેન્ટરી, લિસ્ટિંગ, ભાવ
💰 **ઑફ** — ઑફ સ્વીકારવી, નકારવી, કાઉન્ટર કરવી
📊 **વેચાણ** — મારી કમાઈ, ઈતિહાસ
❤️ **આરોગ્ય** — લક્ષણો, આરોગ્ય શિબિર
☀️ **સલામતી** — ગરમી જોખમ, SOS
📋 **કલ્યાણ** — સરકારી યોજનાઓ

*IBM Granite AI દ્વારા સંચાલિત*`;
    }
    return `Hello! I'm AgariyaCare AI. I can help you with:

🧂 **My Salt** — inventory, listings, pricing
💰 **Offers** — accept, reject, or counter offers  
📊 **Sales** — track earnings and history
❤️ **Healthcare** — symptoms, health camps
☀️ **Safety** — heat risk, SOS
📋 **Welfare** — government schemes

Please tell me what you need help with today.

*Powered by IBM Granite AI*`;
  }
}

export const orchestrator = new AIOrchestrator();
