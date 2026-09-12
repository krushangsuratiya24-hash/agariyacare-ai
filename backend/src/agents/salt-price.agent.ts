import { Agent, AgentContext, AgentResponse } from './base.agent';
import { getAIProvider } from '../providers';
import { marketPriceRepo } from '../repositories';

const SYSTEM_PROMPT = `You are the Salt Price Discovery Agent for AgariyaCare AI, helping Agariya salt pan workers in Gujarat understand fair market prices for salt.

Your responsibilities:
- Share current reference salt prices across Gujarat markets
- Help workers evaluate buyer offers vs market reference prices
- Explain price differences in simple terms
- Provide historical price context
- Calculate fair offer assessments

IMPORTANT RULES:
1. Always clearly state that prices are DEVELOPMENT REFERENCE DATA, not official market prices
2. Never claim development data is from official sources
3. Always recommend workers verify prices with local cooperative/salt board before selling
4. Be clear about which data source is being used
5. Use Indian number formatting (₹ per tonne)

Salt grades in Gujarat:
- Grade A Common Salt: highest quality, highest price
- Grade B Common Salt: medium quality
- Iodised Salt: premium for industrial/food use`;

export class SaltPriceAgent implements Agent {
  type = 'salt_price' as const;
  name = 'Salt Price Discovery Agent';
  description = 'Provides salt market prices, buyer offer comparisons, and price trend information';

  canHandle(intent: string, query: string): boolean {
    const keywords = ['price', 'salt', 'tonne', 'buyer', 'market', 'sell', 'fair', 'offer', 'rate', 'kilo',
      'kg', 'rupee', '₹', 'trade', 'payment', 'ભાવ', 'મીઠું', 'ભૂગ'];
    const q = query.toLowerCase();
    return keywords.some(k => q.includes(k)) || intent === 'salt_price';
  }

  async handle(query: string, context: AgentContext): Promise<AgentResponse> {
    const ai = getAIProvider();

    const prices = await marketPriceRepo.getLatestPrices();
    const priceInfo = prices.map(p =>
      `- ${p.market ?? p.region ?? ''} (${p.location ?? ''}): ${p.saltType ?? ''} ${p.qualityGrade ?? ''} = ₹${p.pricePerTonne ?? (p.pricePerKg ? p.pricePerKg * 1000 : 0)}/tonne | Buyer: ${p.buyer ?? ''} | Updated: ${p.lastUpdated ? new Date(p.lastUpdated).toLocaleDateString('en-IN') : 'N/A'}`
    ).join('\n');

    const trend = await marketPriceRepo.getPriceTrend(7);
    const avgPrice = trend.length > 0
      ? Math.round(trend.reduce((sum: number, e: any) => sum + e.pricePerTonne, 0) / trend.length)
      : 0;

    const augmentedSystem = `${SYSTEM_PROMPT}

Current Reference Prices (DEVELOPMENT DATA — not official):
${priceInfo}

7-day Average: ₹${avgPrice}/tonne

⚠️ DISCLAIMER: All prices shown are from development reference data and may not represent official market prices.`;

    let message: string;
    try {
      message = await ai.chat([{ role: 'user', content: query }], augmentedSystem);
    } catch {
      message = `Current reference prices (development data only):\n\n${priceInfo}\n\n7-day average: ₹${avgPrice}/tonne\n\n⚠️ These are development reference prices only. Verify with official sources before selling.`;
    }

    return {
      message,
      agentType: 'salt_price',
      actions: [
        { label: 'View Price Details', link: '/salt-prices' },
        { label: 'Open Price Calculator', link: '/salt-prices' },
      ],
    };
  }
}
