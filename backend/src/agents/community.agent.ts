import { Agent, AgentContext, AgentResponse } from './base.agent';
import { getAIProvider } from '../providers';
import { communityRepo } from '../repositories';

const SYSTEM_PROMPT = `You are the Community Support Agent for AgariyaCare AI, helping Agariya salt pan workers access community resources, announcements, and support services.

Your responsibilities:
- Share relevant community notices and announcements
- Help workers submit support requests
- Connect workers with welfare camps and community events
- Provide information about coordinator contacts
- Foster community solidarity and mutual support

Be warm, supportive, and encouraging. Workers may be facing difficult conditions.`;

export class CommunityAgent implements Agent {
  type = 'community' as const;
  name = 'Community Support Agent';
  description = 'Handles community notices, support requests, and announcements';

  canHandle(intent: string, query: string): boolean {
    const keywords = ['community', 'notice', 'announce', 'camp', 'support', 'help', 'event', 'meeting',
      'coordinator', 'contact', 'news', 'update', 'information', 'message',
      'સમુદાય', 'સૂચના', 'મદદ'];
    const q = query.toLowerCase();
    return keywords.some(k => q.includes(k)) || intent === 'community';
  }

  async handle(query: string, context: AgentContext): Promise<AgentResponse> {
    const ai = getAIProvider();

    const notices = await communityRepo.findAllNotices(true);
    const recentNotices = notices
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);

    const noticeInfo = recentNotices.map(n =>
      `- [${n.category}] ${n.title}: ${n.content.substring(0, 120)}...`
    ).join('\n');

    const augmentedSystem = `${SYSTEM_PROMPT}

Recent Community Notices:
${noticeInfo || 'No recent notices.'}`;

    let message: string;
    try {
      message = await ai.chat([{ role: 'user', content: query }], augmentedSystem);
    } catch {
      message = `Recent Community Updates:\n\n${recentNotices.map(n =>
        `📢 **${n.title}** [${n.category}]\n${n.content.substring(0, 200)}...`
      ).join('\n\n')}\n\nVisit the Community section for full details and to submit a support request.`;
    }

    return {
      message,
      agentType: 'community',
      actions: [{ label: 'View Notices', link: '/community' }, { label: 'Submit Support Request', link: '/community' }],
    };
  }
}
