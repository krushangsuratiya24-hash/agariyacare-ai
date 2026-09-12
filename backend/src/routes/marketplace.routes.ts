// Salt Marketplace routes — inventory, listings, buyer requests, salt types

import { Router, Request, Response } from 'express';
import {
  saltInventoryRepo, saltListingRepo, buyerRequestRepo,
  saltClassRepo, savedListingRepo, notificationRepo,
} from '../repositories';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// ─── Salt Types & Grades ──────────────────────────────────────────────────────

router.get('/salt-types', async (req, res) => {
  const types = await saltClassRepo.findAllTypes(true);
  res.json({ success: true, data: types });
});

router.get('/salt-grades', async (req, res) => {
  const { saltTypeId } = req.query;
  const grades = saltTypeId
    ? await saltClassRepo.findGradesByTypeId(saltTypeId as string)
    : await saltClassRepo.findAllGrades(true);
  res.json({ success: true, data: grades });
});

// ─── Salt Inventory ───────────────────────────────────────────────────────────

router.get('/inventory', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const inventory = await saltInventoryRepo.findByWorkerId(authReq.user!.userId);
    res.json({ success: true, data: inventory });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/inventory/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const item = await saltInventoryRepo.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found' });
    if (item.workerId !== authReq.user!.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/inventory', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const {
      saltTypeId, saltGradeId, totalQuantityKg, location,
      expectedPricePerKg, qualityNotes, productionDate, images,
    } = req.body;

    if (!saltTypeId || !saltGradeId || !totalQuantityKg || !location || !expectedPricePerKg) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const item = await saltInventoryRepo.create({
      workerId: authReq.user!.userId,
      saltTypeId,
      saltGradeId,
      totalQuantityKg: Number(totalQuantityKg),
      availableQuantityKg: Number(totalQuantityKg),
      reservedQuantityKg: 0,
      soldQuantityKg: 0,
      location,
      expectedPricePerKg: Number(expectedPricePerKg),
      qualityNotes,
      productionDate,
      images: images ?? [],
      isArchived: false,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/inventory/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const item = await saltInventoryRepo.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    if (item.workerId !== authReq.user!.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const updated = await saltInventoryRepo.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Salt Listings ────────────────────────────────────────────────────────────

// GET /api/marketplace/listings — public marketplace
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const { saltTypeId, saltGradeId, status, district, minQuantityKg, maxPricePerKg, search, sort } = req.query;
    const listings = await saltListingRepo.findAll({
      saltTypeId: saltTypeId as string,
      saltGradeId: saltGradeId as string,
      status: (status as string) || 'ACTIVE',
      district: district as string,
      minQuantityKg: minQuantityKg ? Number(minQuantityKg) : undefined,
      maxPricePerKg: maxPricePerKg ? Number(maxPricePerKg) : undefined,
      search: search as string,
    });

    let sorted = [...listings];
    if (sort === 'price_asc') sorted.sort((a, b) => a.askingPricePerKg - b.askingPricePerKg);
    else if (sort === 'price_desc') sorted.sort((a, b) => b.askingPricePerKg - a.askingPricePerKg);
    else if (sort === 'quantity_desc') sorted.sort((a, b) => b.quantityKg - a.quantityKg);
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({ success: true, data: sorted, total: sorted.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/marketplace/my-listings — worker's own listings
router.get('/my-listings', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const listings = await saltListingRepo.findByWorkerId(authReq.user!.userId);
    res.json({ success: true, data: listings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/marketplace/listings/:id
router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const listing = await saltListingRepo.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    await saltListingRepo.incrementView(req.params.id);
    res.json({ success: true, data: listing });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/marketplace/listings
router.post('/listings', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const {
      inventoryId, saltTypeId, saltGradeId, quantityKg, askingPricePerKg,
      qualityDescription, pickupLocation, district, availableFrom,
      availableUntil, deliveryNotes, images, status = 'DRAFT',
    } = req.body;

    if (!saltTypeId || !saltGradeId || !quantityKg || !askingPricePerKg || !pickupLocation || !district || !availableFrom) {
      return res.status(400).json({ success: false, error: 'Missing required listing fields' });
    }

    const listing = await saltListingRepo.create({
      workerId: authReq.user!.userId,
      inventoryId: inventoryId || '',
      saltTypeId,
      saltGradeId,
      quantityKg: Number(quantityKg),
      askingPricePerKg: Number(askingPricePerKg),
      qualityDescription,
      pickupLocation,
      district,
      availableFrom,
      availableUntil,
      deliveryNotes,
      images: images ?? [],
      status,
    });

    res.status(201).json({ success: true, data: listing });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/marketplace/listings/:id
router.put('/listings/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const listing = await saltListingRepo.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, error: 'Not found' });
    if (listing.workerId !== authReq.user!.userId && authReq.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const updated = await saltListingRepo.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Buyer Requests / Demand ──────────────────────────────────────────────────

// GET /api/marketplace/buyer-requests — all open demands (workers can discover)
router.get('/buyer-requests', async (req: Request, res: Response) => {
  try {
    const { saltTypeId, status, district } = req.query;
    const requests = await buyerRequestRepo.findAll({
      saltTypeId: saltTypeId as string,
      status: (status as string) || 'OPEN',
      district: district as string,
    });
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/marketplace/my-buyer-requests — buyer's own demands
router.get('/my-buyer-requests', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const requests = await buyerRequestRepo.findByBuyerId(authReq.user!.userId);
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/marketplace/buyer-requests
router.post('/buyer-requests', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const {
      saltTypeId, saltGradeId, quantityKg, targetPricePerKg,
      requiredByDate, location, district, qualityRequirements, additionalNotes,
    } = req.body;

    if (!saltTypeId || !quantityKg || !location || !district) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const request = await buyerRequestRepo.create({
      buyerId: authReq.user!.userId,
      saltTypeId,
      saltGradeId,
      quantityKg: Number(quantityKg),
      targetPricePerKg: targetPricePerKg ? Number(targetPricePerKg) : undefined,
      requiredByDate,
      location,
      district,
      qualityRequirements,
      additionalNotes,
      status: 'OPEN',
    });

    res.status(201).json({ success: true, data: request });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/marketplace/buyer-requests/:id
router.put('/buyer-requests/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const existing = await buyerRequestRepo.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });
    if (existing.buyerId !== authReq.user!.userId && authReq.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const updated = await buyerRequestRepo.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Saved Listings ───────────────────────────────────────────────────────────

router.get('/saved', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const saved = await savedListingRepo.findByUserId(authReq.user!.userId);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/saved/:listingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const saved = await savedListingRepo.save(authReq.user!.userId, req.params.listingId);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/saved/:listingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await savedListingRepo.unsave(authReq.user!.userId, req.params.listingId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Market Price Intelligence ────────────────────────────────────────────────

router.get('/market-prices', async (req: Request, res: Response) => {
  try {
    const { saltTypeId, saltGradeId } = req.query;
    const prices = await saltClassRepo.findAllGrades(true);
    const marketPrices = await Promise.all(prices.map(async (grade) => {
      return {
        gradeId: grade.id,
        gradeName: grade.name,
        saltTypeId: grade.saltTypeId,
        referenceMin: grade.typicalPriceRangeMin,
        referenceMax: grade.typicalPriceRangeMax,
        referenceMid: ((grade.typicalPriceRangeMin + grade.typicalPriceRangeMax) / 2).toFixed(2),
        dataStatus: 'INDICATIVE',
        source: 'Platform Reference Data',
        note: 'These are indicative reference values. Actual market prices may vary.',
        updatedAt: new Date().toISOString(),
      };
    }));
    res.json({ success: true, data: marketPrices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Match buyer requests with worker's inventory ─────────────────────────────

router.get('/matches', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.userId;
    const role = authReq.user!.role;

    if (role === 'worker') {
      // Find buyer requests matching worker's inventory
      const [inventory, buyerRequests] = await Promise.all([
        saltInventoryRepo.findByWorkerId(userId),
        buyerRequestRepo.findAll({ status: 'OPEN' }),
      ]);

      const matches = buyerRequests.map(req => {
        const matchingInventory = inventory.filter(inv =>
          inv.saltTypeId === req.saltTypeId &&
          (!req.saltGradeId || inv.saltGradeId === req.saltGradeId) &&
          inv.availableQuantityKg >= req.quantityKg * 0.5
        );

        if (matchingInventory.length === 0) return null;

        const bestMatch = matchingInventory[0];
        const quantityScore = bestMatch.availableQuantityKg >= req.quantityKg ? 100 : 60;
        const priceScore = req.targetPricePerKg
          ? (req.targetPricePerKg >= bestMatch.expectedPricePerKg ? 100 : 50)
          : 75;
        const score = (quantityScore + priceScore) / 2;

        return {
          buyerRequest: req,
          matchScore: score,
          matchLevel: score >= 80 ? 'GOOD_MATCH' : 'POSSIBLE_MATCH',
          matchingInventory: bestMatch,
        };
      }).filter(Boolean);

      res.json({ success: true, data: matches });
    } else if (role === 'buyer') {
      // Find listings matching buyer's requests
      const [buyerRequests, listings] = await Promise.all([
        buyerRequestRepo.findByBuyerId(userId),
        saltListingRepo.findAll({ status: 'ACTIVE' }),
      ]);

      const matches = buyerRequests.flatMap(bReq =>
        listings
          .filter(lst =>
            lst.saltTypeId === bReq.saltTypeId &&
            (!bReq.saltGradeId || lst.saltGradeId === bReq.saltGradeId) &&
            lst.quantityKg >= bReq.quantityKg * 0.5
          )
          .map(lst => ({
            buyerRequest: bReq,
            listing: lst,
            matchLevel: lst.quantityKg >= bReq.quantityKg ? 'GOOD_MATCH' : 'POSSIBLE_MATCH',
            priceComparison: bReq.targetPricePerKg
              ? { targetPrice: bReq.targetPricePerKg, listingPrice: lst.askingPricePerKg, diff: lst.askingPricePerKg - bReq.targetPricePerKg }
              : null,
          }))
      );

      res.json({ success: true, data: matches });
    } else {
      res.json({ success: true, data: [] });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
