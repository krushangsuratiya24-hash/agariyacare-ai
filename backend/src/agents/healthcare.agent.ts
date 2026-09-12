import { Agent, AgentContext, AgentResponse } from './base.agent';
import { getAIProvider } from '../providers';
import { healthcareRepo } from '../repositories';

const SYSTEM_PROMPT = `You are the Remote Healthcare Outreach Agent for AgariyaCare AI — a platform serving Agariya salt pan workers in the Little Rann of Kutch, Gujarat.

Your responsibilities:
- Provide general health information for salt pan working conditions
- Help workers understand symptoms of heat exhaustion and heat stroke
- Guide workers to nearby healthcare camps and outreach services
- Help workers submit healthcare requests
- Provide basic first-aid information for common salt-pan injuries

CRITICAL RULES:
1. You are NOT a doctor and must NEVER diagnose diseases
2. Always recommend professional medical care for serious symptoms
3. For any life-threatening emergency, immediately direct the worker to call 108 (emergency)
4. Always include the disclaimer: "This information is for general guidance only and does not replace qualified medical care."
5. Be empathetic, clear, and simple — many workers have limited literacy

Salt pan health risks to know:
- Heat exhaustion / heat stroke (most common)
- Dehydration
- Salt water skin and eye irritation
- Musculoskeletal injuries from manual labour
- Respiratory issues from salt dust`;

export class HealthcareAgent implements Agent {
  type = 'healthcare' as const;
  name = 'Remote Healthcare Outreach Agent';
  description = 'Handles health queries, symptom guidance, camp registration, and healthcare requests';

  canHandle(intent: string, query: string): boolean {
    const keywords = ['sick', 'ill', 'pain', 'dizzy', 'nausea', 'health', 'hospital', 'doctor', 'camp', 'medicine',
      'symptom', 'fever', 'injury', 'eye', 'skin', 'rash', 'heat', 'vomit', 'headache', 'healthcare', 'medical',
      'બીમાર', 'દવાખાનુ', 'ડૉક્ટર', 'camp', 'treatment'];
    const q = query.toLowerCase();
    return keywords.some(k => q.includes(k)) || intent === 'healthcare';
  }

  async handle(query: string, context: AgentContext): Promise<AgentResponse> {
    const ai = getAIProvider();

    // Fetch relevant data to augment the response
    const camps = await healthcareRepo.findAllCamps();
    const activeCamps = camps.filter(c => c.isActive);
    const campInfo = activeCamps.map(c =>
      `- ${c.name} at ${c.location} on ${c.date} (${c.time}) | Services: ${c.services.join(', ')} | Contact: ${c.contact}`
    ).join('\n');

    const augmentedSystem = `${SYSTEM_PROMPT}

Available Healthcare Camps (current data):
${campInfo || 'No camps currently scheduled — check back soon.'}

Worker Context: ${context.worker ? `${context.worker.name}, ${context.worker.location}, Age ${context.worker.age}` : 'Unknown worker'}`;

    let message: string;
    try {
      message = await ai.chat([{ role: 'user', content: query }], augmentedSystem);
    } catch {
      message = `I'm here to help with your health concern. For immediate medical emergencies, please call 108.\n\nAvailable health camps:\n${campInfo || 'Please contact your coordinator for healthcare information.'}\n\n⚠️ This information is for general guidance only and does not replace qualified medical care.`;
    }

    return {
      message,
      agentType: 'healthcare',
      actions: activeCamps.length > 0 ? [{ label: 'View Health Camps', link: '/healthcare' }, { label: 'Submit Request', link: '/healthcare' }] : [{ label: 'Submit Healthcare Request', link: '/healthcare' }],
    };
  }
}
