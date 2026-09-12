/**
 * Marketplace Controller — Phase 2
 *
 * Handles: salt_inventory, salt_listings, buyer_requests,
 *          saved_listings, matching, worker/buyer dashboards
 */

import { Request, Response } from 'express';
import { body, query as vq, param, validationResult } from 'express-validator';
import { query } from '../db/pool';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// SALT INVENTORY
// ══════════════════════════════════════════════════════════════════════════════

export const inventoryValidation = [
  body('quantity_kg').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
  body('salt_type').trim().isLength({ min: 1, max: 100 }).withMessage('Salt type required (max 100 chars)'),
  body('quality_grade').optional().trim().isLength({ max: 50 }),
  body('harvest_date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
  body('storage_location').optional().trim().isLength({ max: 255 }),
  body('season').optional().trim().isLength({ max: 100 }),
  body('price_per_kg').optional({ nullable: true }).isFloat({ min: 0.01 }).withMessage('Price must be positive'),
  body('moisture_pct').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('Moisture must be 0-100'),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const getInventory = async (req: Request, res: Response): Promise<void> => {
  const workerId = req.user!.id;
  try {
    const result = await query(
      `SELECT * FROM salt_inventory WHERE worker_id = $1 ORDER BY created_at DESC`,
      [workerId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
};

export const createInventory = async (req: Request, res: Response): Promise<void> => {
  if (validationErrors(req, res)) return;
  const workerId = req.user!.id;
  const {
    quantity_kg, salt_type, quality_grade, harvest_date,
    storage_location, season, price_per_kg, moisture_pct, notes,
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO salt_inventory
         (worker_id, quantity_kg, salt_type, quality_grade, harvest_date,
          storage_location, season, price_per_kg, moisture_pct, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'AVAILABLE')
       RETURNING *`,
      [
        workerId,
        parseFloat(quantity_kg),
        salt_type,
        quality_grade || null,
        harvest_date || null,
        storage_location || null,
        season || null,
        price_per_kg ? parseFloat(price_per_kg) : null,
        moisture_pct ? parseFloat(moisture_pct) : null,
        notes || null,
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create inventory error:', err);
    res.status(500).json({ success: false, error: 'Failed to create inventory record' });
  }
};

export const updateInventory = async (req: Request, res: Response): Promise<void> => {
  if (validationErrors(req, res)) return;
  const workerId = req.user!.id;
  const { id } = req.params;

  const fields = [
    'quantity_kg', 'salt_type', 'quality_grade', 'harvest_date',
    'storage_location', 'season', 'price_per_kg', 'moisture_pct', 'notes', 'status',
  ];

  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        const v = req.body[field];
        if (['quantity_kg', 'price_per_kg', 'moisture_pct'].includes(field)) {
          values.push(v === null || v === '' ? null : parseFloat(v));
        } else {
          values.push(v === '' ? null : v);
        }
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, workerId);

    const result = await query(
      `UPDATE salt_inventory SET ${updates.join(', ')}
       WHERE id = $${idx} AND worker_id = $${idx + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Inventory item not found or access denied' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update inventory error:', err);
    res.status(500).json({ success: false, error: 'Failed to update inventory' });
  }
};

export const deleteInventory = async (req: Request, res: Response): Promise<void> => {
  const workerId = req.user!.id;
  const { id } = req.params;

  try {
    // Check if any active listing references this inventory
    const listing = await query(
      `SELECT id FROM salt_listings WHERE inventory_id = $1 AND status = 'ACTIVE'`,
      [id]
    );
    if (listing.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Cannot delete inventory with an active listing. Close the listing first.',
      });
      return;
    }

    const result = await query(
      `DELETE FROM salt_inventory WHERE id = $1 AND worker_id = $2 RETURNING id`,
      [id, workerId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Inventory item not found or access denied' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete inventory error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete inventory' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SALT LISTINGS
// ══════════════════════════════════════════════════════════════════════════════

export const listingValidation = [
  body('quantity_kg').isFloat({ min: 1 }).withMessage('Quantity must be at least 1 kg'),
  body('price_per_kg').isFloat({ min: 0.01 }).withMessage('Price must be positive'),
  body('salt_type').trim().isLength({ min: 1, max: 100 }).withMessage('Salt type required'),
  body('quality_grade').optional().trim().isLength({ max: 50 }),
  body('location').trim().isLength({ min: 1, max: 255 }).withMessage('Location required'),
  body('min_quantity_kg').optional().isFloat({ min: 1 }).withMessage('Min quantity must be ≥ 1'),
  body('available_date').optional({ nullable: true }).isISO8601(),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('village').optional().trim().isLength({ max: 255 }),
  body('district').optional().trim().isLength({ max: 255 }),
  body('season').optional().trim().isLength({ max: 100 }),
  body('inventory_id').optional({ nullable: true }).isUUID().withMessage('Invalid inventory ID'),
];

// GET /api/marketplace/listings — public browsable listings
export const getListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt((req.query.page as string) || '1'));
    const limit   = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20')));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search  as string) || '').trim();
    const saltType = (req.query.salt_type as string) || '';
    const grade   = (req.query.grade    as string) || '';
    const location = (req.query.location as string) || '';
    const minPrice = req.query.min_price ? parseFloat(req.query.min_price as string) : null;
    const maxPrice = req.query.max_price ? parseFloat(req.query.max_price as string) : null;
    const minQty   = req.query.min_qty   ? parseFloat(req.query.min_qty   as string) : null;
    const sort     = (req.query.sort as string) || 'newest';

    const conditions: string[] = [`l.status = 'ACTIVE'`];
    const params: unknown[] = [];
    let pIdx = 1;

    if (search) {
      conditions.push(`(l.salt_type ILIKE $${pIdx} OR l.description ILIKE $${pIdx} OR l.location ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }
    if (saltType) { conditions.push(`l.salt_type ILIKE $${pIdx++}`); params.push(`%${saltType}%`); }
    if (grade)    { conditions.push(`l.quality_grade ILIKE $${pIdx++}`); params.push(`%${grade}%`); }
    if (location) { conditions.push(`(l.location ILIKE $${pIdx} OR l.village ILIKE $${pIdx} OR l.district ILIKE $${pIdx})`); params.push(`%${location}%`); pIdx++; }
    if (minPrice !== null) { conditions.push(`l.price_per_kg >= $${pIdx++}`); params.push(minPrice); }
    if (maxPrice !== null) { conditions.push(`l.price_per_kg <= $${pIdx++}`); params.push(maxPrice); }
    if (minQty   !== null) { conditions.push(`l.quantity_kg  >= $${pIdx++}`); params.push(minQty); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortMap: Record<string, string> = {
      newest:   'l.created_at DESC',
      oldest:   'l.created_at ASC',
      price_asc:  'l.price_per_kg ASC',
      price_desc: 'l.price_per_kg DESC',
      qty_desc:   'l.quantity_kg DESC',
      qty_asc:    'l.quantity_kg ASC',
    };
    const orderBy = sortMap[sort] || 'l.created_at DESC';

    const countResult = await query(
      `SELECT COUNT(*) FROM salt_listings l ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataResult = await query(
      `SELECT
         l.*,
         u.full_name   AS seller_name,
         u.avatar_url  AS seller_avatar,
         wp.village    AS seller_village,
         wp.district   AS seller_district
       FROM salt_listings l
       JOIN users u ON l.worker_id = u.id
       LEFT JOIN worker_profiles wp ON wp.user_id = l.worker_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      params
    );

    res.json({
      success: true,
      data: {
        listings: dataResult.rows,
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch listings' });
  }
};

// GET /api/marketplace/listings/:id
export const getListingById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT
         l.*,
         u.full_name  AS seller_name,
         u.avatar_url AS seller_avatar,
         wp.village   AS seller_village,
         wp.district  AS seller_district,
         wp.years_experience AS seller_experience
       FROM salt_listings l
       JOIN users u ON l.worker_id = u.id
       LEFT JOIN worker_profiles wp ON wp.user_id = l.worker_id
       WHERE l.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Listing not found' });
      return;
    }

    // Track view
    const viewerId = req.user?.id || null;
    await query(
      `INSERT INTO listing_views (listing_id, viewer_id) VALUES ($1, $2)`,
      [id, viewerId]
    ).catch(() => {});
    // Increment counter
    await query(
      `UPDATE salt_listings SET views_count = views_count + 1 WHERE id = $1`,
      [id]
    ).catch(() => {});

    // Check if current user has saved it
    let isSaved = false;
    if (viewerId) {
      const saved = await query(
        `SELECT id FROM saved_listings WHERE user_id = $1 AND listing_id = $2`,
        [viewerId, id]
      );
      isSaved = saved.rows.length > 0;
    }

    res.json({ success: true, data: { ...result.rows[0], is_saved: isSaved } });
  } catch (err) {
    console.error('Get listing by id error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch listing' });
  }
};

// GET /api/marketplace/my-listings — worker's own listings
export const getMyListings = async (req: Request, res: Response): Promise<void> => {
  const workerId = req.user!.id;
  const status   = (req.query.status as string) || '';
  try {
    const params: unknown[] = [workerId];
    const cond = status ? `AND l.status = $2` : '';
    if (status) params.push(status);

    const result = await query(
      `SELECT l.* FROM salt_listings l WHERE l.worker_id = $1 ${cond} ORDER BY l.created_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get my listings error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch listings' });
  }
};

// POST /api/marketplace/listings
export const createListing = async (req: Request, res: Response): Promise<void> => {
  if (validationErrors(req, res)) return;
  const workerId = req.user!.id;
  const {
    inventory_id, quantity_kg, price_per_kg, salt_type, quality_grade,
    location, min_quantity_kg, available_date, description,
    village, district, season,
  } = req.body;

  try {
    // If linked to inventory, verify ownership
    if (inventory_id) {
      const inv = await query(
        `SELECT id, quantity_kg, status FROM salt_inventory WHERE id = $1 AND worker_id = $2`,
        [inventory_id, workerId]
      );
      if (inv.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Inventory item not found or access denied' });
        return;
      }
    }

    const result = await query(
      `INSERT INTO salt_listings
         (worker_id, inventory_id, quantity_kg, price_per_kg, salt_type,
          quality_grade, location, min_quantity_kg, available_date,
          description, village, district, season, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'ACTIVE')
       RETURNING *`,
      [
        workerId,
        inventory_id || null,
        parseFloat(quantity_kg),
        parseFloat(price_per_kg),
        salt_type,
        quality_grade || null,
        location,
        min_quantity_kg ? parseFloat(min_quantity_kg) : 100,
        available_date || null,
        description || null,
        village || null,
        district || null,
        season || null,
      ]
    );

    // Mark linked inventory as reserved if present
    if (inventory_id) {
      await query(
        `UPDATE salt_inventory SET status = 'RESERVED', updated_at = NOW() WHERE id = $1`,
        [inventory_id]
      );
    }

    // Create notifications for matching buyer requests
    await notifyMatchingBuyers(result.rows[0]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ success: false, error: 'Failed to create listing' });
  }
};

// PATCH /api/marketplace/listings/:id
export const updateListing = async (req: Request, res: Response): Promise<void> => {
  const workerId = req.user!.id;
  const { id } = req.params;

  const editableFields = [
    'quantity_kg', 'price_per_kg', 'salt_type', 'quality_grade',
    'location', 'min_quantity_kg', 'available_date', 'description',
    'village', 'district', 'season', 'status',
  ];
  const numericFields = ['quantity_kg', 'price_per_kg', 'min_quantity_kg'];
  const validStatuses = ['ACTIVE', 'PAUSED', 'CLOSED', 'SOLD'];

  try {
    if (req.body.status && !validStatuses.includes(req.body.status)) {
      res.status(400).json({ success: false, error: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        const v = req.body[field];
        if (numericFields.includes(field)) {
          values.push(v === null || v === '' ? null : parseFloat(v));
        } else {
          values.push(v === '' ? null : v);
        }
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, workerId);

    const result = await query(
      `UPDATE salt_listings SET ${updates.join(', ')}
       WHERE id = $${idx} AND worker_id = $${idx + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Listing not found or access denied' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update listing error:', err);
    res.status(500).json({ success: false, error: 'Failed to update listing' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// BUYER REQUESTS
// ══════════════════════════════════════════════════════════════════════════════

export const buyerRequestValidation = [
  body('quantity_kg').isFloat({ min: 1 }).withMessage('Quantity must be at least 1 kg'),
  body('salt_type').trim().isLength({ min: 1, max: 100 }).withMessage('Salt type required'),
  body('max_price_per_kg').optional({ nullable: true }).isFloat({ min: 0.01 }),
  body('preferred_location').optional().trim().isLength({ max: 255 }),
  body('required_date').optional({ nullable: true }).isISO8601(),
  body('quality_notes').optional().trim().isLength({ max: 1000 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('title').optional().trim().isLength({ max: 255 }),
];

// GET /api/marketplace/buyer-requests — all open requests (visible to workers)
export const getBuyerRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt((req.query.page as string) || '1'));
    const limit  = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20')));
    const offset = (page - 1) * limit;
    const saltType = (req.query.salt_type as string) || '';
    const status   = (req.query.status   as string) || 'OPEN';

    const conditions: string[] = [`br.status = $1`];
    const params: unknown[] = [status];
    let pIdx = 2;

    if (saltType) {
      conditions.push(`br.salt_type ILIKE $${pIdx++}`);
      params.push(`%${saltType}%`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query(
      `SELECT COUNT(*) FROM buyer_requests br ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataResult = await query(
      `SELECT
         br.*,
         u.full_name  AS buyer_name,
         u.avatar_url AS buyer_avatar
       FROM buyer_requests br
       JOIN users u ON br.buyer_id = u.id
       ${where}
       ORDER BY br.created_at DESC
       LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      params
    );

    res.json({
      success: true,
      data: {
        requests: dataResult.rows,
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (err) {
    console.error('Get buyer requests error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch buyer requests' });
  }
};

// GET /api/marketplace/buyer-requests/mine — buyer's own requests
export const getMyBuyerRequests = async (req: Request, res: Response): Promise<void> => {
  const buyerId = req.user!.id;
  try {
    const result = await query(
      `SELECT * FROM buyer_requests WHERE buyer_id = $1 ORDER BY created_at DESC`,
      [buyerId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get my buyer requests error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch your requests' });
  }
};

// POST /api/marketplace/buyer-requests
export const createBuyerRequest = async (req: Request, res: Response): Promise<void> => {
  if (validationErrors(req, res)) return;
  const buyerId = req.user!.id;
  const {
    quantity_kg, salt_type, max_price_per_kg,
    preferred_location, required_date, quality_notes, description, title,
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO buyer_requests
         (buyer_id, quantity_kg, salt_type, max_price_per_kg,
          preferred_location, required_date, quality_notes, description, title, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'OPEN')
       RETURNING *`,
      [
        buyerId,
        parseFloat(quantity_kg),
        salt_type,
        max_price_per_kg ? parseFloat(max_price_per_kg) : null,
        preferred_location || null,
        required_date || null,
        quality_notes || null,
        description || null,
        title || null,
      ]
    );

    // Notify workers with matching listings
    await notifyMatchingWorkers(result.rows[0]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create buyer request error:', err);
    res.status(500).json({ success: false, error: 'Failed to create buyer request' });
  }
};

// PATCH /api/marketplace/buyer-requests/:id
export const updateBuyerRequest = async (req: Request, res: Response): Promise<void> => {
  const buyerId = req.user!.id;
  const { id } = req.params;
  const validStatuses = ['OPEN', 'FULFILLED', 'CLOSED'];

  const editableFields = [
    'quantity_kg', 'salt_type', 'max_price_per_kg', 'preferred_location',
    'required_date', 'quality_notes', 'description', 'title', 'status',
  ];

  try {
    if (req.body.status && !validStatuses.includes(req.body.status)) {
      res.status(400).json({ success: false, error: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        const v = req.body[field];
        if (['quantity_kg', 'max_price_per_kg'].includes(field)) {
          values.push(v === null || v === '' ? null : parseFloat(v));
        } else {
          values.push(v === '' ? null : v);
        }
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, buyerId);

    const result = await query(
      `UPDATE buyer_requests SET ${updates.join(', ')}
       WHERE id = $${idx} AND buyer_id = $${idx + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Request not found or access denied' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update buyer request error:', err);
    res.status(500).json({ success: false, error: 'Failed to update buyer request' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SAVED LISTINGS
// ══════════════════════════════════════════════════════════════════════════════

export const getSavedListings = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  try {
    const result = await query(
      `SELECT
         l.*,
         u.full_name  AS seller_name,
         wp.village   AS seller_village,
         wp.district  AS seller_district,
         sl.created_at AS saved_at
       FROM saved_listings sl
       JOIN salt_listings l ON sl.listing_id = l.id
       JOIN users u ON l.worker_id = u.id
       LEFT JOIN worker_profiles wp ON wp.user_id = l.worker_id
       WHERE sl.user_id = $1
       ORDER BY sl.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get saved listings error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch saved listings' });
  }
};

export const saveListing = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { id: listingId } = req.params;

  try {
    // Verify listing exists
    const listing = await query(`SELECT id, status FROM salt_listings WHERE id = $1`, [listingId]);
    if (listing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Listing not found' });
      return;
    }

    await query(
      `INSERT INTO saved_listings (user_id, listing_id) VALUES ($1, $2)
       ON CONFLICT (user_id, listing_id) DO NOTHING`,
      [userId, listingId]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Save listing error:', err);
    res.status(500).json({ success: false, error: 'Failed to save listing' });
  }
};

export const unsaveListing = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { id: listingId } = req.params;

  try {
    await query(
      `DELETE FROM saved_listings WHERE user_id = $1 AND listing_id = $2`,
      [userId, listingId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Unsave listing error:', err);
    res.status(500).json({ success: false, error: 'Failed to unsave listing' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// MATCHING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Deterministic matching score (0–100) based on actual DB values.
 * No AI. No fabrication.
 */
function computeMatchScore(
  listing: Record<string, unknown>,
  request: Record<string, unknown>
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Salt type match (40 pts)
  const lt = ((listing.salt_type as string) || '').toLowerCase().trim();
  const rt = ((request.salt_type  as string) || '').toLowerCase().trim();
  if (lt && rt) {
    if (lt === rt) {
      score += 40;
      reasons.push('Same salt type');
    } else if (lt.includes(rt) || rt.includes(lt)) {
      score += 20;
      reasons.push('Similar salt type');
    }
  }

  // Quantity compatibility (30 pts)
  const lQty = parseFloat(String(listing.quantity_kg || 0));
  const rQty = parseFloat(String(request.quantity_kg || 0));
  if (lQty >= rQty) {
    score += 30;
    reasons.push(`Full quantity available (${lQty.toLocaleString('en-IN')} kg ≥ ${rQty.toLocaleString('en-IN')} kg needed)`);
  } else if (lQty >= rQty * 0.5) {
    score += 15;
    reasons.push(`Partial quantity available (${lQty.toLocaleString('en-IN')} kg of ${rQty.toLocaleString('en-IN')} kg needed)`);
  }

  // Price compatibility (20 pts)
  const lPrice = parseFloat(String(listing.price_per_kg || 0));
  const rMaxPrice = parseFloat(String(request.max_price_per_kg || 0));
  if (rMaxPrice > 0) {
    if (lPrice <= rMaxPrice) {
      score += 20;
      reasons.push(`Price within budget (₹${lPrice}/kg ≤ ₹${rMaxPrice}/kg max)`);
    } else if (lPrice <= rMaxPrice * 1.1) {
      score += 10;
      reasons.push(`Price slightly above budget (₹${lPrice}/kg vs ₹${rMaxPrice}/kg max)`);
    }
  } else {
    // No max price stated — partial credit
    score += 10;
  }

  // Location match (10 pts)
  const ll = ((listing.location as string) || '').toLowerCase().trim();
  const rl = ((request.preferred_location as string) || '').toLowerCase().trim();
  if (ll && rl && (ll.includes(rl) || rl.includes(ll))) {
    score += 10;
    reasons.push('Location matches preference');
  }

  return { score: Math.min(100, score), reasons };
}

// GET /api/marketplace/matches/listing/:id — matching buyer requests for a listing
export const getMatchesForListing = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const listing = await query(`SELECT * FROM salt_listings WHERE id = $1`, [id]);
    if (listing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Listing not found' });
      return;
    }
    const l = listing.rows[0] as Record<string, unknown>;

    const requests = await query(
      `SELECT br.*, u.full_name AS buyer_name FROM buyer_requests br
       JOIN users u ON br.buyer_id = u.id
       WHERE br.status = 'OPEN'`,
      []
    );

    const matches = requests.rows
      .map((r: Record<string, unknown>) => {
        const { score, reasons } = computeMatchScore(l, r);
        return { ...r, match_score: score, match_reasons: reasons };
      })
      .filter((r) => r.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10);

    res.json({ success: true, data: matches });
  } catch (err) {
    console.error('Get matches for listing error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch matches' });
  }
};

// GET /api/marketplace/matches/request/:id — matching listings for a buyer request
export const getMatchesForRequest = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const request = await query(`SELECT * FROM buyer_requests WHERE id = $1`, [id]);
    if (request.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Request not found' });
      return;
    }
    const r = request.rows[0] as Record<string, unknown>;

    const listings = await query(
      `SELECT l.*, u.full_name AS seller_name, wp.village AS seller_village, wp.district AS seller_district
       FROM salt_listings l
       JOIN users u ON l.worker_id = u.id
       LEFT JOIN worker_profiles wp ON wp.user_id = l.worker_id
       WHERE l.status = 'ACTIVE'`,
      []
    );

    const matches = listings.rows
      .map((l: Record<string, unknown>) => {
        const { score, reasons } = computeMatchScore(l, r);
        return { ...l, match_score: score, match_reasons: reasons };
      })
      .filter((l) => l.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10);

    res.json({ success: true, data: matches });
  } catch (err) {
    console.error('Get matches for request error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch matches' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════════════════════════════════════════════

export const getWorkerDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const workerId = req.user!.id;
  try {
    const [inventory, listings, activity] = await Promise.all([
      query(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'AVAILABLE' THEN quantity_kg END), 0) AS available_kg,
           COALESCE(SUM(CASE WHEN status = 'RESERVED'  THEN quantity_kg END), 0) AS reserved_kg,
           COALESCE(SUM(CASE WHEN status = 'SOLD'      THEN quantity_kg END), 0) AS sold_kg,
           COUNT(*) AS total_items
         FROM salt_inventory WHERE worker_id = $1`,
        [workerId]
      ),
      query(
        `SELECT
           COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS active_listings,
           COUNT(CASE WHEN status = 'SOLD'   THEN 1 END) AS sold_listings,
           COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN quantity_kg * price_per_kg END), 0) AS active_value,
           COALESCE(SUM(views_count), 0) AS total_views
         FROM salt_listings WHERE worker_id = $1`,
        [workerId]
      ),
      query(
        `SELECT br.* , u.full_name AS buyer_name
         FROM buyer_requests br
         JOIN users u ON br.buyer_id = u.id
         WHERE br.status = 'OPEN'
         ORDER BY br.created_at DESC LIMIT 3`,
        []
      ),
    ]);

    res.json({
      success: true,
      data: {
        inventory: inventory.rows[0],
        listings:  listings.rows[0],
        recent_buyer_requests: activity.rows,
      },
    });
  } catch (err) {
    console.error('Worker dashboard stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};

export const getBuyerDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const buyerId = req.user!.id;
  try {
    const [saved, requests, recent] = await Promise.all([
      query(
        `SELECT COUNT(*) AS saved_count FROM saved_listings WHERE user_id = $1`,
        [buyerId]
      ),
      query(
        `SELECT
           COUNT(CASE WHEN status = 'OPEN'      THEN 1 END) AS open_requests,
           COUNT(CASE WHEN status = 'FULFILLED' THEN 1 END) AS fulfilled_requests
         FROM buyer_requests WHERE buyer_id = $1`,
        [buyerId]
      ),
      query(
        `SELECT l.*, u.full_name AS seller_name, wp.district AS seller_district
         FROM salt_listings l
         JOIN users u ON l.worker_id = u.id
         LEFT JOIN worker_profiles wp ON wp.user_id = l.worker_id
         WHERE l.status = 'ACTIVE'
         ORDER BY l.created_at DESC LIMIT 3`,
        []
      ),
    ]);

    res.json({
      success: true,
      data: {
        saved_count:   parseInt(saved.rows[0].saved_count),
        requests:      requests.rows[0],
        recent_listings: recent.rows,
      },
    });
  } catch (err) {
    console.error('Buyer dashboard stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function notifyMatchingBuyers(listing: Record<string, unknown>): Promise<void> {
  try {
    // Find buyers with open requests matching this listing's salt type
    const buyers = await query(
      `SELECT DISTINCT buyer_id FROM buyer_requests
       WHERE status = 'OPEN'
         AND (salt_type ILIKE $1 OR $1 ILIKE CONCAT('%', salt_type, '%'))`,
      [listing.salt_type as string]
    );

    for (const row of buyers.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, body, metadata)
         VALUES ($1, 'LISTING_ENQUIRY', $2, $3, $4)`,
        [
          row.buyer_id,
          'New matching salt listing',
          `A new listing for ${listing.salt_type} (${listing.quantity_kg} kg at ₹${listing.price_per_kg}/kg) matches your buyer request.`,
          JSON.stringify({ listing_id: listing.id }),
        ]
      );
    }
  } catch (err) {
    console.error('Notify matching buyers error:', err);
  }
}

async function notifyMatchingWorkers(request: Record<string, unknown>): Promise<void> {
  try {
    // Find workers with active listings matching this request's salt type
    const workers = await query(
      `SELECT DISTINCT worker_id FROM salt_listings
       WHERE status = 'ACTIVE'
         AND (salt_type ILIKE $1 OR $1 ILIKE CONCAT('%', salt_type, '%'))`,
      [request.salt_type as string]
    );

    for (const row of workers.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, body, metadata)
         VALUES ($1, 'OFFER_RECEIVED', $2, $3, $4)`,
        [
          row.worker_id,
          'New buyer request matches your listing',
          `A buyer is looking for ${request.quantity_kg} kg of ${request.salt_type}${request.preferred_location ? ` near ${request.preferred_location}` : ''}.`,
          JSON.stringify({ request_id: request.id }),
        ]
      );
    }
  } catch (err) {
    console.error('Notify matching workers error:', err);
  }
}
