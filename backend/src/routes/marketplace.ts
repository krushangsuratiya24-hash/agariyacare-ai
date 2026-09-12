import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  // Inventory
  getInventory, createInventory, updateInventory, deleteInventory, inventoryValidation,
  // Listings
  getListings, getListingById, getMyListings, createListing, updateListing, listingValidation,
  // Buyer requests
  getBuyerRequests, getMyBuyerRequests, createBuyerRequest, updateBuyerRequest, buyerRequestValidation,
  // Saved
  getSavedListings, saveListing, unsaveListing,
  // Matching
  getMatchesForListing, getMatchesForRequest,
  // Dashboard stats
  getWorkerDashboardStats, getBuyerDashboardStats,
} from '../controllers/marketplaceController';

const router = Router();

// ── Public / authenticated browsing ──────────────────────────────────────────
// Listings are publicly browsable; saving requires auth
router.get('/listings',     getListings);
router.get('/listings/:id', authenticate, getListingById);

// Buyer requests visible to all authenticated users (workers need to discover them)
router.get('/buyer-requests', authenticate, getBuyerRequests);

// ── Worker-only: inventory ────────────────────────────────────────────────────
router.get('/inventory',       authenticate, authorize('AGARIYA_WORKER'), getInventory);
router.post('/inventory',      authenticate, authorize('AGARIYA_WORKER'), inventoryValidation, createInventory);
router.patch('/inventory/:id', authenticate, authorize('AGARIYA_WORKER'), inventoryValidation, updateInventory);
router.delete('/inventory/:id',authenticate, authorize('AGARIYA_WORKER'), deleteInventory);

// ── Worker-only: listings management ─────────────────────────────────────────
router.get('/my-listings',     authenticate, authorize('AGARIYA_WORKER'), getMyListings);
router.post('/listings',       authenticate, authorize('AGARIYA_WORKER'), listingValidation, createListing);
router.patch('/listings/:id',  authenticate, authorize('AGARIYA_WORKER'), updateListing);

// ── Buyer-only: requests ──────────────────────────────────────────────────────
router.get('/buyer-requests/mine', authenticate, authorize('BUYER'), getMyBuyerRequests);
router.post('/buyer-requests',     authenticate, authorize('BUYER'), buyerRequestValidation, createBuyerRequest);
router.patch('/buyer-requests/:id',authenticate, authorize('BUYER'), updateBuyerRequest);

// ── Buyer-only: saved listings ────────────────────────────────────────────────
router.get('/saved',            authenticate, authorize('BUYER'), getSavedListings);
router.post('/saved/:id',       authenticate, authorize('BUYER'), saveListing);
router.delete('/saved/:id',     authenticate, authorize('BUYER'), unsaveListing);

// ── Matching (authenticated, any role) ───────────────────────────────────────
router.get('/matches/listing/:id', authenticate, getMatchesForListing);
router.get('/matches/request/:id', authenticate, getMatchesForRequest);

// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get('/stats/worker', authenticate, authorize('AGARIYA_WORKER'), getWorkerDashboardStats);
router.get('/stats/buyer',  authenticate, authorize('BUYER'),          getBuyerDashboardStats);

export default router;
