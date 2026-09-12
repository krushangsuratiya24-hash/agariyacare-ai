import { Agent, AgentContext, AgentResponse } from './base.agent';
import { getAIProvider } from '../providers';
import { healthcareRepo } from '../repositories';

const SYSTEM_PROMPT = `You are the Remote Healthcare Outreach Agent for AgariyaCare AI — a platform serving Agariya salt pan workers in the Little Rann of Kutch, Gujarat.

Your responsibilities:
- Provide general health information for salt pan working conditions
- Help workers understand symptoms of heat exhaustion and heat stroke
- Guide workers to nearby healthcare camps and outreach services
- Help workers understand the status of their healthcare requests
- Provide basic first-aid information for common salt-pan injuries

CRITICAL RULES:
1. You are NOT a doctor and must NEVER diagnose diseases
2. Always recommend professional medical care for serious symptoms
3. For any life-threatening emergency, immediately direct the worker to call 108 (emergency)
4. Always include the disclaimer: "This information is for general guidance only and does not replace qualified medical care."
5. Be empathetic, clear, and simple — many workers have limited literacy
6. When responding in Gujarati (language=gu), respond fully in Gujarati

Salt pan health risks to know:
- Heat exhaustion / heat stroke (most common in summer, 40°C+)
- Dehydration from heavy sweating
- Salt water skin and eye irritation
- Musculoskeletal injuries from heavy manual labour
- Respiratory issues from salt dust

Symptom guidance (DO NOT diagnose, only guide):
- Dizziness + heavy sweating + hot dry skin → possible heat stroke — STOP work, move to shade, call 108
- Excessive thirst + dark urine + weakness → dehydration — drink water, rest, see doctor if severe
- Eye redness/burning → salt irritation — rinse with clean water, see doctor if pain persists
- Chest pain / difficulty breathing → CALL 108 immediately`;

export class HealthcareAgent implements Agent {
  type = 'healthcare' as const;
  name = 'Remote Healthcare Outreach Agent';
  description = 'Handles health queries, symptom guidance, camp registration, and healthcare requests';

  canHandle(intent: string, query: string): boolean {
    const keywords = ['sick', 'ill', 'pain', 'dizzy', 'nausea', 'health', 'hospital', 'doctor', 'camp', 'medicine',
      'symptom', 'fever', 'injury', 'eye', 'skin', 'rash', 'heat', 'vomit', 'headache', 'healthcare', 'medical',
      'request', 'submitted', 'my request',
      'બીમાર', 'દવાખાનુ', 'ડૉક્ટર', 'treatment', 'આરોગ્ય', 'વિનંત'];
    const q = query.toLowerCase();
    return keywords.some(k => q.includes(k)) || intent === 'healthcare';
  }

  async handle(query: string, context: AgentContext): Promise<AgentResponse> {
    const ai = getAIProvider();
    const lang = context.language ?? 'en';

    // Fetch camps
    const camps = await healthcareRepo.findAllCamps();
    const activeCamps = camps.filter(c => c.isActive);
    const campInfo = activeCamps.map(c =>
      `- ${c.name} at ${c.location} on ${c.date} (${c.time}) | Services: ${c.services.join(', ')} | Contact: ${c.contact}`
    ).join('\n');

    // Fetch worker's own requests if authenticated
    let requestsInfo = '';
    if (context.workerId) {
      try {
        const requests = await healthcareRepo.findAllRequests({ workerId: context.workerId });
        if (requests.length > 0) {
          const latest = requests.slice(0, 3);
          requestsInfo = `\nWorker's Healthcare Requests (latest):\n${latest.map(r =>
            `- [${r.status}] ${Array.isArray(r.symptoms) ? r.symptoms.join(', ') : r.symptoms} — submitted ${new Date(r.createdAt).toLocaleDateString('en-IN')}`
          ).join('\n')}`;
        }
      } catch {
        // ignore
      }
    }

    const workerCtx = context.worker
      ? `Worker: ${context.worker.name}, Location: ${context.worker.location}`
      : 'Unknown worker';

    const augmentedSystem = `${SYSTEM_PROMPT}

Available Healthcare Camps:
${campInfo || 'No camps currently scheduled.'}
${requestsInfo}
Worker Context: ${workerCtx}
Language: ${lang === 'gu' ? 'Gujarati — respond in Gujarati' : 'English'}`;

    let message: string;
    try {
      const history = (context.conversationHistory ?? []).slice(-6);
      message = await ai.chat(
        [...history, { role: 'user', content: query }],
        augmentedSystem
      );
    } catch {
      if (lang === 'gu') {
        message = `આરોગ્ય સહાય:\n\nJkoi ઇmergency માટે **108** પર ફોન કરો.\n\nઉ.HealthcareCamps:\n${campInfo || 'કોઈ camp ઉ.'}\n\n⚠️ આ સ઼ ​​. ​​. ​​. ​​. ​​. ​​. ​​. doctor ​​. ​​. ​​. ​​. ​​.`;
      } else {
        message = `I'm here to help with your health concern.\n\n🚨 For medical emergencies, call **108** immediately.\n\nAvailable health camps:\n${campInfo || 'No camps currently scheduled. Contact your coordinator for assistance.'}\n\n⚠️ *This information is for general guidance only and does not replace qualified medical care.*`;
      }
    }

    return {
      message,
      agentType: 'healthcare',
      actions: activeCamps.length > 0
        ? [{ label: 'View Health Camps', link: '/healthcare' }, { label: 'Submit Request', link: '/healthcare' }]
        : [{ label: 'Submit Healthcare Request', link: '/healthcare' }],
    };
  }
}
