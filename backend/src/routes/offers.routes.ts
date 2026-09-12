// Offers & transactions routes

import { Router, Request, Response } from 'express';
import {
  offerRepo, offerHistoryRepo, transactionRepo,
  saltListingRepo, saltInventoryRepo, notificationRepo,
} from '../repositories';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// ─── Offers ───────────────────────────────────────────────────────────────────

// GET /api/offers/my — all offers for authenticated user
router.get('/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { role, userId } = authReq.user!;

    const offers = role === 'BUYER' || (role as string) === 'buyer'
      ? await offerRepo.findByBuyerId(userId)
      : await offerRepo.findByWorkerId(userId);

    res.json({ success: true, data: offers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/offers/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const offer = await offerRepo.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });

    // Only buyer or worker on the offer can view
    const { userId } = authReq.user!;
    if (offer.buyerId !== userId && offer.workerId !== userId && authReq.user!.role !== 'ADMIN' && (authReq.user!.role as string) !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const history = await offerHistoryRepo.findByOfferId(req.params.id);
    res.json({ success: true, data: { offer, history } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/offers/listing/:listingId — offers on a listing
router.get('/listing/:listingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const listing = await saltListingRepo.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });

    if (listing.workerId !== authReq.user!.userId && authReq.user!.role !== 'ADMIN' && (authReq.user!.role as string) !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const offers = await offerRepo.findByListingId(req.params.listingId);
    res.json({ success: true, data: offers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/offers — buyer makes an offer
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user!.role !== 'BUYER' && (authReq.user!.role as string) !== 'buyer') {
      return res.status(403).json({ success: false, error: 'Only buyers can make offers' });
    }

    const { listingId, quantityKg, pricePerKg, message } = req.body;
    if (!listingId || !quantityKg || !pricePerKg) {
      return res.status(400).json({ success: false, error: 'listingId, quantityKg, pricePerKg are required' });
    }

    const listing = await saltListingRepo.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Listing is not active' });
    }

    const qty = Number(quantityKg);
    const price = Number(pricePerKg);

    const offer = await offerRepo.create({
      listingId,
      buyerId: authReq.user!.userId,
      workerId: listing.workerId,
      quantityKg: qty,
      pricePerKg: price,
      totalAmount: qty * price,
      message,
      status: 'PENDING',
    });

    // Record history
    await offerHistoryRepo.create({
      offerId: offer.id,
      actorId: authReq.user!.userId,
      actorRole: 'buyer',
      eventType: 'OFFER',
      pricePerKg: price,
      quantityKg: qty,
      message,
    });

    // Listing remains ACTIVE while offer is pending
    // (will be set to SOLD only when offer is accepted)

    // Notify worker
    await notificationRepo.create({
      userId: listing.workerId,
      type: 'NEW_OFFER',
      category: 'MARKET',
      title: 'New Offer Received',
      message: `You received an offer of ₹${price}/kg for ${qty.toLocaleString('en-IN')} kg of salt.`,
      isRead: false,
      link: `/offers/${offer.id}`,
      refId: offer.id,
    });

    res.status(201).json({ success: true, data: offer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/offers/:id/counter — worker counter-offers
router.post('/:id/counter', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const offer = await offerRepo.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });

    if (offer.workerId !== authReq.user!.userId && offer.buyerId !== authReq.user!.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { pricePerKg, quantityKg, message } = req.body;
    if (!pricePerKg) return res.status(400).json({ success: false, error: 'pricePerKg required' });

    const newPrice = Number(pricePerKg);
    const newQty = quantityKg ? Number(quantityKg) : offer.quantityKg;
    const actorRole = authReq.user!.userId === offer.workerId ? 'worker' : 'buyer';
    const targetUserId = actorRole === 'worker' ? offer.buyerId : offer.workerId;

    const updated = await offerRepo.update(req.params.id, {
      pricePerKg: newPrice,
      quantityKg: newQty,
      totalAmount: newQty * newPrice,
      status: 'COUNTERED',
      message,
    });

    await offerHistoryRepo.create({
      offerId: req.params.id,
      actorId: authReq.user!.userId,
      actorRole,
      eventType: 'COUNTER',
      pricePerKg: newPrice,
      quantityKg: newQty,
      message,
    });

    await notificationRepo.create({
      userId: targetUserId,
      type: 'COUNTER_OFFER',
      category: 'MARKET',
      title: 'Counter-Offer Received',
      message: `A counter-offer of ₹${newPrice}/kg has been made for your salt.`,
      isRead: false,
      link: `/offers/${req.params.id}`,
      refId: req.params.id,
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/offers/:id/accept — worker or buyer accepts
router.post('/:id/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const offer = await offerRepo.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });

    const { userId, role } = authReq.user!;
    if (offer.workerId !== userId && offer.buyerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const actorRole = userId === offer.workerId ? 'worker' : 'buyer';

    // Accept offer
    const updatedOffer = await offerRepo.update(req.params.id, { status: 'ACCEPTED' });

    await offerHistoryRepo.create({
      offerId: req.params.id,
      actorId: userId,
      actorRole,
      eventType: 'ACCEPT',
      pricePerKg: offer.pricePerKg,
      quantityKg: offer.quantityKg,
      message: req.body.message,
    });

    // Create transaction
    const listing = await saltListingRepo.findById(offer.listingId);
    const txRef = await transactionRepo.getNextRef();

    const transaction = await transactionRepo.create({
      transactionRef: txRef,
      listingId: offer.listingId,
      offerId: req.params.id,
      sellerId: offer.workerId,
      buyerId: offer.buyerId,
      saltTypeId: listing?.saltTypeId ?? '',
      saltGradeId: listing?.saltGradeId ?? '',
      quantityKg: offer.quantityKg,
      agreedPricePerKg: offer.pricePerKg,
      totalAmount: offer.totalAmount,
      status: 'PENDING_PAYMENT',
    });

    // Update listing status to SOLD
    await saltListingRepo.update(offer.listingId, { status: 'SOLD' });

    // Update inventory: move from available to sold
    if (listing?.inventoryId) {
      await saltInventoryRepo.adjustQuantity(
        listing.inventoryId,
        -offer.quantityKg, // reduce available
        0,
        +offer.quantityKg  // increase sold
      );
    }

    // Notify both parties
    const targetUserId = actorRole === 'worker' ? offer.buyerId : offer.workerId;
    await notificationRepo.create({
      userId: targetUserId,
      type: 'OFFER_ACCEPTED',
      category: 'MARKET',
      title: 'Offer Accepted',
      message: `The offer has been accepted. Transaction ${txRef} has been created.`,
      isRead: false,
      link: `/transactions/${transaction.id}`,
      refId: transaction.id,
    });

    await notificationRepo.create({
      userId: userId,
      type: 'TRANSACTION_CONFIRMED',
      category: 'MARKET',
      title: 'Transaction Confirmed',
      message: `Transaction ${txRef} for ₹${offer.totalAmount.toLocaleString('en-IN')} has been confirmed.`,
      isRead: false,
      link: `/transactions/${transaction.id}`,
      refId: transaction.id,
    });

    res.json({ success: true, data: { offer: updatedOffer, transaction } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/offers/:id/reject
router.post('/:id/reject', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const offer = await offerRepo.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });

    const { userId } = authReq.user!;
    if (offer.workerId !== userId && offer.buyerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const actorRole = userId === offer.workerId ? 'worker' : 'buyer';
    const updatedOffer = await offerRepo.update(req.params.id, { status: 'REJECTED' });

    await offerHistoryRepo.create({
      offerId: req.params.id,
      actorId: userId,
      actorRole,
      eventType: 'REJECT',
      pricePerKg: offer.pricePerKg,
      quantityKg: offer.quantityKg,
      message: req.body.message,
    });

    // Revert listing to ACTIVE if rejected
    await saltListingRepo.update(offer.listingId, { status: 'ACTIVE' });

    const targetUserId = actorRole === 'worker' ? offer.buyerId : offer.workerId;
    await notificationRepo.create({
      userId: targetUserId,
      type: 'OFFER_REJECTED',
      category: 'MARKET',
      title: 'Offer Rejected',
      message: `The offer of ₹${offer.pricePerKg}/kg has been rejected.`,
      isRead: false,
      link: `/offers/${req.params.id}`,
      refId: req.params.id,
    });

    res.json({ success: true, data: updatedOffer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Transactions ─────────────────────────────────────────────────────────────

router.get('/transactions/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, role } = authReq.user!;
    const transactions = (role === 'BUYER' || (role as string) === 'buyer')
      ? await transactionRepo.findByBuyerId(userId)
      : await transactionRepo.findBySellerId(userId);
    res.json({ success: true, data: transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/transactions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tx = await transactionRepo.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });

    const { userId, role } = authReq.user!;
    if (tx.sellerId !== userId && tx.buyerId !== userId && role !== 'ADMIN' && (role as string) !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: tx });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
