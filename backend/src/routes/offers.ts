/**
 * Offers & Transactions Routes — Phase 3
 * Uses real PostgreSQL via offersController.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  makeOffer, makeOfferValidation,
  getMyOffers,
  getOfferById,
  getOffersForListing,
  counterOffer, counterOfferValidation,
  acceptOffer,
  rejectOffer,
  withdrawOffer,
  getMyTransactions,
  getTransactionById,
  updateTransactionStatus,
  getWorkerOfferStats,
  getBuyerOfferStats,
} from '../controllers/offersController';

const router = Router();

// ── Offer stats ───────────────────────────────────────────────────────────────
router.get('/stats/worker', authenticate, authorize('AGARIYA_WORKER'), getWorkerOfferStats);
router.get('/stats/buyer',  authenticate, authorize('BUYER'),          getBuyerOfferStats);

// ── My offers (both roles) ────────────────────────────────────────────────────
router.get('/my', authenticate, getMyOffers);

// ── Offers on a specific listing (worker only) ────────────────────────────────
router.get('/listing/:listingId', authenticate, getOffersForListing);

// ── Single offer ──────────────────────────────────────────────────────────────
router.get('/:id', authenticate, getOfferById);

// ── Create offer (buyer only) ─────────────────────────────────────────────────
router.post('/', authenticate, authorize('BUYER'), makeOfferValidation, makeOffer);

// ── Offer actions ─────────────────────────────────────────────────────────────
router.post('/:id/counter',  authenticate, counterOfferValidation, counterOffer);
router.post('/:id/accept',   authenticate, acceptOffer);
router.post('/:id/reject',   authenticate, rejectOffer);
router.post('/:id/withdraw', authenticate, authorize('BUYER'), withdrawOffer);

// ── Transactions ──────────────────────────────────────────────────────────────
router.get('/transactions/my',  authenticate, getMyTransactions);
router.get('/transactions/:id', authenticate, getTransactionById);
router.patch('/transactions/:id/status', authenticate, updateTransactionStatus);

export default router;
