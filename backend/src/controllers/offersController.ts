/**
 * Offers & Transactions Controller — Phase 3
 *
 * Real PostgreSQL implementation. No in-memory stores.
 * All financial values computed server-side.
 * All operations guarded by auth + ownership checks.
 * Accept-offer uses a PostgreSQL transaction for atomicity.
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, getClient } from '../db/pool';

// ── Helpers ───────────────────────────────────────────────────────────────────

function validationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

const VALID_OFFER_STATUSES = ['PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'CANCELLED'];
const VALID_TX_STATUSES    = ['AGREED', 'PROCESSING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED'];

// Allowed state transitions per actor role
const TX_TRANSITIONS: Record<string, Record<string, string[]>> = {
  AGARIYA_WORKER: {
    AGREED:             ['PROCESSING'],
    PROCESSING:         ['READY_FOR_DISPATCH'],
    READY_FOR_DISPATCH: ['DISPATCHED'],
    DISPATCHED:         ['DELIVERED'],  // mark delivered
    DELIVERED:          ['COMPLETED'],
    COMPLETED:          [],
    CANCELLED:          [],
    DISPUTED:           [],
  },
  BUYER: {
    AGREED:             [],
    PROCESSING:         [],
    READY_FOR_DISPATCH: [],
    DISPATCHED:         [],
    DELIVERED:          ['COMPLETED', 'DISPUTED'],
    COMPLETED:          [],
    CANCELLED:          [],
    DISPUTED:           [],
  },
  COORDINATOR: {
    DISPUTED: ['CANCELLED', 'COMPLETED'],
  },
  ADMIN: {
    AGREED:             VALID_TX_STATUSES,
    PROCESSING:         VALID_TX_STATUSES,
    READY_FOR_DISPATCH: VALID_TX_STATUSES,
    DISPATCHED:         VALID_TX_STATUSES,
    DELIVERED:          VALID_TX_STATUSES,
    COMPLETED:          VALID_TX_STATUSES,
    CANCELLED:          VALID_TX_STATUSES,
    DISPUTED:           VALID_TX_STATUSES,
  },
};

async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link: string,
  refId: string
) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, metadata, is_read)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [userId, type, title, body, JSON.stringify({ link, refId })]
    );
  } catch {
    // Notification failure must not break main flow
  }
}

async function getNextTxRef(client: any): Promise<string> {
  const result = await client.query(`SELECT nextval('transaction_ref_seq') AS val`);
  return `AC-${result.rows[0].val}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// OFFER VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

export const makeOfferValidation = [
  body('listing_id').isUUID().withMessage('Invalid listing ID'),
  body('quantity_kg').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  body('price_per_kg').isFloat({ min: 0.01 }).withMessage('Price must be positive'),
  body('message').optional().trim().isLength({ max: 1000 }),
];

export const counterOfferValidation = [
  body('quantity_kg').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  body('price_per_kg').isFloat({ min: 0.01 }).withMessage('Price must be positive'),
  body('message').optional().trim().isLength({ max: 1000 }),
];

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/offers — buyer makes an offer on a listing
// ══════════════════════════════════════════════════════════════════════════════

export const makeOffer = async (req: Request, res: Response): Promise<void> => {
  if (validationErrors(req, res)) return;

  const buyerId = req.user!.id;

  if (req.user!.role !== 'BUYER') {
    res.status(403).json({ success: false, error: 'Only buyers can make offers' });
    return;
  }

  const { listing_id, quantity_kg, price_per_kg, message } = req.body;
  const qty   = parseFloat(quantity_kg);
  const price = parseFloat(price_per_kg);

  try {
    // Verify listing
    const listingRes = await query(
      `SELECT id, worker_id, status, quantity_kg, price_per_kg FROM salt_listings WHERE id = $1`,
      [listing_id]
    );
    if (listingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Listing not found' });
      return;
    }
    const listing = listingRes.rows[0];

    if (listing.status !== 'ACTIVE') {
      res.status(400).json({ success: false, error: 'Listing is not active' });
      return;
    }
    if (listing.worker_id === buyerId) {
      res.status(400).json({ success: false, error: 'Cannot make an offer on your own listing' });
      return;
    }
    if (qty > parseFloat(listing.quantity_kg)) {
      res.status(400).json({ success: false, error: `Quantity exceeds available (${listing.quantity_kg} kg)` });
      return;
    }

    const totalAmount = qty * price;

    // Create offer
    const offerRes = await query(
      `INSERT INTO offers
         (listing_id, buyer_id, worker_id, from_user_id, to_user_id,
          quantity_kg, price_per_kg, total_amount, message, status)
       VALUES ($1,$2,$3,$2,$3,$4,$5,$6,$7,'PENDING')
       RETURNING *`,
      [listing_id, buyerId, listing.worker_id, qty, price, totalAmount, message || null]
    );
    const offer = offerRes.rows[0];

    // Record history
    await query(
      `INSERT INTO offer_history
         (offer_id, actor_id, actor_role, event_type, price_per_kg, quantity_kg, message)
       VALUES ($1,$2,'buyer','OFFER',$3,$4,$5)`,
      [offer.id, buyerId, price, qty, message || null]
    );

    // Notify worker
    await createNotification(
      listing.worker_id,
      'OFFER_RECEIVED',
      'New Offer Received',
      `A buyer offered ₹${price}/kg for ${qty.toLocaleString('en-IN')} kg of salt.`,
      `/offers/${offer.id}`,
      offer.id
    );

    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    console.error('Make offer error:', err);
    res.status(500).json({ success: false, error: 'Failed to create offer' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/offers — get offers for authenticated user
// ══════════════════════════════════════════════════════════════════════════════

export const getMyOffers = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const role   = req.user!.role;

  try {
    const result = await query(
      `SELECT
         o.*,
         l.salt_type, l.quality_grade, l.location AS listing_location,
         l.description AS listing_description, l.village, l.district,
         l.price_per_kg AS listing_price_per_kg, l.quantity_kg AS listing_quantity_kg,
         buyer.full_name  AS buyer_name,
         seller.full_name AS seller_name
       FROM offers o
       LEFT JOIN salt_listings l   ON l.id = o.listing_id
       LEFT JOIN users buyer       ON buyer.id = o.buyer_id
       LEFT JOIN users seller      ON seller.id = o.worker_id
       WHERE ${role === 'BUYER' ? 'o.buyer_id' : 'o.worker_id'} = $1
       ORDER BY o.updated_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get my offers error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch offers' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/offers/:id — get a single offer with history
// ══════════════════════════════════════════════════════════════════════════════

export const getOfferById = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const role   = req.user!.role;

  try {
    const offerRes = await query(
      `SELECT
         o.*,
         l.salt_type, l.quality_grade, l.location AS listing_location,
         l.description AS listing_description, l.village, l.district,
         l.price_per_kg AS listing_price_per_kg, l.quantity_kg AS listing_quantity_kg,
         buyer.full_name   AS buyer_name,
         buyer.avatar_url  AS buyer_avatar,
         seller.full_name  AS seller_name,
         seller.avatar_url AS seller_avatar
       FROM offers o
       LEFT JOIN salt_listings l   ON l.id = o.listing_id
       LEFT JOIN users buyer       ON buyer.id = o.buyer_id
       LEFT JOIN users seller      ON seller.id = o.worker_id
       WHERE o.id = $1`,
      [req.params.id]
    );

    if (offerRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }

    const offer = offerRes.rows[0];

    // Ownership check
    if (offer.buyer_id !== userId && offer.worker_id !== userId && role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // History
    const historyRes = await query(
      `SELECT oh.*, u.full_name AS actor_name
       FROM offer_history oh
       JOIN users u ON u.id = oh.actor_id
       WHERE oh.offer_id = $1
       ORDER BY oh.created_at ASC`,
      [req.params.id]
    );

    res.json({ success: true, data: { offer, history: historyRes.rows } });
  } catch (err) {
    console.error('Get offer by id error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch offer' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/offers/listing/:listingId — worker views offers on their listing
// ══════════════════════════════════════════════════════════════════════════════

export const getOffersForListing = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const role   = req.user!.role;

  try {
    const listingRes = await query(
      `SELECT id, worker_id FROM salt_listings WHERE id = $1`,
      [req.params.listingId]
    );
    if (listingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Listing not found' });
      return;
    }
    const listing = listingRes.rows[0];
    if (listing.worker_id !== userId && role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const result = await query(
      `SELECT
         o.*,
         u.full_name AS buyer_name,
         u.avatar_url AS buyer_avatar
       FROM offers o
       JOIN users u ON u.id = o.buyer_id
       WHERE o.listing_id = $1
       ORDER BY o.updated_at DESC`,
      [req.params.listingId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get offers for listing error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch offers' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/offers/:id/counter — either party counters
// ══════════════════════════════════════════════════════════════════════════════

export const counterOffer = async (req: Request, res: Response): Promise<void> => {
  if (validationErrors(req, res)) return;

  const userId = req.user!.id;
  const role   = req.user!.role;

  try {
    const offerRes = await query(
      `SELECT * FROM offers WHERE id = $1`,
      [req.params.id]
    );
    if (offerRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }
    const offer = offerRes.rows[0];

    // Ownership
    if (offer.buyer_id !== userId && offer.worker_id !== userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Valid states for counter
    if (!['PENDING', 'COUNTERED'].includes(offer.status)) {
      res.status(400).json({ success: false, error: `Cannot counter an offer with status ${offer.status}` });
      return;
    }

    // Determine actor role and target
    const isWorker   = offer.worker_id === userId;
    const actorRole  = isWorker ? 'worker' : 'buyer';
    const targetId   = isWorker ? offer.buyer_id : offer.worker_id;

    const newPrice = parseFloat(req.body.price_per_kg);
    const newQty   = parseFloat(req.body.quantity_kg) || parseFloat(offer.quantity_kg);
    const message  = req.body.message || null;

    // If worker is countering, validate quantity against listing
    if (isWorker) {
      const lstRes = await query(
        `SELECT quantity_kg FROM salt_listings WHERE id = $1`,
        [offer.listing_id]
      );
      if (lstRes.rows.length > 0 && newQty > parseFloat(lstRes.rows[0].quantity_kg)) {
        res.status(400).json({ success: false, error: 'Counter quantity exceeds available listing quantity' });
        return;
      }
    }

    const newTotal = newPrice * newQty;

    // Update offer
    const updated = await query(
      `UPDATE offers SET
         price_per_kg = $1,
         quantity_kg  = $2,
         total_amount = $3,
         message      = $4,
         status       = 'COUNTERED',
         updated_at   = NOW()
       WHERE id = $5
       RETURNING *`,
      [newPrice, newQty, newTotal, message, req.params.id]
    );

    // History entry
    await query(
      `INSERT INTO offer_history
         (offer_id, actor_id, actor_role, event_type, price_per_kg, quantity_kg, message)
       VALUES ($1,$2,$3,'COUNTER',$4,$5,$6)`,
      [req.params.id, userId, actorRole, newPrice, newQty, message]
    );

    // Notify target
    const actorLabel = isWorker ? 'Worker' : 'Buyer';
    await createNotification(
      targetId,
      'COUNTER_OFFER',
      `Counter-Offer Received`,
      `${actorLabel} proposed ₹${newPrice}/kg for ${newQty.toLocaleString('en-IN')} kg.`,
      `/offers/${req.params.id}`,
      req.params.id
    );

    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    console.error('Counter offer error:', err);
    res.status(500).json({ success: false, error: 'Failed to counter offer' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/offers/:id/accept — accept an offer; creates transaction atomically
// ══════════════════════════════════════════════════════════════════════════════

export const acceptOffer = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const role   = req.user!.role;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock the offer row
    const offerRes = await client.query(
      `SELECT * FROM offers WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (offerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }
    const offer = offerRes.rows[0];

    // Ownership
    if (offer.buyer_id !== userId && offer.worker_id !== userId) {
      await client.query('ROLLBACK');
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Valid status
    if (!['PENDING', 'COUNTERED'].includes(offer.status)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: `Cannot accept an offer with status ${offer.status}` });
      return;
    }

    const isWorker  = offer.worker_id === userId;
    const actorRole = isWorker ? 'worker' : 'buyer';
    const targetId  = isWorker ? offer.buyer_id : offer.worker_id;

    const qty   = parseFloat(offer.quantity_kg);
    const price = parseFloat(offer.price_per_kg);
    const total = qty * price; // always recompute server-side

    // Lock listing and verify availability
    const listingRes = await client.query(
      `SELECT * FROM salt_listings WHERE id = $1 FOR UPDATE`,
      [offer.listing_id]
    );
    if (listingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Listing no longer exists' });
      return;
    }
    const listing = listingRes.rows[0];

    if (listing.status !== 'ACTIVE' && listing.status !== 'UNDER_OFFER') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Listing is no longer available' });
      return;
    }

    const availableQty = parseFloat(listing.quantity_kg);
    if (qty > availableQty) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: `Only ${availableQty.toLocaleString('en-IN')} kg available, offer requires ${qty.toLocaleString('en-IN')} kg`,
      });
      return;
    }

    // 1. Mark offer ACCEPTED
    await client.query(
      `UPDATE offers SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1`,
      [offer.id]
    );

    // 2. Offer history
    await client.query(
      `INSERT INTO offer_history
         (offer_id, actor_id, actor_role, event_type, price_per_kg, quantity_kg, message)
       VALUES ($1,$2,$3,'ACCEPT',$4,$5,$6)`,
      [offer.id, userId, actorRole, price, qty, req.body.message || null]
    );

    // 3. Reserve / reduce listing inventory
    const newQty = availableQty - qty;
    const newStatus = newQty <= 0 ? 'SOLD' : listing.status;
    await client.query(
      `UPDATE salt_listings SET quantity_kg = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newQty, newStatus, listing.id]
    );

    // 4. Reserve inventory if linked
    if (listing.inventory_id) {
      await client.query(
        `UPDATE salt_inventory
         SET quantity_kg = GREATEST(0, quantity_kg - $1),
             updated_at  = NOW()
         WHERE id = $2`,
        [qty, listing.inventory_id]
      );
    }

    // 5. Get transaction ref
    const txRef = await getNextTxRef(client);

    // 6. Create transaction
    const txRes = await client.query(
      `INSERT INTO transactions
         (transaction_ref, listing_id, offer_id, seller_id, buyer_id,
          quantity_kg, price_per_kg, agreed_price_per_kg, total_amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,'AGREED')
       RETURNING *`,
      [
        txRef,
        offer.listing_id,
        offer.id,
        offer.worker_id,
        offer.buyer_id,
        qty,
        price,
        total,
      ]
    );
    const tx = txRes.rows[0];

    // 7. Log transaction status history
    await client.query(
      `INSERT INTO transaction_status_history
         (transaction_id, actor_id, from_status, to_status, note)
       VALUES ($1,$2,NULL,'AGREED','Offer accepted — transaction created')`,
      [tx.id, userId]
    );

    await client.query('COMMIT');

    // Notifications (outside transaction — non-critical)
    await createNotification(
      targetId,
      'OFFER_ACCEPTED',
      'Offer Accepted',
      `Your offer has been accepted. Transaction ${txRef} has been created.`,
      `/transactions/${tx.id}`,
      tx.id
    );
    await createNotification(
      userId,
      'TRANSACTION_CREATED',
      'Transaction Created',
      `Transaction ${txRef} created for ₹${total.toLocaleString('en-IN')}.`,
      `/transactions/${tx.id}`,
      tx.id
    );

    res.json({ success: true, data: { offer: { ...offer, status: 'ACCEPTED' }, transaction: tx } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Accept offer error:', err);
    res.status(500).json({ success: false, error: 'Failed to accept offer' });
  } finally {
    client.release();
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/offers/:id/reject
// ══════════════════════════════════════════════════════════════════════════════

export const rejectOffer = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const offerRes = await query(`SELECT * FROM offers WHERE id = $1`, [req.params.id]);
    if (offerRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }
    const offer = offerRes.rows[0];

    if (offer.buyer_id !== userId && offer.worker_id !== userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (!['PENDING', 'COUNTERED'].includes(offer.status)) {
      res.status(400).json({ success: false, error: `Cannot reject an offer with status ${offer.status}` });
      return;
    }

    const isWorker  = offer.worker_id === userId;
    const actorRole = isWorker ? 'worker' : 'buyer';
    const targetId  = isWorker ? offer.buyer_id : offer.worker_id;

    await query(
      `UPDATE offers SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
      [offer.id]
    );

    await query(
      `INSERT INTO offer_history
         (offer_id, actor_id, actor_role, event_type, price_per_kg, quantity_kg, message)
       VALUES ($1,$2,$3,'REJECT',$4,$5,$6)`,
      [offer.id, userId, actorRole, offer.price_per_kg, offer.quantity_kg, req.body.message || null]
    );

    // Revert listing to ACTIVE if it was under offer
    await query(
      `UPDATE salt_listings SET status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1 AND status = 'UNDER_OFFER'`,
      [offer.listing_id]
    );

    await createNotification(
      targetId,
      'OFFER_REJECTED',
      'Offer Rejected',
      `The offer of ₹${offer.price_per_kg}/kg has been declined.`,
      `/offers/${offer.id}`,
      offer.id
    );

    const updated = await query(`SELECT * FROM offers WHERE id = $1`, [offer.id]);
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    console.error('Reject offer error:', err);
    res.status(500).json({ success: false, error: 'Failed to reject offer' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/offers/:id/withdraw — buyer withdraws their own offer
// ══════════════════════════════════════════════════════════════════════════════

export const withdrawOffer = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const offerRes = await query(`SELECT * FROM offers WHERE id = $1`, [req.params.id]);
    if (offerRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }
    const offer = offerRes.rows[0];

    if (offer.buyer_id !== userId) {
      res.status(403).json({ success: false, error: 'Only the buyer can withdraw their offer' });
      return;
    }

    if (!['PENDING', 'COUNTERED'].includes(offer.status)) {
      res.status(400).json({ success: false, error: `Cannot withdraw an offer with status ${offer.status}` });
      return;
    }

    await query(
      `UPDATE offers SET status = 'WITHDRAWN', updated_at = NOW() WHERE id = $1`,
      [offer.id]
    );

    await query(
      `INSERT INTO offer_history
         (offer_id, actor_id, actor_role, event_type, price_per_kg, quantity_kg, message)
       VALUES ($1,$2,'buyer','WITHDRAW',$3,$4,$5)`,
      [offer.id, userId, offer.price_per_kg, offer.quantity_kg, req.body.message || null]
    );

    await query(
      `UPDATE salt_listings SET status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1 AND status = 'UNDER_OFFER'`,
      [offer.listing_id]
    );

    await createNotification(
      offer.worker_id,
      'OFFER_WITHDRAWN',
      'Offer Withdrawn',
      `The buyer withdrew their offer of ₹${offer.price_per_kg}/kg.`,
      `/offers/${offer.id}`,
      offer.id
    );

    const updated = await query(`SELECT * FROM offers WHERE id = $1`, [offer.id]);
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    console.error('Withdraw offer error:', err);
    res.status(500).json({ success: false, error: 'Failed to withdraw offer' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/transactions — list transactions for authenticated user
export const getMyTransactions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const role   = req.user!.role;

  try {
    const result = await query(
      `SELECT
         t.*,
         l.salt_type, l.quality_grade, l.location AS listing_location,
         buyer.full_name   AS buyer_name,
         buyer.avatar_url  AS buyer_avatar,
         seller.full_name  AS seller_name,
         seller.avatar_url AS seller_avatar
       FROM transactions t
       LEFT JOIN salt_listings l   ON l.id = t.listing_id
       LEFT JOIN users buyer       ON buyer.id = t.buyer_id
       LEFT JOIN users seller      ON seller.id = t.seller_id
       WHERE ${role === 'BUYER' ? 't.buyer_id' : 't.seller_id'} = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get my transactions error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
};

// GET /api/transactions/:id
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const role   = req.user!.role;

  try {
    const result = await query(
      `SELECT
         t.*,
         l.salt_type, l.quality_grade, l.location AS listing_location,
         l.description AS listing_description, l.village, l.district,
         buyer.full_name   AS buyer_name,
         buyer.avatar_url  AS buyer_avatar,
         seller.full_name  AS seller_name,
         seller.avatar_url AS seller_avatar
       FROM transactions t
       LEFT JOIN salt_listings l   ON l.id = t.listing_id
       LEFT JOIN users buyer       ON buyer.id = t.buyer_id
       LEFT JOIN users seller      ON seller.id = t.seller_id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    const tx = result.rows[0];

    // Ownership
    if (tx.buyer_id !== userId && tx.seller_id !== userId && role !== 'ADMIN' && role !== 'COORDINATOR') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // History
    const histRes = await query(
      `SELECT tsh.*, u.full_name AS actor_name
       FROM transaction_status_history tsh
       JOIN users u ON u.id = tsh.actor_id
       WHERE tsh.transaction_id = $1
       ORDER BY tsh.created_at ASC`,
      [req.params.id]
    );

    // Offer history
    let offerHistory: unknown[] = [];
    if (tx.offer_id) {
      const ohRes = await query(
        `SELECT oh.*, u.full_name AS actor_name
         FROM offer_history oh
         JOIN users u ON u.id = oh.actor_id
         WHERE oh.offer_id = $1
         ORDER BY oh.created_at ASC`,
        [tx.offer_id]
      );
      offerHistory = ohRes.rows;
    }

    res.json({ success: true, data: { ...tx, statusHistory: histRes.rows, offerHistory } });
  } catch (err) {
    console.error('Get transaction by id error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
};

// PATCH /api/transactions/:id/status — update transaction status
export const updateTransactionStatus = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const role   = req.user!.role;
  const { status, note } = req.body;

  if (!status || !VALID_TX_STATUSES.includes(status)) {
    res.status(400).json({ success: false, error: `Invalid status. Valid: ${VALID_TX_STATUSES.join(', ')}` });
    return;
  }

  try {
    const txRes = await query(`SELECT * FROM transactions WHERE id = $1`, [req.params.id]);
    if (txRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }
    const tx = txRes.rows[0];

    if (tx.buyer_id !== userId && tx.seller_id !== userId && role !== 'ADMIN' && role !== 'COORDINATOR') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Validate transition
    const allowedTransitions = TX_TRANSITIONS[role]?.[tx.status] || [];
    if (role !== 'ADMIN' && !allowedTransitions.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Transition from ${tx.status} to ${status} is not allowed for role ${role}`,
      });
      return;
    }

    await query(
      `UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, tx.id]
    );

    await query(
      `INSERT INTO transaction_status_history
         (transaction_id, actor_id, from_status, to_status, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [tx.id, userId, tx.status, status, note || null]
    );

    // Notify other party
    const otherPartyId = tx.seller_id === userId ? tx.buyer_id : tx.seller_id;
    await createNotification(
      otherPartyId,
      'TRANSACTION_STATUS_CHANGED',
      'Transaction Updated',
      `Transaction ${tx.transaction_ref} status changed to ${status}.`,
      `/transactions/${tx.id}`,
      tx.id
    );

    const updated = await query(`SELECT * FROM transactions WHERE id = $1`, [tx.id]);
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    console.error('Update transaction status error:', err);
    res.status(500).json({ success: false, error: 'Failed to update transaction' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/offers/stats/worker — worker offer dashboard stats
// ══════════════════════════════════════════════════════════════════════════════

export const getWorkerOfferStats = async (req: Request, res: Response): Promise<void> => {
  const workerId = req.user!.id;
  try {
    const [offerStats, txStats] = await Promise.all([
      query(
        `SELECT
           COUNT(CASE WHEN status IN ('PENDING','COUNTERED') THEN 1 END) AS pending_offers,
           COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END) AS accepted_offers,
           COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) AS rejected_offers
         FROM offers WHERE worker_id = $1`,
        [workerId]
      ),
      query(
        `SELECT
           COUNT(*) AS total_transactions,
           COUNT(CASE WHEN status NOT IN ('CANCELLED','DISPUTED') THEN 1 END) AS active_transactions,
           COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total_amount END),0) AS completed_value
         FROM transactions WHERE seller_id = $1`,
        [workerId]
      ),
    ]);
    res.json({
      success: true,
      data: {
        offers: offerStats.rows[0],
        transactions: txStats.rows[0],
      },
    });
  } catch (err) {
    console.error('Worker offer stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/offers/stats/buyer — buyer offer dashboard stats
// ══════════════════════════════════════════════════════════════════════════════

export const getBuyerOfferStats = async (req: Request, res: Response): Promise<void> => {
  const buyerId = req.user!.id;
  try {
    const [offerStats, txStats] = await Promise.all([
      query(
        `SELECT
           COUNT(CASE WHEN status = 'PENDING'  THEN 1 END) AS pending_offers,
           COUNT(CASE WHEN status = 'COUNTERED' THEN 1 END) AS countered_offers,
           COUNT(CASE WHEN status = 'ACCEPTED'  THEN 1 END) AS accepted_offers,
           COUNT(CASE WHEN status = 'REJECTED'  THEN 1 END) AS rejected_offers,
           COUNT(CASE WHEN status = 'WITHDRAWN' THEN 1 END) AS withdrawn_offers
         FROM offers WHERE buyer_id = $1`,
        [buyerId]
      ),
      query(
        `SELECT
           COUNT(*) AS total_transactions,
           COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total_amount END),0) AS completed_value
         FROM transactions WHERE buyer_id = $1`,
        [buyerId]
      ),
    ]);
    res.json({
      success: true,
      data: {
        offers: offerStats.rows[0],
        transactions: txStats.rows[0],
      },
    });
  } catch (err) {
    console.error('Buyer offer stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};
