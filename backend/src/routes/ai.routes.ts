/**
 * Phase 4 — AI Assistant API Routes
 *
 * POST /api/ai/chat                           — send a message
 * GET  /api/ai/status                         — provider status
 * GET  /api/ai/conversations                  — list user's conversations
 * POST /api/ai/conversations                  — create empty conversation
 * GET  /api/ai/conversations/:id/messages     — get messages in conversation
 * PATCH /api/ai/conversations/:id             — update conversation title
 * DELETE /api/ai/conversations/:id            — archive/delete conversation
 *
 * All conversation endpoints require authentication.
 * AI chat works for authenticated users (with context) or guests (no context).
 */

import { Router, Request, Response } from 'express';
import { orchestrator } from '../agents/orchestrator';
import { ChatRequest } from '../types';
import { getAIProvider } from '../providers';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { chatRepo } from '../repositories';

const router = Router();

// ── Provider status ───────────────────────────────────────────────────────────

router.get('/status', (_req, res) => {
  const provider = getAIProvider();
  res.json({
    success: true,
    data: {
      providerName: provider.providerName(),
      isAvailable: provider.isAvailable(),
      mode: provider.providerName().includes('Development') ? 'development' : 'production',
      isConfigured: provider.isAvailable(),
    },
  });
});

// ── Chat endpoint ─────────────────────────────────────────────────────────────

router.post('/chat', optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { message, conversationHistory, language, conversationId } = req.body as ChatRequest;

  // Input validation
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'message is required' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ success: false, error: 'Message too long (max 2000 characters)' });
  }
  if (language && !['en', 'gu'].includes(language)) {
    return res.status(400).json({ success: false, error: 'language must be "en" or "gu"' });
  }

  const userId = authReq.user?.userId;
  const userRole = authReq.user?.role;

  try {
    const response = await orchestrator.process({
      message: message.trim(),
      userId,
      workerId: userId,
      conversationHistory: conversationHistory ?? [],
      language: (language as 'en' | 'gu') ?? 'en',
      conversationId,
      userRole,
    });

    // Persist messages if user is authenticated
    if (userId) {
      let convId = conversationId;

      if (!convId) {
        // Create a new conversation with the first ~60 chars as title
        const conv = await chatRepo.createConversation({
          userId,
          title: message.trim().slice(0, 60),
          isArchived: false,
        });
        convId = conv.id;
      }

      // Prevent injection: content stored as-is but tool access is role-gated
      await chatRepo.createMessage({
        conversationId: convId,
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
      });

      await chatRepo.createMessage({
        conversationId: convId,
        role: 'assistant',
        content: response.message,
        agentUsed: response.agentsUsed,
        actions: response.actions,
        timestamp: response.timestamp,
      });

      return res.json({
        success: true,
        data: {
          ...response,
          conversationId: convId,
        },
      });
    }

    return res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('[AI Chat Error]', error?.message ?? error);
    return res.status(503).json({
      success: false,
      error: 'AgariyaCare AI is temporarily unavailable. Please check your AI configuration or try again.',
    });
  }
});

// ── Conversation management ───────────────────────────────────────────────────

// List conversations
router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const conversations = await chatRepo.findConversationsByUserId(authReq.user!.userId);
    return res.json({ success: true, data: conversations });
  } catch (err: any) {
    console.error('[AI Conversations Error]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to load conversations' });
  }
});

// Create empty conversation
router.post('/conversations', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { title } = req.body;
  try {
    const conv = await chatRepo.createConversation({
      userId: authReq.user!.userId,
      title: (title ?? 'New Conversation').slice(0, 100),
      isArchived: false,
    });
    return res.status(201).json({ success: true, data: conv });
  } catch (err: any) {
    console.error('[AI Create Conversation Error]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const conv = await chatRepo.findConversationById(req.params.id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    // Enforce ownership — never allow cross-user access
    if (conv.userId !== authReq.user!.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const messages = await chatRepo.findMessagesByConversationId(req.params.id);
    return res.json({ success: true, data: messages });
  } catch (err: any) {
    console.error('[AI Messages Error]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
});

// Update conversation title
router.patch('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { title } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ success: false, error: 'title is required' });
  }
  try {
    const conv = await chatRepo.findConversationById(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (conv.userId !== authReq.user!.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const updated = await chatRepo.updateConversation(req.params.id, {
      title: title.slice(0, 100),
    });
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update conversation' });
  }
});

// Archive/delete a conversation
router.delete('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const conv = await chatRepo.findConversationById(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (conv.userId !== authReq.user!.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    // Archive rather than hard-delete to preserve audit trail
    await chatRepo.updateConversation(req.params.id, { isArchived: true });
    return res.json({ success: true, data: { archived: true } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete conversation' });
  }
});

export default router;
