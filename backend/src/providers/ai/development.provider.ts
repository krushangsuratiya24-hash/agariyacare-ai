// Development AI Provider — intelligently uses context data when Granite unavailable
// NOT a replacement for real IBM Granite — only for dev/testing

import { AIProvider, AIMessage } from './interface';

export class DevelopmentAIProvider implements AIProvider {
  isAvailable(): boolean {
    return true;
  }

  providerName(): string {
    return 'Development AI (configure IBM_WATSONX_API_KEY for real IBM Granite)';
  }

  async chat(messages: AIMessage[], systemPrompt?: string): Promise<string> {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const q = lastUserMsg.toLowerCase();

    // Try to extract Worker Data from system prompt if marketplace context
    let contextData: any = null;
    const safePrompt = systemPrompt ?? '';
    if (safePrompt) {
      try {
        const jsonMatch = safePrompt.match(/Worker Data:\n([\s\S]+)$/);
        if (jsonMatch) {
          contextData = JSON.parse(jsonMatch[1]);
        }
      } catch {}
    }

    // ── Marketplace queries with real data ────────────────────────────────────
    if (contextData) {
      // Inventory query
      if (q.includes('inventory') || q.includes('how much salt') || q.includes('available') || q.includes('available salt') || q.includes('salt do i have') || q.includes('કેટલ') || q.includes('salt available') || q.includes('salt') && q.includes('have')) {
        const inv = contextData.inventory;
        if (inv) {
          const lines = inv.items.map((i: any) =>
            `• **${i.saltType}** (${i.grade}): ${i.available.toLocaleString('en-IN')} kg available at ₹${i.expectedPrice}/kg — ${i.location}`
          ).join('\n');
          const isGu = safePrompt.includes('Respond in Gujarati') || lastUserMsg.includes('મ');
          if (isGu) {
            return `તમારી પાસે **${inv.totalAvailableKg.toLocaleString('en-IN')} kg** મીઠ ઉ઼ ​​ available છે:\n\n${lines}\n\n*IBM Granite AI — Development Mode*`;
          }
          return `You currently have **${inv.totalAvailableKg.toLocaleString('en-IN')} kg** of salt available:\n\n${lines}\n\n*Note: This is development mode. Configure IBM Granite for production AI.*`;
        }
        return 'No inventory data found. Please add your salt inventory first.';
      }

      // Offers query
      if (q.includes('offer') || q.includes('pending') || q.includes('bid')) {
        const offers = contextData.offers;
        if (offers && offers.pendingCount > 0) {
          const offerLines = offers.pending.map((o: any) =>
            `• ₹${o.pricePerKg}/kg for ${o.quantityKg.toLocaleString('en-IN')} kg from **${o.buyerName}** — Total: ₹${o.totalAmount.toLocaleString('en-IN')} (${o.status})`
          ).join('\n');
          return `You have **${offers.pendingCount} pending offer(s)**:\n\n${offerLines}\n\nReview each offer and consider the reference price range before deciding.\n\n*Development Mode — IBM Granite for production AI*`;
        }
        return 'You have no pending offers at the moment.';
      }

      // "Should I accept this offer?"
      if (q.includes('should i accept') || q.includes('accept this offer') || q.includes('good offer') || q.includes('fair offer')) {
        const offers = contextData.offers;
        const listings = contextData.listings;
        if (offers && offers.pendingCount > 0) {
          const latestOffer = offers.pending[0];
          const matchingListing = listings?.active?.find((l: any) => l.id === latestOffer.listingId);
          const askingPrice = matchingListing?.askingPricePerKg ?? 0;
          const offerPrice = latestOffer.pricePerKg;
          const diff = ((offerPrice - askingPrice) / askingPrice) * 100;

          let assessment = '';
          if (diff >= 0) {
            assessment = `✅ The offer (₹${offerPrice}/kg) is **at or above your asking price** (₹${askingPrice}/kg). This is a favorable offer.`;
          } else if (diff >= -5) {
            assessment = `🟡 The offer (₹${offerPrice}/kg) is slightly below your asking price (₹${askingPrice}/kg) — about ${Math.abs(diff).toFixed(1)}% lower. This may be acceptable.`;
          } else if (diff >= -10) {
            assessment = `🟠 The offer (₹${offerPrice}/kg) is ${Math.abs(diff).toFixed(1)}% below your asking price (₹${askingPrice}/kg). Consider counter-offering at ₹${(askingPrice * 0.97).toFixed(2)}/kg.`;
          } else {
            assessment = `🔴 The offer (₹${offerPrice}/kg) is ${Math.abs(diff).toFixed(1)}% below your asking price (₹${askingPrice}/kg). This is significantly below. You may want to counter-offer or decline.`;
          }

          return `**Offer Analysis:**\n\n${assessment}\n\n**Offer Details:**\n• Buyer: ${latestOffer.buyerName}\n• Price: ₹${offerPrice}/kg\n• Quantity: ${latestOffer.quantityKg.toLocaleString('en-IN')} kg\n• Total: ₹${latestOffer.totalAmount.toLocaleString('en-IN')}\n\nYou can Accept, Reject, or Counter-Offer.\n\n*Development Mode — Configure IBM Granite for real AI analysis*`;
        }
        return 'No pending offers found to analyze.';
      }

      // Sales / earnings query
      if (q.includes('earn') || q.includes('sale') || q.includes('sold') || q.includes('revenue') || q.includes('income') || q.includes('how much did')) {
        const sales = contextData.sales;
        if (sales) {
          const recentLines = sales.recentTransactions.map((t: any) =>
            `• ${t.ref}: ${t.quantityKg.toLocaleString('en-IN')} kg of ${t.saltType ?? 'salt'} at ₹${t.pricePerKg}/kg = ₹${t.totalAmount.toLocaleString('en-IN')}`
          ).join('\n');
          return `**Your Sales Summary:**\n\n• Total salt sold: **${sales.totalSoldKg.toLocaleString('en-IN')} kg**\n• Total revenue: **₹${sales.totalRevenue.toLocaleString('en-IN')}**\n• Average price: **₹${sales.averagePricePerKg}/kg**\n• Completed transactions: ${sales.transactionCount}\n\n**Recent Transactions:**\n${recentLines || 'None yet'}\n\n*Development Mode*`;
        }
        return 'No completed sales found yet.';
      }

      // Calculation query
      if ((q.includes('sell') || q.includes('earn') || q.includes('how much') || q.includes('calculate') || q.includes('total')) &&
          (q.includes('kg') || q.includes('tonne') || q.includes('₹') || q.includes('per'))) {
        const numbers = lastUserMsg.match(/[\d,]+(?:\.\d+)?/g)?.map(n => parseFloat(n.replace(/,/g, '')));
        if (numbers && numbers.length >= 2) {
          const [qty, price] = numbers;
          const total = qty * price;
          return `**Calculation:**\n\n${qty.toLocaleString('en-IN')} kg × ₹${price}/kg = **₹${total.toLocaleString('en-IN')}**\n\nThis is the gross amount before any transport or processing costs.`;
        }
      }

      // Buyer demand query
      if (q.includes('buyer') || q.includes('demand') || q.includes('request') || q.includes('who want')) {
        const demand = contextData.buyerDemand;
        if (demand && demand.openRequests.length > 0) {
          const lines = demand.openRequests.map((r: any) =>
            `• **${r.buyer ?? 'Buyer'}** needs ${r.quantityKg.toLocaleString('en-IN')} kg of ${r.saltType ?? 'salt'}${r.targetPrice ? ` at ₹${r.targetPrice}/kg` : ''} — ${r.location}`
          ).join('\n');
          return `**Open Buyer Requests (${demand.totalOpenRequests} total):**\n\n${lines}\n\nYou can make an offer on any listing that matches their requirements.\n\n*Development Mode*`;
        }
        return 'No open buyer requests found matching your inventory.';
      }
    }

    // ── Non-marketplace fallback ──────────────────────────────────────────────
    if (safePrompt.includes('healthcare') || safePrompt.includes('Health') || q.includes('sick') || q.includes('doctor') || q.includes('pain')) {
      return `**Healthcare Information:**\n\nFor medical concerns in the field:\n• Heat exhaustion: Move to shade, drink water, rest immediately\n• Eye irritation: Rinse with clean water for 15 minutes\n• Skin irritation: Rinse affected area with clean water\n\n⚠️ **For emergencies or severe symptoms, call 108 immediately.**\n\nCheck the Healthcare section to submit a medical request or find nearby health camps.\n\n*AI-generated information — does not replace professional medical care*`;
    }

    if (safePrompt.includes('safety') || q.includes('heat') || q.includes('safe') || q.includes('temperature')) {
      return `**Safety Guidance:**\n\n☀️ Working safely in extreme heat:\n• Drink water every 20 minutes (250ml)\n• Rest in shade 10 min/hour\n• Wear light-colored protective clothing\n• Stop immediately if dizzy, nauseous, or very weak\n\n🌡️ Heat Risk:\n- Above 40°C: HIGH RISK — limit heavy work\n- Above 45°C: EXTREME — avoid outdoor work\n\n**SOS: Call 108 for emergencies**\n\n*Development Mode*`;
    }

    if (safePrompt.includes('welfare') || q.includes('welfare') || q.includes('scheme') || q.includes('government')) {
      return `**Welfare Schemes for Salt Workers:**\n\n1. **PM Suraksha Bima Yojana** — ₹2 lakh accident insurance at just ₹20/year\n2. **Ayushman Bharat PM-JAY** — ₹5 lakh health coverage per family\n3. **E-Shram Registration** — Access to multiple welfare benefits\n4. **PM Jan Dhan Yojana** — Bank account with insurance benefits\n\nCheck the Welfare section for personalized scheme matching.\n\n⚠️ Verify eligibility with official sources before applying.`;
    }

    // Generic response
    return `Hello! I'm AgariyaCare AI.\n\nI can help you with:\n🧂 **Salt & Market** — inventory, listings, offers, sales\n💰 **Earnings** — calculate and track your income\n❤️ **Healthcare** — health guidance and camp info\n☀️ **Safety** — heat risk and safety tips\n📋 **Welfare** — government scheme matching\n\nPlease ask me anything about your salt business!\n\n*Development Mode — Configure IBM_WATSONX_API_KEY for IBM Granite AI*`;
  }
}
