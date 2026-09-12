import { Router } from 'express';
import { marketPriceRepo } from '../repositories';
import { PriceComparison } from '../types';

const router = Router();

// GET /api/market/prices
router.get('/prices', async (req, res) => {
  const { saltType, location } = req.query;
  const prices = await marketPriceRepo.findAllPrices({
    saltType: saltType as string | undefined,
    location: location as string | undefined,
  });
  res.json({ success: true, data: prices });
});

// GET /api/market/prices/latest
router.get('/prices/latest', async (req, res) => {
  const prices = await marketPriceRepo.getLatestPrices();
  res.json({ success: true, data: prices });
});

// GET /api/market/trends
router.get('/trends', async (req, res) => {
  const days = parseInt(req.query.days as string || '7', 10);
  const trend = await marketPriceRepo.getPriceTrend(days);
  res.json({ success: true, data: trend });
});

// POST /api/market/compare
router.post('/compare', async (req, res) => {
  const { quantity, buyerOffer } = req.body;

  if (!quantity || !buyerOffer || quantity <= 0 || buyerOffer <= 0) {
    return res.status(400).json({ success: false, error: 'quantity and buyerOffer must be positive numbers' });
  }

  const latest = await marketPriceRepo.getLatestPrices();
  if (latest.length === 0) {
    return res.status(503).json({ success: false, error: 'Market data temporarily unavailable' });
  }

  // Use Grade A Common Salt as reference
  const gradeA = latest.find(p => p.qualityGrade === 'Grade A' && p.saltType === 'Common Salt') ?? latest[0];
  const referencePrice = gradeA.pricePerTonne ?? gradeA.pricePerKg ?? 0;

  const offerValue = quantity * buyerOffer;
  const referenceValue = quantity * referencePrice;
  const difference = offerValue - referenceValue;
  const percentageDifference = referencePrice > 0
    ? ((buyerOffer - referencePrice) / referencePrice) * 100
    : 0;

  const comparison: PriceComparison = {
    quantity,
    buyerOffer,
    referencePrice,
    offerValue,
    referenceValue,
    difference,
    percentageDifference: Math.round(percentageDifference * 10) / 10,
    assessment: percentageDifference >= -5
      ? 'FAIR'
      : 'BELOW_MARKET',
  };

  res.json({
    success: true,
    data: comparison,
    disclaimer: 'Reference prices are from development data and may not represent official market prices.',
  });
});

export default router;
