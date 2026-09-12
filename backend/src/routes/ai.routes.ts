import { Router, Request, Response } from 'express';
import { orchestrator } from '../agents/orchestrator';
import { ChatRequest } from '../types';
import { getAIProvider } from '../providers';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { chatRepo } from '../repositories';

const router = Router();

// GET /api/ai/status
router.get('/status', (req, res) => {
  const provider = getAIProvider();
  res.json({
    success: true,
    data: {
      providerName: provider.providerName(),
      isAvailable: provider.isAvailable(),
      mode: provider.providerName().includes('Development') ? 'development' : 'production',
    },
  });
});

// POST /api/ai/chat
router.post('/chat', optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { message, conversationHistory, language, conversationId } = req.body as ChatRequest;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'message is required' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ success: false, error: 'Message too long (max 2000 characters)' });
  }

  const userId = authReq.user?.userId;

  try {
    const response = await orchestrator.process({
      message: message.trim(),
      userId,
      workerId: userId,
      conversationHistory,
      language: language ?? 'en',
      conversationId,
    });

    // Persist messages if user authenticated
    if (userId) {
      let convId = conversationId;
      if (!convId) {
        // Create new conversation
        const conv = await chatRepo.createConversation({
          userId,
          title: message.slice(0, 60),
          isArchived: false,
        });
        convId = conv.id;
      }
      // Save user message
      await chatRepo.createMessage({
        conversationId: convId,
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
      });
      // Save assistant message
      await chatRepo.createMessage({
        conversationId: convId,
        role: 'assistant',
        content: response.message,
        agentUsed: response.agentsUsed,
        actions: response.actions,
        timestamp: response.timestamp,
      });

      res.json({ success: true, data: { ...response, conversationId: convId } });
    } else {
      res.json({ success: true, data: response });
    }
  } catch (error) {
    console.error('[AI Chat Error]', error);
    res.status(503).json({
      success: false,
      error: 'AgariyaCare AI is temporarily unavailable. Please try again.',
    });
  }
});

// GET /api/ai/conversations
router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const conversations = await chatRepo.findConversationsByUserId(authReq.user!.userId);
    res.json({ success: true, data: conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ai/conversations/:id/messages
router.get('/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const conv = await chatRepo.findConversationById(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (conv.userId !== authReq.user!.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const messages = await chatRepo.findMessagesByConversationId(req.params.id);
    res.json({ success: true, data: messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
