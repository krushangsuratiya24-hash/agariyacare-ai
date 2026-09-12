import { Agent, AgentContext, AgentResponse } from './base.agent';
import { getAIProvider } from '../providers';
import { safetyRepo } from '../repositories';
import { SafetyReading, SafetyLevel } from '../types';

const SYSTEM_PROMPT = `You are the Worker Safety Monitoring Agent for AgariyaCare AI, dedicated to protecting Agariya salt pan workers in the Little Rann of Kutch from environmental and occupational hazards.

Your responsibilities:
- Assess current safety levels based on temperature, humidity, working duration, and conditions
- Provide clear, actionable safety recommendations
- Guide workers through incident reporting
- Issue alerts for dangerous conditions
- Educate workers on heat safety protocols

Safety calculation rules:
- Heat Index 27-32°C: CAUTION
- Heat Index 32-41°C: HIGH_RISK  
- Heat Index >41°C: EMERGENCY
- Add one level if water is unavailable or working >8 hours
- Add one level if breaks < 2 per 8-hour shift

IMPORTANT:
- Be direct and urgent for emergencies — worker safety is paramount
- Always include the emergency number: 108
- Give specific, actionable advice (not vague)
- For EMERGENCY level: recommend stopping work immediately`;

export class SafetyAgent implements Agent {
  type = 'safety' as const;
  name = 'Worker Safety Monitoring Agent';
  description = 'Monitors working conditions, assesses heat risk, and manages safety incidents';

  canHandle(intent: string, query: string): boolean {
    const keywords = ['safe', 'danger', 'heat', 'temperature', 'hot', 'emergency', 'water', 'dehydrat', 'dizzy',
      'faint', 'collapse', 'accident', 'incident', 'risk', 'alert', 'caution', 'report', 'unsafe',
      'સલામત', 'ગરમી', 'ઊકળ', 'ખતરો', 'emergency'];
    const q = query.toLowerCase();
    return keywords.some(k => q.includes(k)) || intent === 'safety';
  }

  async handle(query: string, context: AgentContext): Promise<AgentResponse> {
    const ai = getAIProvider();

    let currentReading: SafetyReading | null = null;
    if (context.workerId) {
      const readings = await safetyRepo.findReadings(context.workerId);
      if (readings.length > 0) {
        currentReading = readings.sort((a, b) =>
          (b.timestamp ?? b.recordedAt ?? '').localeCompare(a.timestamp ?? a.recordedAt ?? '')
        )[0];
      }
    }

    const alerts = await safetyRepo.findActiveAlerts();
    const alertInfo = alerts.map(a => `⚠️ [${a.type}] ${a.message}`).join('\n');

    const safetyContext = currentReading
      ? `Latest reading: Temp ${currentReading.temperature}°C, Humidity ${currentReading.humidity}%, Heat Index ${currentReading.heatIndex}°C, Working ${currentReading.workingDurationHours}h, Water: ${currentReading.waterAvailability}, Breaks: ${currentReading.restBreaksTaken}, Level: ${currentReading.safetyLevel}`
      : 'No current sensor readings available.';

    const augmentedSystem = `${SYSTEM_PROMPT}

Current Safety Status:
${safetyContext}

Active Alerts:
${alertInfo || 'No active alerts'}`;

    let message: string;
    try {
      message = await ai.chat([{ role: 'user', content: query }], augmentedSystem);
    } catch {
      message = `⚠️ Safety Advisory\n\n${alertInfo || 'Stay safe in extreme heat conditions.'}\n\n${safetyContext}\n\nFor emergencies, call 108 immediately.`;
    }

    const level = currentReading?.safetyLevel ?? 'CAUTION';
    const actions = level === 'EMERGENCY'
      ? [{ label: 'Call Emergency 108', link: 'tel:108' }, { label: 'Report Incident', link: '/safety' }]
      : level === 'HIGH_RISK'
        ? [{ label: 'Report Incident', link: '/safety' }, { label: 'View Safety', link: '/safety' }]
        : [{ label: 'View Safety', link: '/safety' }, { label: 'Report Incident', link: '/safety' }];

    return {
      message,
      agentType: 'safety',
      actions,
      data: { currentReading, alerts },
    };
  }

  // Static utility: calculate safety level from raw inputs
  static calculateSafetyLevel(
    temperature: number,
    humidity: number,
    workingHours: number,
    waterAvailability: 'SUFFICIENT' | 'LIMITED' | 'NONE',
    breaks: number
  ): { level: SafetyLevel; heatIndex: number; recommendations: string[] } {
    // Heat index approximation
    const hi = -8.78 + 1.61 * temperature + 2.34 * humidity
      - 0.146 * temperature * humidity
      - 0.0123 * temperature * temperature
      - 0.0164 * humidity * humidity
      + 0.00221 * temperature * temperature * humidity
      + 0.000725 * temperature * humidity * humidity
      - 0.00000358 * temperature * temperature * humidity * humidity;

    let baseLevel: SafetyLevel =
      hi >= 41 ? 'EMERGENCY' :
      hi >= 32 ? 'HIGH_RISK' :
      hi >= 27 ? 'CAUTION' : 'SAFE';

    // Escalation factors
    const levels: SafetyLevel[] = ['SAFE', 'CAUTION', 'HIGH_RISK', 'EMERGENCY'];
    let levelIdx = levels.indexOf(baseLevel);

    if (waterAvailability === 'NONE') levelIdx = Math.min(levelIdx + 2, 3);
    else if (waterAvailability === 'LIMITED') levelIdx = Math.min(levelIdx + 1, 3);
    if (workingHours >= 8 && breaks < 2) levelIdx = Math.min(levelIdx + 1, 3);

    const level = levels[levelIdx];

    const recommendations: string[] = [];
    if (level === 'EMERGENCY') {
      recommendations.push('STOP WORK IMMEDIATELY — seek shade and medical help');
      recommendations.push('Call 108 for emergency assistance');
      recommendations.push('Drink water slowly — do not gulp');
    } else if (level === 'HIGH_RISK') {
      recommendations.push('Reduce work intensity — take shade breaks');
      recommendations.push('Drink 250ml water every 20 minutes');
      recommendations.push('Take 15-minute rest every 45 minutes');
    } else if (level === 'CAUTION') {
      recommendations.push('Drink water every 30 minutes');
      recommendations.push('Take regular breaks in shade');
      recommendations.push('Wear light protective clothing');
    } else {
      recommendations.push('Normal precautions — stay hydrated');
    }

    return { level, heatIndex: Math.round(hi), recommendations };
  }
}
