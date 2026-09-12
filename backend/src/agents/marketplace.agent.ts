// Marketplace Agent — handles salt inventory, listings, offers, sales queries
// Uses real database tools via repository layer

import { Agent, AgentContext, AgentResponse } from './base.agent';
import { saltInventoryRepo, saltListingRepo, offerRepo, transactionRepo, buyerRequestRepo, marketPriceRepo } from '../repositories';
import { AIProvider } from '../providers/ai/interface';
import { getAIProvider } from '../providers';

export class MarketplaceAgent implements Agent {
  type = 'marketplace' as const;
  name = 'Marketplace Agent';
  description = 'Handles salt inventory, listings, offers, and sales queries';
  private ai: AIProvider;

  constructor() {
    this.ai = getAIProvider();
  }

  canHandle(intent: string, query: string): boolean {
    const q = query.toLowerCase();
    return intent === 'marketplace' || intent === 'salt_price' ||
      ['salt', 'sell', 'offer', 'inventory', 'listing', 'buyer', 'earn', 'sale', 'price', 'kg', 'tonne', '₹'].some(kw => q.includes(kw));
  }

  async handle(query: string, context: AgentContext): Promise<AgentResponse> {
    const userId = context.workerId;
    const lang = context.language ?? 'en';

    // ── Gather relevant data ──────────────────────────────────────────────────
    let contextData: Record<string, any> = {};
    const actions: { label: string; link: string }[] = [];

    if (userId) {
      const [inventory, listings, offers, transactions, buyerRequests] = await Promise.allSettled([
        saltInventoryRepo.findByWorkerId(userId),
        saltListingRepo.findByWorkerId(userId),
        offerRepo.findByWorkerId(userId),
        transactionRepo.findBySellerId(userId),
        buyerRequestRepo.findAll({ status: 'OPEN' }),
      ]);

      if (inventory.status === 'fulfilled') {
        const inv = inventory.value;
        const totalAvailable = inv.reduce((s, i) => s + i.availableQuantityKg, 0);
        const totalSold = inv.reduce((s, i) => s + i.soldQuantityKg, 0);
        contextData.inventory = {
          items: inv.map(i => ({
            id: i.id,
            saltType: i.saltType?.name ?? i.saltTypeId,
            grade: i.saltGrade?.name ?? i.saltGradeId,
            available: i.availableQuantityKg,
            sold: i.soldQuantityKg,
            expectedPrice: i.expectedPricePerKg,
            location: i.location,
          })),
          totalAvailableKg: totalAvailable,
          totalSoldKg: totalSold,
        };
      }

      if (listings.status === 'fulfilled') {
        const lst = listings.value;
        const activeListings = lst.filter(l => l.status === 'ACTIVE');
        contextData.listings = {
          active: activeListings.map(l => ({
            id: l.id,
            saltType: l.saltType?.name,
            grade: l.saltGrade?.name,
            quantityKg: l.quantityKg,
            askingPricePerKg: l.askingPricePerKg,
            status: l.status,
            district: l.district,
            viewCount: l.viewCount,
          })),
          total: lst.length,
          activeCount: activeListings.length,
        };
        if (activeListings.length > 0) {
          actions.push({ label: 'View My Listings', link: '/my-salt' });
        }
      }

      if (offers.status === 'fulfilled') {
        const offs = offers.value;
        const pending = offs.filter(o => o.status === 'PENDING' || o.status === 'COUNTERED');
        contextData.offers = {
          pending: pending.map(o => ({
            id: o.id,
            listingId: o.listingId,
            buyerName: o.buyer?.name ?? 'Unknown',
            pricePerKg: o.pricePerKg,
            quantityKg: o.quantityKg,
            totalAmount: o.totalAmount,
            status: o.status,
            createdAt: o.createdAt,
          })),
          pendingCount: pending.length,
          totalOffers: offs.length,
        };
        if (pending.length > 0) {
          actions.push({ label: `View ${pending.length} Pending Offer(s)`, link: '/my-offers' });
        }
      }

      if (transactions.status === 'fulfilled') {
        const txs = transactions.value;
        const completed = txs.filter(t => t.status === 'COMPLETED');
        const totalRevenue = completed.reduce((s, t) => s + t.totalAmount, 0);
        const totalSoldKg = completed.reduce((s, t) => s + t.quantityKg, 0);
        const avgPrice = totalSoldKg > 0 ? totalRevenue / totalSoldKg : 0;

        // Recent 3 transactions for context
        const recentTxs = completed.slice(0, 3);

        contextData.sales = {
          totalRevenue,
          totalSoldKg,
          averagePricePerKg: Math.round(avgPrice * 100) / 100,
          transactionCount: completed.length,
          recentTransactions: recentTxs.map(t => ({
            ref: t.transactionRef,
            saltType: t.saltType?.name,
            grade: t.saltGrade?.name,
            quantityKg: t.quantityKg,
            pricePerKg: t.agreedPricePerKg,
            totalAmount: t.totalAmount,
            completedAt: t.completedAt,
            buyerName: t.buyer?.name,
          })),
        };
        if (completed.length > 0) {
          actions.push({ label: 'View Sales History', link: '/my-sales' });
        }
      }

      if (buyerRequests.status === 'fulfilled') {
        const reqs = buyerRequests.value;
        // Find matching requests based on worker inventory
        const invItems = contextData.inventory?.items ?? [];
        const matchingReqs = reqs.filter((req: any) =>
          invItems.some((inv: any) => req.saltType?.name?.includes(inv.saltType) || true)
        ).slice(0, 5);

        contextData.buyerDemand = {
          openRequests: matchingReqs.map((r: any) => ({
            id: r.id,
            buyer: r.buyer?.name,
            saltType: r.saltType?.name,
            grade: r.saltGrade?.name,
            quantityKg: r.quantityKg,
            targetPrice: r.targetPricePerKg,
            location: r.location,
          })),
          totalOpenRequests: reqs.length,
        };
        if (reqs.length > 0) {
          actions.push({ label: 'View Buyer Demand', link: '/market' });
        }
      }
    }

    // ── Build system prompt ────────────────────────────────────────────────────
    const systemPrompt = lang === 'gu'
      ? `તમે AgariyaCare AI છો — અગ઼ ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ.
You are AgariyaCare AI, a helpful assistant for Agariya salt workers. Respond in Gujarati.
You have access to the worker's real data shown below. Use it to give accurate, helpful answers.
IMPORTANT RULES:
- Only state facts from the provided data
- Never fabricate prices, quantities, or transaction amounts
- If data is unavailable, say so clearly in Gujarati
- Always respond in Gujarati

Worker Data:
${JSON.stringify(contextData, null, 2)}`
      : `You are AgariyaCare AI, an intelligent assistant for Agariya salt-pan workers in Gujarat, India.
You have access to the worker's real marketplace data (inventory, listings, offers, sales, buyer demand).
Use this data to give precise, accurate answers. Do calculations when asked.

IMPORTANT RULES:
- Base your answers on the provided real data only
- Never fabricate prices, quantities, buyers, or transactions
- If asked to calculate (e.g. "how much would I earn if I sell X kg at ₹Y"), do it clearly
- If data is not available, say so honestly
- Be concise and helpful

Worker Data:
${JSON.stringify(contextData, null, 2)}`;

    // ── Call IBM Granite ──────────────────────────────────────────────────────
    let message: string;
    try {
      const history = (context.conversationHistory ?? []).slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      message = await this.ai.chat(
        [...history, { role: 'user', content: query }],
        systemPrompt
      );
    } catch (err: any) {
      if (lang === 'gu') {
        message = `AgariyaCare AI હાલ ઉપ઼ ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ.

AgariyaCare AI અ઼ ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ. ​​ȀȀ.

${contextData.inventory ? `**તમારું મીઠ:** ${contextData.inventory.totalAvailableKg?.toLocaleString('en-IN')} kg ઉ઼ ​​ȀȀ.` : ''}
${contextData.offers?.pendingCount > 0 ? `**પ્ ​​ȀȀ. ​​ȀȀ.:** ${contextData.offers.pendingCount} ​​ȀȀ.` : ''}
${contextData.sales ? `**​​ȀȀ. ​​ȀȀ.:** ₹${contextData.sales.totalRevenue?.toLocaleString('en-IN')}` : ''}`;
      } else {
        message = buildFallbackResponse(query, contextData, lang);
      }
    }

    return { message, agentType: 'marketplace', actions };
  }
}

function buildFallbackResponse(query: string, data: any, lang: string): string {
  const q = query.toLowerCase();

  if (q.includes('inventory') || q.includes('how much salt') || q.includes('available') || q.includes('available salt') || q.includes('available') || q.includes('how much') || q.includes('mine')) {
    if (data.inventory) {
      const lines = data.inventory.items.map((i: any) =>
        `• ${i.saltType} (${i.grade}): **${i.available.toLocaleString('en-IN')} kg** available at ₹${i.expectedPrice}/kg`
      );
      return `Your salt inventory:\n\n${lines.join('\n')}\n\n**Total available: ${data.inventory.totalAvailableKg.toLocaleString('en-IN')} kg**`;
    }
    return 'No inventory data available yet. Please add your salt inventory first.';
  }

  if (q.includes('offer') || q.includes('pending')) {
    if (data.offers?.pendingCount > 0) {
      const offerLines = data.offers.pending.map((o: any) =>
        `• ₹${o.pricePerKg}/kg for ${o.quantityKg.toLocaleString('en-IN')} kg from ${o.buyerName} (Total: ₹${o.totalAmount.toLocaleString('en-IN')})`
      );
      return `You have **${data.offers.pendingCount} pending offer(s)**:\n\n${offerLines.join('\n')}`;
    }
    return 'No pending offers at the moment.';
  }

  if (q.includes('earn') || q.includes('sale') || q.includes('sold') || q.includes('revenue') || q.includes('income')) {
    if (data.sales) {
      return `**Your Sales Summary:**\n\n• Total salt sold: ${data.sales.totalSoldKg.toLocaleString('en-IN')} kg\n• Total revenue: ₹${data.sales.totalRevenue.toLocaleString('en-IN')}\n• Average price: ₹${data.sales.averagePricePerKg}/kg\n• Transactions: ${data.sales.transactionCount}`;
    }
    return 'No completed sales found yet.';
  }

  if ((q.includes('sell') || q.includes('×') || q.includes('*') || q.includes('x')) && (q.includes('₹') || q.includes('rupee') || q.includes('price'))) {
    // Simple calculation request
    const numbers = query.match(/[\d,]+(?:\.\d+)?/g)?.map(n => parseFloat(n.replace(/,/g, '')));
    if (numbers && numbers.length >= 2) {
      const result = numbers[0] * numbers[1];
      return `${numbers[0].toLocaleString('en-IN')} kg × ₹${numbers[1]} = **₹${result.toLocaleString('en-IN')}**\n\n*Calculation based on your query.*`;
    }
  }

  return `AgariyaCare AI is temporarily unavailable. Please try again in a moment.\n\n**Your quick summary:**\n${data.inventory ? `• Available salt: ${data.inventory.totalAvailableKg?.toLocaleString('en-IN')} kg` : ''}\n${data.offers?.pendingCount > 0 ? `• Pending offers: ${data.offers.pendingCount}` : ''}\n${data.sales ? `• Total earnings: ₹${data.sales.totalRevenue?.toLocaleString('en-IN')}` : ''}`;
}
