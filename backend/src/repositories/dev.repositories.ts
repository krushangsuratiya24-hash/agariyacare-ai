// Development in-memory repositories — all marketplace + auth features
// Replace with PostgreSQL for production

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  UserRepository, WorkerProfileRepository, BuyerProfileRepository,
  SaltClassificationRepository, SaltInventoryRepository, SaltListingRepository,
  BuyerRequestRepository, SavedListingRepository,
  OfferRepository, OfferHistoryRepository, TransactionRepository,
  MarketPriceRepository, HealthcareRepository, WelfareRepository,
  SafetyRepository, CommunityRepository, NotificationRepository,
  ChatRepository, WorkerRepository,
} from './interfaces';
import {
  User, PublicUser, WorkerProfile, BuyerProfile,
  SaltType, SaltGrade, SaltInventory, SaltListing, BuyerRequest, SavedListing,
  Offer, OfferHistory, Transaction, MarketPrice,
  HealthcareRequest, HealthcareCamp, WelfareScheme,
  SafetyReading, SafetyIncident, SafetyAlert,
  CommunityNotice, SupportRequest, Notification,
  ChatConversation, ChatMessage,
  SaltPriceEntry, Worker,
} from '../types';
import {
  devWorkers, devHealthcareRequests, devHealthcareCamps,
  devSaltPrices, devWelfareSchemes, devSafetyReadings,
  devSafetyIncidents, devSafetyAlerts, devCommunityNotices,
  devSupportRequests, devNotifications,
} from '../data/development/seed';

const clone = <T>(arr: T[]): T[] => JSON.parse(JSON.stringify(arr));

// ─── Seed Data ────────────────────────────────────────────────────────────────

async function hashPw(pw: string) { return bcrypt.hash(pw, 10); }

// Will be populated async in init()
let SEED_USERS: User[] = [];
let SEED_WORKER_PROFILES: WorkerProfile[] = [];
let SEED_BUYER_PROFILES: BuyerProfile[] = [];

const SEED_SALT_TYPES: SaltType[] = [
  { id: 'st-1', name: 'Industrial Salt', description: 'Used in chemical industry, water treatment', isActive: true, sortOrder: 1, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'st-2', name: 'Raw Salt', description: 'Unprocessed salt from salt pans', isActive: true, sortOrder: 2, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'st-3', name: 'Refined Salt', description: 'Processed and purified table salt', isActive: true, sortOrder: 3, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'st-4', name: 'Pharmaceutical Salt', description: 'High-purity salt for pharmaceutical use', isActive: true, sortOrder: 4, createdAt: '2024-01-01T00:00:00Z' },
];

const SEED_SALT_GRADES: SaltGrade[] = [
  { id: 'sg-1', saltTypeId: 'st-1', name: 'Grade 1', description: 'Top grade industrial salt, NaCl ≥ 98%', typicalPriceRangeMin: 7.5, typicalPriceRangeMax: 9.0, isActive: true, sortOrder: 1, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sg-2', saltTypeId: 'st-1', name: 'Grade 2', description: 'Standard industrial salt, NaCl ≥ 96%', typicalPriceRangeMin: 6.0, typicalPriceRangeMax: 7.5, isActive: true, sortOrder: 2, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sg-3', saltTypeId: 'st-2', name: 'Grade A', description: 'Best quality raw salt, clean crystals', typicalPriceRangeMin: 5.5, typicalPriceRangeMax: 7.0, isActive: true, sortOrder: 1, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sg-4', saltTypeId: 'st-2', name: 'Grade B', description: 'Standard raw salt', typicalPriceRangeMin: 4.0, typicalPriceRangeMax: 5.5, isActive: true, sortOrder: 2, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sg-5', saltTypeId: 'st-3', name: 'Food Grade', description: 'Food-safe refined salt', typicalPriceRangeMin: 10.0, typicalPriceRangeMax: 14.0, isActive: true, sortOrder: 1, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sg-6', saltTypeId: 'st-4', name: 'USP Grade', description: 'United States Pharmacopeia specification', typicalPriceRangeMin: 18.0, typicalPriceRangeMax: 25.0, isActive: true, sortOrder: 1, createdAt: '2024-01-01T00:00:00Z' },
];

// Seed listings, inventory, offers, transactions
let SEED_INVENTORY: SaltInventory[] = [];
let SEED_LISTINGS: SaltListing[] = [];
let SEED_BUYER_REQUESTS: BuyerRequest[] = [];
let SEED_OFFERS: Offer[] = [];
let SEED_OFFER_HISTORY: OfferHistory[] = [];
let SEED_TRANSACTIONS: Transaction[] = [];
let SEED_MARKET_PRICES: MarketPrice[] = [];
let transactionCounter = 1025;

async function initSeedData() {
  const workerPwHash = await hashPw('worker123');
  const buyerPwHash = await hashPw('buyer123');
  const coordPwHash = await hashPw('coord123');
  const adminPwHash = await hashPw('admin123');

  SEED_USERS = [
    {
      id: 'u-worker-1',
      email: 'worker@test.local',
      passwordHash: workerPwHash,
      role: 'worker',
      name: 'Ramji Agariya',
      phone: '9876543210',
      profilePhoto: undefined,
      language: 'gu',
      onboardingCompleted: true,
      isActive: true,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
    {
      id: 'u-worker-2',
      email: 'worker2@test.local',
      passwordHash: workerPwHash,
      role: 'worker',
      name: 'Savitaben Agariya',
      phone: '9876543211',
      language: 'gu',
      onboardingCompleted: false,
      isActive: true,
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z',
    },
    {
      id: 'u-buyer-1',
      email: 'buyer@test.local',
      passwordHash: buyerPwHash,
      role: 'buyer',
      name: 'Sanjay Salt Traders',
      phone: '9123456789',
      language: 'en',
      onboardingCompleted: true,
      isActive: true,
      createdAt: '2024-01-20T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z',
    },
    {
      id: 'u-buyer-2',
      email: 'buyer2@test.local',
      passwordHash: buyerPwHash,
      role: 'buyer',
      name: 'Gujarat Chemical Corp',
      phone: '9234567890',
      language: 'en',
      onboardingCompleted: true,
      isActive: true,
      createdAt: '2024-02-05T00:00:00Z',
      updatedAt: '2024-02-05T00:00:00Z',
    },
    {
      id: 'u-coord-1',
      email: 'coordinator@test.local',
      passwordHash: coordPwHash,
      role: 'coordinator',
      name: 'Meera Coordinator',
      phone: '9345678901',
      language: 'gu',
      onboardingCompleted: true,
      isActive: true,
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
    },
    {
      id: 'u-admin-1',
      email: 'admin@test.local',
      passwordHash: adminPwHash,
      role: 'admin',
      name: 'Admin User',
      phone: '9456789012',
      language: 'en',
      onboardingCompleted: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  SEED_WORKER_PROFILES = [
    {
      id: 'wp-1',
      userId: 'u-worker-1',
      village: 'Dhrangadhra',
      district: 'Surendranagar',
      state: 'Gujarat',
      yearsOfWork: 12,
      saltProductionTonnesPerSeason: 150,
      preferredSaltType: 'st-1',
      preferredSaltGrade: 'sg-1',
      familySize: 5,
      annualIncome: 85000,
      isRegisteredWorker: true,
      hasBankAccount: true,
      hasAadhaar: true,
      isBPL: true,
      hasDisability: false,
      hasHealthInsurance: false,
      housingStatus: 'owned',
      workerId: 'AGW-0001',
      profileCompletionPct: 85,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
    {
      id: 'wp-2',
      userId: 'u-worker-2',
      village: 'Patdi',
      district: 'Surendranagar',
      state: 'Gujarat',
      yearsOfWork: 7,
      saltProductionTonnesPerSeason: 90,
      preferredSaltType: 'st-2',
      familySize: 4,
      isRegisteredWorker: false,
      hasBankAccount: true,
      hasAadhaar: false,
      isBPL: true,
      hasDisability: false,
      hasHealthInsurance: false,
      housingStatus: 'rented',
      workerId: 'AGW-0002',
      profileCompletionPct: 45,
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z',
    },
  ];

  SEED_BUYER_PROFILES = [
    {
      id: 'bp-1',
      userId: 'u-buyer-1',
      companyName: 'Sanjay Salt Traders',
      gstNumber: '24AABC1234D1Z5',
      businessType: 'Wholesale Trader',
      location: 'Ahmedabad',
      district: 'Ahmedabad',
      state: 'Gujarat',
      preferredSaltTypes: ['st-1', 'st-2'],
      preferredGrades: ['sg-1', 'sg-2', 'sg-3'],
      typicalOrderQuantityTonnes: 50,
      buyerId: 'AGB-0001',
      createdAt: '2024-01-20T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z',
    },
    {
      id: 'bp-2',
      userId: 'u-buyer-2',
      companyName: 'Gujarat Chemical Corp',
      gstNumber: '24AXYZ5678E2Z6',
      businessType: 'Chemical Manufacturer',
      location: 'Vadodara',
      district: 'Vadodara',
      state: 'Gujarat',
      preferredSaltTypes: ['st-1'],
      preferredGrades: ['sg-1'],
      typicalOrderQuantityTonnes: 200,
      buyerId: 'AGB-0002',
      createdAt: '2024-02-05T00:00:00Z',
      updatedAt: '2024-02-05T00:00:00Z',
    },
  ];

  SEED_INVENTORY = [
    {
      id: 'inv-1',
      workerId: 'u-worker-1',
      saltTypeId: 'st-1',
      saltGradeId: 'sg-1',
      totalQuantityKg: 15000,
      availableQuantityKg: 10000,
      reservedQuantityKg: 0,
      soldQuantityKg: 5000,
      productionDate: '2024-11-01',
      location: 'Dhrangadhra Salt Pan Block A',
      expectedPricePerKg: 8.50,
      qualityNotes: 'High purity, NaCl 98.2%, well dried crystals',
      images: [],
      isArchived: false,
      createdAt: '2024-11-05T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inv-2',
      workerId: 'u-worker-1',
      saltTypeId: 'st-2',
      saltGradeId: 'sg-3',
      totalQuantityKg: 8000,
      availableQuantityKg: 8000,
      reservedQuantityKg: 0,
      soldQuantityKg: 0,
      productionDate: '2024-12-01',
      location: 'Dhrangadhra Salt Pan Block B',
      expectedPricePerKg: 5.80,
      qualityNotes: 'Fresh batch, clean crystals',
      images: [],
      isArchived: false,
      createdAt: '2024-12-10T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inv-3',
      workerId: 'u-worker-2',
      saltTypeId: 'st-2',
      saltGradeId: 'sg-4',
      totalQuantityKg: 5000,
      availableQuantityKg: 5000,
      reservedQuantityKg: 0,
      soldQuantityKg: 0,
      productionDate: '2024-11-15',
      location: 'Patdi Salt Works',
      expectedPricePerKg: 4.50,
      images: [],
      isArchived: false,
      createdAt: '2024-11-20T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];

  SEED_LISTINGS = [
    {
      id: 'lst-1',
      workerId: 'u-worker-1',
      inventoryId: 'inv-1',
      saltTypeId: 'st-1',
      saltGradeId: 'sg-1',
      quantityKg: 5000,
      askingPricePerKg: 8.50,
      qualityDescription: 'Grade 1 industrial salt. NaCl purity ≥ 98%. Fully dried. Suitable for chemical and water treatment applications.',
      pickupLocation: 'Dhrangadhra Salt Pan Block A, Near NH-27',
      district: 'Surendranagar',
      availableFrom: '2024-12-15',
      images: [],
      status: 'ACTIVE',
      viewCount: 12,
      createdAt: '2024-12-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lst-2',
      workerId: 'u-worker-1',
      inventoryId: 'inv-2',
      saltTypeId: 'st-2',
      saltGradeId: 'sg-3',
      quantityKg: 4000,
      askingPricePerKg: 5.80,
      qualityDescription: 'Fresh Grade A raw salt. Clean crystals, minimal impurities.',
      pickupLocation: 'Dhrangadhra Salt Pan Block B',
      district: 'Surendranagar',
      availableFrom: '2025-01-05',
      images: [],
      status: 'ACTIVE',
      viewCount: 5,
      createdAt: '2024-12-10T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lst-3',
      workerId: 'u-worker-2',
      inventoryId: 'inv-3',
      saltTypeId: 'st-2',
      saltGradeId: 'sg-4',
      quantityKg: 3000,
      askingPricePerKg: 4.50,
      qualityDescription: 'Standard Grade B raw salt.',
      pickupLocation: 'Patdi Salt Works, Surendranagar',
      district: 'Surendranagar',
      availableFrom: '2024-12-20',
      images: [],
      status: 'ACTIVE',
      viewCount: 3,
      createdAt: '2024-11-25T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];

  SEED_BUYER_REQUESTS = [
    {
      id: 'br-1',
      buyerId: 'u-buyer-1',
      saltTypeId: 'st-1',
      saltGradeId: 'sg-1',
      quantityKg: 10000,
      targetPricePerKg: 8.20,
      requiredByDate: '2025-01-31',
      location: 'Ahmedabad',
      district: 'Ahmedabad',
      qualityRequirements: 'NaCl ≥ 98%, moisture ≤ 2%',
      additionalNotes: 'Need certified quality report. Can arrange transport.',
      status: 'OPEN',
      createdAt: '2024-12-05T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'br-2',
      buyerId: 'u-buyer-2',
      saltTypeId: 'st-1',
      quantityKg: 20000,
      targetPricePerKg: 7.90,
      requiredByDate: '2025-02-28',
      location: 'Vadodara',
      district: 'Vadodara',
      qualityRequirements: 'Grade 1 or Grade 2 industrial salt',
      status: 'OPEN',
      createdAt: '2024-12-08T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];

  const pendingOffer: Offer = {
    id: 'off-1',
    listingId: 'lst-1',
    buyerId: 'u-buyer-1',
    workerId: 'u-worker-1',
    quantityKg: 5000,
    pricePerKg: 8.10,
    totalAmount: 40500,
    message: 'We are interested in your Grade 1 industrial salt. Can you accept ₹8.10/kg for the full 5000 kg?',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  };

  SEED_OFFERS = [pendingOffer];

  SEED_OFFER_HISTORY = [
    {
      id: 'oh-1',
      offerId: 'off-1',
      actorId: 'u-buyer-1',
      actorRole: 'buyer',
      eventType: 'OFFER',
      pricePerKg: 8.10,
      quantityKg: 5000,
      message: 'Initial offer: ₹8.10/kg for 5000 kg.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  SEED_TRANSACTIONS = [
    {
      id: 'tx-1',
      transactionRef: 'AG-1024',
      listingId: 'lst-3',
      offerId: 'off-completed-1',
      sellerId: 'u-worker-1',
      buyerId: 'u-buyer-1',
      saltTypeId: 'st-1',
      saltGradeId: 'sg-2',
      quantityKg: 3000,
      agreedPricePerKg: 7.50,
      totalAmount: 22500,
      status: 'COMPLETED',
      completedAt: '2024-11-20T00:00:00Z',
      createdAt: '2024-11-18T00:00:00Z',
      updatedAt: '2024-11-20T00:00:00Z',
    },
    {
      id: 'tx-2',
      transactionRef: 'AG-1023',
      listingId: 'lst-3',
      offerId: 'off-completed-2',
      sellerId: 'u-worker-1',
      buyerId: 'u-buyer-2',
      saltTypeId: 'st-1',
      saltGradeId: 'sg-1',
      quantityKg: 2000,
      agreedPricePerKg: 8.40,
      totalAmount: 16800,
      status: 'COMPLETED',
      completedAt: '2024-10-30T00:00:00Z',
      createdAt: '2024-10-28T00:00:00Z',
      updatedAt: '2024-10-30T00:00:00Z',
    },
  ];

  transactionCounter = 1025;

  SEED_MARKET_PRICES = [
    { id: 'mp-1', saltTypeId: 'st-1', saltGradeId: 'sg-1', market: 'Kharaghoda Market', location: 'Surendranagar', pricePerKg: 8.30, dataStatus: 'INDICATIVE', source: 'Platform Reference', recordedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: 'mp-2', saltTypeId: 'st-1', saltGradeId: 'sg-2', market: 'Dhrangadhra Market', location: 'Surendranagar', pricePerKg: 7.20, dataStatus: 'INDICATIVE', source: 'Platform Reference', recordedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: 'mp-3', saltTypeId: 'st-2', saltGradeId: 'sg-3', market: 'Little Rann Market', location: 'Patan', pricePerKg: 6.10, dataStatus: 'INDICATIVE', source: 'Platform Reference', recordedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: 'mp-4', saltTypeId: 'st-2', saltGradeId: 'sg-4', market: 'Patdi Market', location: 'Surendranagar', pricePerKg: 4.80, dataStatus: 'INDICATIVE', source: 'Platform Reference', recordedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: 'mp-5', saltTypeId: 'st-3', saltGradeId: 'sg-5', market: 'Ahmedabad Wholesale', location: 'Ahmedabad', pricePerKg: 12.50, dataStatus: 'INDICATIVE', source: 'Platform Reference', recordedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
  ];
}

// Init synchronously via top-level await workaround
let initialized = false;
const initPromise = initSeedData().then(() => { initialized = true; });

async function ensureInit() {
  if (!initialized) await initPromise;
}

// ─── User Repository ──────────────────────────────────────────────────────────

export class DevUserRepository implements UserRepository {
  private store: User[] = [];

  async init() { await ensureInit(); this.store = SEED_USERS; }

  private toPublic(u: User): PublicUser {
    const { passwordHash, ...pub } = u;
    return pub;
  }

  async findById(id: string) {
    await this.init();
    return this.store.find(u => u.id === id) ?? null;
  }

  async findByEmail(email: string) {
    await this.init();
    return this.store.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    await this.init();
    const user: User = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.push(user);
    return user;
  }

  async update(id: string, updates: Partial<Omit<User, 'id' | 'passwordHash'>>) {
    await this.init();
    const idx = this.store.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.store[idx];
  }

  async updatePassword(id: string, passwordHash: string) {
    await this.init();
    const user = this.store.find(u => u.id === id);
    if (!user) return false;
    user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    return true;
  }

  async findAll() {
    await this.init();
    return this.store.map(this.toPublic);
  }
}

// ─── Worker Profile Repository ────────────────────────────────────────────────

export class DevWorkerProfileRepository implements WorkerProfileRepository {
  private store: WorkerProfile[] = [];

  async init() { await ensureInit(); if (this.store.length === 0) this.store = clone(SEED_WORKER_PROFILES); }

  async findByUserId(userId: string) {
    await this.init();
    return this.store.find(p => p.userId === userId) ?? null;
  }

  async create(data: Omit<WorkerProfile, 'id' | 'createdAt' | 'updatedAt'>) {
    await this.init();
    const profile: WorkerProfile = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.store.push(profile);
    return profile;
  }

  async update(userId: string, updates: Partial<WorkerProfile>) {
    await this.init();
    const idx = this.store.findIndex(p => p.userId === userId);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.store[idx];
  }
}

// ─── Buyer Profile Repository ─────────────────────────────────────────────────

export class DevBuyerProfileRepository implements BuyerProfileRepository {
  private store: BuyerProfile[] = [];

  async init() { await ensureInit(); if (this.store.length === 0) this.store = clone(SEED_BUYER_PROFILES); }

  async findByUserId(userId: string) {
    await this.init();
    return this.store.find(p => p.userId === userId) ?? null;
  }

  async create(data: Omit<BuyerProfile, 'id' | 'createdAt' | 'updatedAt'>) {
    await this.init();
    const profile: BuyerProfile = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.store.push(profile);
    return profile;
  }

  async update(userId: string, updates: Partial<BuyerProfile>) {
    await this.init();
    const idx = this.store.findIndex(p => p.userId === userId);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.store[idx];
  }
}

// ─── Salt Classification Repository ──────────────────────────────────────────

export class DevSaltClassificationRepository implements SaltClassificationRepository {
  private types: SaltType[] = clone(SEED_SALT_TYPES);
  private grades: SaltGrade[] = clone(SEED_SALT_GRADES);

  async findAllTypes(activeOnly = false) { return activeOnly ? this.types.filter(t => t.isActive) : [...this.types]; }
  async findTypeById(id: string) { return this.types.find(t => t.id === id) ?? null; }
  async createType(data: Omit<SaltType, 'id' | 'createdAt'>) {
    const t: SaltType = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
    this.types.push(t); return t;
  }
  async updateType(id: string, updates: Partial<SaltType>) {
    const idx = this.types.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.types[idx] = { ...this.types[idx], ...updates };
    return this.types[idx];
  }
  async findGradesByTypeId(saltTypeId: string) { return this.grades.filter(g => g.saltTypeId === saltTypeId); }
  async findGradeById(id: string) { return this.grades.find(g => g.id === id) ?? null; }
  async findAllGrades(activeOnly = false) { return activeOnly ? this.grades.filter(g => g.isActive) : [...this.grades]; }
  async createGrade(data: Omit<SaltGrade, 'id' | 'createdAt'>) {
    const g: SaltGrade = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
    this.grades.push(g); return g;
  }
  async updateGrade(id: string, updates: Partial<SaltGrade>) {
    const idx = this.grades.findIndex(g => g.id === id);
    if (idx === -1) return null;
    this.grades[idx] = { ...this.grades[idx], ...updates };
    return this.grades[idx];
  }
}

// ─── Salt Inventory Repository ────────────────────────────────────────────────

export class DevSaltInventoryRepository implements SaltInventoryRepository {
  private store: SaltInventory[] = [];
  private classRepo = new DevSaltClassificationRepository();

  async init() { await ensureInit(); if (this.store.length === 0) this.store = clone(SEED_INVENTORY); }

  private async populate(inv: SaltInventory): Promise<SaltInventory> {
    const [saltType, saltGrade] = await Promise.all([
      this.classRepo.findTypeById(inv.saltTypeId),
      this.classRepo.findGradeById(inv.saltGradeId),
    ]);
    return { ...inv, saltType: saltType ?? undefined, saltGrade: saltGrade ?? undefined };
  }

  async findById(id: string) {
    await this.init();
    const inv = this.store.find(i => i.id === id) ?? null;
    return inv ? this.populate(inv) : null;
  }

  async findByWorkerId(workerId: string) {
    await this.init();
    return Promise.all(this.store.filter(i => i.workerId === workerId && !i.isArchived).map(i => this.populate(i)));
  }

  async create(data: Omit<SaltInventory, 'id' | 'createdAt' | 'updatedAt'>) {
    await this.init();
    const inv: SaltInventory = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.store.push(inv);
    return this.populate(inv);
  }

  async update(id: string, updates: Partial<SaltInventory>) {
    await this.init();
    const idx = this.store.findIndex(i => i.id === id);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.populate(this.store[idx]);
  }

  async adjustQuantity(id: string, deltaAvailable: number, deltaReserved: number, deltaSold: number) {
    await this.init();
    const inv = this.store.find(i => i.id === id);
    if (!inv) return null;
    inv.availableQuantityKg = Math.max(0, inv.availableQuantityKg + deltaAvailable);
    inv.reservedQuantityKg = Math.max(0, inv.reservedQuantityKg + deltaReserved);
    inv.soldQuantityKg = Math.max(0, inv.soldQuantityKg + deltaSold);
    inv.updatedAt = new Date().toISOString();
    return this.populate(inv);
  }
}

// ─── Salt Listing Repository ──────────────────────────────────────────────────

export class DevSaltListingRepository implements SaltListingRepository {
  private store: SaltListing[] = [];
  private classRepo = new DevSaltClassificationRepository();
  private userRepo = new DevUserRepository();
  private workerProfileRepo = new DevWorkerProfileRepository();

  async init() { await ensureInit(); if (this.store.length === 0) this.store = clone(SEED_LISTINGS); }

  private async populate(lst: SaltListing): Promise<SaltListing> {
    const [saltType, saltGrade, workerUser, workerProfile] = await Promise.all([
      this.classRepo.findTypeById(lst.saltTypeId),
      this.classRepo.findGradeById(lst.saltGradeId),
      this.userRepo.findById(lst.workerId),
      this.workerProfileRepo.findByUserId(lst.workerId),
    ]);
    const workerPub = workerUser ? {
      id: workerUser.id, email: workerUser.email, role: workerUser.role,
      name: workerUser.name, phone: workerUser.phone, profilePhoto: workerUser.profilePhoto,
      language: workerUser.language, onboardingCompleted: workerUser.onboardingCompleted,
      isActive: workerUser.isActive, createdAt: workerUser.createdAt,
      profile: workerProfile ?? undefined,
    } : undefined;
    return { ...lst, saltType: saltType ?? undefined, saltGrade: saltGrade ?? undefined, worker: workerPub };
  }

  async findById(id: string) {
    await this.init();
    const lst = this.store.find(l => l.id === id) ?? null;
    return lst ? this.populate(lst) : null;
  }

  async findAll(filters?: any) {
    await this.init();
    let results = [...this.store];
    if (filters?.saltTypeId) results = results.filter(l => l.saltTypeId === filters.saltTypeId);
    if (filters?.saltGradeId) results = results.filter(l => l.saltGradeId === filters.saltGradeId);
    if (filters?.status) results = results.filter(l => l.status === filters.status);
    if (filters?.workerId) results = results.filter(l => l.workerId === filters.workerId);
    if (filters?.district) results = results.filter(l => l.district.toLowerCase().includes(filters.district.toLowerCase()));
    if (filters?.minQuantityKg) results = results.filter(l => l.quantityKg >= filters.minQuantityKg);
    if (filters?.maxPricePerKg) results = results.filter(l => l.askingPricePerKg <= filters.maxPricePerKg);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(l =>
        l.qualityDescription?.toLowerCase().includes(q) ||
        l.pickupLocation.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q)
      );
    }
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Promise.all(results.map(l => this.populate(l)));
  }

  async findByWorkerId(workerId: string) {
    await this.init();
    const results = this.store.filter(l => l.workerId === workerId);
    return Promise.all(results.map(l => this.populate(l)));
  }

  async create(data: Omit<SaltListing, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>) {
    await this.init();
    const lst: SaltListing = { ...data, id: uuidv4(), viewCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.store.push(lst);
    return this.populate(lst);
  }

  async update(id: string, updates: Partial<SaltListing>) {
    await this.init();
    const idx = this.store.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.populate(this.store[idx]);
  }

  async incrementView(id: string) {
    await this.init();
    const lst = this.store.find(l => l.id === id);
    if (lst) lst.viewCount++;
  }
}

// ─── Buyer Request Repository ─────────────────────────────────────────────────

export class DevBuyerRequestRepository implements BuyerRequestRepository {
  private store: BuyerRequest[] = [];
  private classRepo = new DevSaltClassificationRepository();
  private userRepo = new DevUserRepository();
  private buyerProfileRepo = new DevBuyerProfileRepository();

  async init() { await ensureInit(); if (this.store.length === 0) this.store = clone(SEED_BUYER_REQUESTS); }

  private async populate(req: BuyerRequest): Promise<BuyerRequest> {
    const [saltType, saltGrade, buyerUser, buyerProfile] = await Promise.all([
      this.classRepo.findTypeById(req.saltTypeId),
      req.saltGradeId ? this.classRepo.findGradeById(req.saltGradeId) : Promise.resolve(null),
      this.userRepo.findById(req.buyerId),
      this.buyerProfileRepo.findByUserId(req.buyerId),
    ]);
    const buyerPub = buyerUser ? {
      id: buyerUser.id, email: buyerUser.email, role: buyerUser.role,
      name: buyerUser.name, phone: buyerUser.phone, profilePhoto: buyerUser.profilePhoto,
      language: buyerUser.language, onboardingCompleted: buyerUser.onboardingCompleted,
      isActive: buyerUser.isActive, createdAt: buyerUser.createdAt,
      profile: buyerProfile ?? undefined,
    } : undefined;
    return { ...req, saltType: saltType ?? undefined, saltGrade: saltGrade ?? undefined, buyer: buyerPub };
  }

  async findById(id: string) {
    await this.init();
    const req = this.store.find(r => r.id === id) ?? null;
    return req ? this.populate(req) : null;
  }

  async findAll(filters?: any) {
    await this.init();
    let results = [...this.store];
    if (filters?.buyerId) results = results.filter(r => r.buyerId === filters.buyerId);
    if (filters?.saltTypeId) results = results.filter(r => r.saltTypeId === filters.saltTypeId);
    if (filters?.status) results = results.filter(r => r.status === filters.status);
    if (filters?.district) results = results.filter(r => r.district?.toLowerCase().includes(filters.district.toLowerCase()));
    return Promise.all(results.map(r => this.populate(r)));
  }

  async findByBuyerId(buyerId: string) {
    return this.findAll({ buyerId });
  }

  async create(data: Omit<BuyerRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    await this.init();
    const req: BuyerRequest = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.store.push(req);
    return this.populate(req);
  }

  async update(id: string, updates: Partial<BuyerRequest>) {
    await this.init();
    const idx = this.store.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.populate(this.store[idx]);
  }
}

// ─── Saved Listings Repository ────────────────────────────────────────────────

export class DevSavedListingRepository implements SavedListingRepository {
  private store: SavedListing[] = [];
  private listingRepo = new DevSaltListingRepository();

  async findByUserId(userId: string) {
    const saved = this.store.filter(s => s.userId === userId);
    return Promise.all(saved.map(async s => ({
      ...s,
      listing: await this.listingRepo.findById(s.listingId) ?? undefined,
    })));
  }

  async save(userId: string, listingId: string) {
    const existing = this.store.find(s => s.userId === userId && s.listingId === listingId);
    if (existing) return existing;
    const saved: SavedListing = { id: uuidv4(), userId, listingId, createdAt: new Date().toISOString() };
    this.store.push(saved);
    return saved;
  }

  async unsave(userId: string, listingId: string) {
    const idx = this.store.findIndex(s => s.userId === userId && s.listingId === listingId);
    if (idx === -1) return false;
    this.store.splice(idx, 1);
    return true;
  }

  async isSaved(userId: string, listingId: string) {
    return this.store.some(s => s.userId === userId && s.listingId === listingId);
  }
}

// ─── Offer Repository ─────────────────────────────────────────────────────────

export class DevOfferRepository implements OfferRepository {
  private store: Offer[] = [];
  private listingRepo = new DevSaltListingRepository();
  private userRepo = new DevUserRepository();
  private buyerProfileRepo = new DevBuyerProfileRepository();

  async init() { await ensureInit(); if (this.store.length === 0) this.store = clone(SEED_OFFERS); }

  private async populate(offer: Offer): Promise<Offer> {
    const [listing, buyerUser, buyerProfile, workerUser] = await Promise.all([
      this.listingRepo.findById(offer.listingId),
      this.userRepo.findById(offer.buyerId),
      this.buyerProfileRepo.findByUserId(offer.buyerId),
      this.userRepo.findById(offer.workerId),
    ]);
    const buyerPub = buyerUser ? {
      id: buyerUser.id, email: buyerUser.email, role: buyerUser.role,
      name: buyerUser.name, phone: buyerUser.phone, profilePhoto: buyerUser.profilePhoto,
      language: buyerUser.language, onboardingCompleted: buyerUser.onboardingCompleted,
      isActive: buyerUser.isActive, createdAt: buyerUser.createdAt,
      profile: buyerProfile ?? undefined,
    } : undefined;
    const workerPub = workerUser ? {
      id: workerUser.id, email: workerUser.email, role: workerUser.role,
      name: workerUser.name, language: workerUser.language, onboardingCompleted: workerUser.onboardingCompleted,
      isActive: workerUser.isActive, createdAt: workerUser.createdAt,
    } : undefined;
    return { ...offer, listing: listing ?? undefined, buyer: buyerPub, worker: workerPub };
  }

  async findById(id: string) {
    await this.init();
    const off = this.store.find(o => o.id === id) ?? null;
    return off ? this.populate(off) : null;
  }

  async findByListingId(listingId: string) {
    await this.init();
    return Promise.all(this.store.filter(o => o.listingId === listingId).map(o => this.populate(o)));
  }

  async findByBuyerId(buyerId: string) {
    await this.init();
    return Promise.all(this.store.filter(o => o.buyerId === buyerId).map(o => this.populate(o)));
  }

  async findByWorkerId(workerId: string) {
    await this.init();
    return Promise.all(this.store.filter(o => o.workerId === workerId).map(o => this.populate(o)));
  }

  async findPendingByListingId(listingId: string) {
    await this.init();
    return Promise.all(this.store.filter(o => o.listingId === listingId && o.status === 'PENDING').map(o => this.populate(o)));
  }

  async create(data: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>) {
    await this.init();
    const off: Offer = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.store.push(off);
    return this.populate(off);
  }

  async update(id: string, updates: Partial<Offer>) {
    await this.init();
    const idx = this.store.findIndex(o => o.id === id);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.populate(this.store[idx]);
  }
}

// ─── Offer History Repository ─────────────────────────────────────────────────

export class DevOfferHistoryRepository implements OfferHistoryRepository {
  private store: OfferHistory[] = [];

  async init() { await ensureInit(); if (this.store.length === 0) this.store = clone(SEED_OFFER_HISTORY); }

  async findByOfferId(offerId: string) {
    await this.init();
    return this.store.filter(h => h.offerId === offerId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async create(data: Omit<OfferHistory, 'id' | 'createdAt'>) {
    await this.init();
    const h: OfferHistory = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
    this.store.push(h);
    return h;
  }
}

// ─── Transaction Repository ───────────────────────────────────────────────────

export class DevTransactionRepository implements TransactionRepository {
  private store: Transaction[] = [];
  private listingRepo = new DevSaltListingRepository();
  private classRepo = new DevSaltClassificationRepository();
  private userRepo = new DevUserRepository();

  async init() { await ensureInit(); if (this.store.length === 0) this.store = clone(SEED_TRANSACTIONS); }

  async getNextRef() {
    return `AG-${transactionCounter++}`;
  }

  private async populate(tx: Transaction): Promise<Transaction> {
    const [listing, saltType, saltGrade, seller, buyer] = await Promise.all([
      this.listingRepo.findById(tx.listingId),
      this.classRepo.findTypeById(tx.saltTypeId),
      this.classRepo.findGradeById(tx.saltGradeId),
      this.userRepo.findById(tx.sellerId),
      this.userRepo.findById(tx.buyerId),
    ]);
    const toPublic = (u: any) => u ? { id: u.id, email: u.email, role: u.role, name: u.name, language: u.language, onboardingCompleted: u.onboardingCompleted, isActive: u.isActive, createdAt: u.createdAt } : undefined;
    return { ...tx, listing: listing ?? undefined, saltType: saltType ?? undefined, saltGrade: saltGrade ?? undefined, seller: toPublic(seller), buyer: toPublic(buyer) };
  }

  async findById(id: string) {
    await this.init();
    const tx = this.store.find(t => t.id === id) ?? null;
    return tx ? this.populate(tx) : null;
  }

  async findByRef(ref: string) {
    await this.init();
    const tx = this.store.find(t => t.transactionRef === ref) ?? null;
    return tx ? this.populate(tx) : null;
  }

  async findBySellerId(sellerId: string) {
    await this.init();
    const txs = this.store.filter(t => t.sellerId === sellerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Promise.all(txs.map(t => this.populate(t)));
  }

  async findByBuyerId(buyerId: string) {
    await this.init();
    const txs = this.store.filter(t => t.buyerId === buyerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Promise.all(txs.map(t => this.populate(t)));
  }

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
    await this.init();
    const tx: Transaction = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.store.push(tx);
    return this.populate(tx);
  }

  async update(id: string, updates: Partial<Transaction>) {
    await this.init();
    const idx = this.store.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.populate(this.store[idx]);
  }
}

// ─── Market Price Repository ──────────────────────────────────────────────────

export class DevMarketPriceRepository implements MarketPriceRepository {
  private marketStore: MarketPrice[] = [];
  private legacyStore: SaltPriceEntry[] = clone(devSaltPrices);

  async init() { await ensureInit(); if (this.marketStore.length === 0) this.marketStore = clone(SEED_MARKET_PRICES); }

  async findAll(filters?: any) {
    await this.init();
    let results = [...this.marketStore];
    if (filters?.saltTypeId) results = results.filter(m => m.saltTypeId === filters.saltTypeId);
    if (filters?.saltGradeId) results = results.filter(m => m.saltGradeId === filters.saltGradeId);
    return results;
  }

  async findLatest() {
    await this.init();
    return [...this.marketStore];
  }

  async create(data: Omit<MarketPrice, 'id' | 'createdAt'>) {
    await this.init();
    const mp: MarketPrice = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
    this.marketStore.push(mp);
    return mp;
  }

  async update(id: string, updates: Partial<MarketPrice>) {
    await this.init();
    const idx = this.marketStore.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.marketStore[idx] = { ...this.marketStore[idx], ...updates };
    return this.marketStore[idx];
  }

  // Legacy methods
  async findAllPrices(filters?: any) {
    return this.legacyStore.filter(e => {
      if (filters?.saltType && e.saltType !== filters.saltType) return false;
      if (filters?.location && !e.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      return true;
    });
  }

  async getLatestPrices() {
    const byMarket = new Map<string, SaltPriceEntry>();
    for (const e of this.legacyStore) {
      const existing = byMarket.get(e.market);
      if (!existing || e.date > existing.date) byMarket.set(e.market, e);
    }
    return Array.from(byMarket.values());
  }

  async getPriceTrend(days: number) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    return this.legacyStore.filter(e => e.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
  }

  async createEntry(entry: Omit<SaltPriceEntry, 'id'>) {
    const e: SaltPriceEntry = { ...entry, id: uuidv4() };
    this.legacyStore.push(e);
    return e;
  }
}

// ─── Chat Repository ──────────────────────────────────────────────────────────

export class DevChatRepository implements ChatRepository {
  private conversations: ChatConversation[] = [];
  private messages: ChatMessage[] = [];

  async findConversationsByUserId(userId: string) {
    return this.conversations.filter(c => c.userId === userId && !c.isArchived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async findConversationById(id: string) {
    return this.conversations.find(c => c.id === id) ?? null;
  }

  async createConversation(data: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'>) {
    const conv: ChatConversation = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.conversations.push(conv);
    return conv;
  }

  async updateConversation(id: string, updates: Partial<ChatConversation>) {
    const idx = this.conversations.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.conversations[idx] = { ...this.conversations[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.conversations[idx];
  }

  async findMessagesByConversationId(conversationId: string) {
    return this.messages.filter(m => m.conversationId === conversationId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async createMessage(data: Omit<ChatMessage, 'id'>) {
    const msg: ChatMessage = { ...data, id: uuidv4() };
    this.messages.push(msg);
    return msg;
  }
}

// ─── Healthcare Repository ─────────────────────────────────────────────────────

export class DevHealthcareRepository implements HealthcareRepository {
  private requests: HealthcareRequest[] = clone(devHealthcareRequests);
  private camps: HealthcareCamp[] = clone(devHealthcareCamps);

  async findRequestById(id: string) { return this.requests.find(r => r.id === id) ?? null; }
  async findAllRequests(filters?: { workerId?: string; status?: string }) {
    return this.requests.filter(r => {
      if (filters?.workerId && r.workerId !== filters.workerId) return false;
      if (filters?.status && r.status !== filters.status) return false;
      return true;
    });
  }
  async createRequest(req: Omit<HealthcareRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    const r: HealthcareRequest = { ...req, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.requests.push(r); return r;
  }
  async updateRequest(id: string, updates: Partial<HealthcareRequest>) {
    const idx = this.requests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.requests[idx] = { ...this.requests[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.requests[idx];
  }
  async findAllCamps() { return [...this.camps]; }
  async findCampById(id: string) { return this.camps.find(c => c.id === id) ?? null; }
  async createCamp(camp: Omit<HealthcareCamp, 'id'>) {
    const c: HealthcareCamp = { ...camp, id: uuidv4() };
    this.camps.push(c); return c;
  }
  async updateCamp(id: string, updates: Partial<HealthcareCamp>) {
    const idx = this.camps.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.camps[idx] = { ...this.camps[idx], ...updates };
    return this.camps[idx];
  }
}

// ─── Welfare Repository ────────────────────────────────────────────────────────

export class DevWelfareRepository implements WelfareRepository {
  private store: WelfareScheme[] = clone(devWelfareSchemes);
  async findAllSchemes(activeOnly = false) { return activeOnly ? this.store.filter(s => s.isActive) : [...this.store]; }
  async findSchemeById(id: string) { return this.store.find(s => s.id === id) ?? null; }
  async createScheme(scheme: Omit<WelfareScheme, 'id'>) {
    const s: WelfareScheme = { ...scheme, id: uuidv4() };
    this.store.push(s); return s;
  }
  async updateScheme(id: string, updates: Partial<WelfareScheme>) {
    const idx = this.store.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates };
    return this.store[idx];
  }
}

// ─── Safety Repository ─────────────────────────────────────────────────────────

export class DevSafetyRepository implements SafetyRepository {
  private readings: SafetyReading[] = clone(devSafetyReadings);
  private incidents: SafetyIncident[] = clone(devSafetyIncidents);
  private alerts: SafetyAlert[] = clone(devSafetyAlerts);

  async findReadings(workerId?: string) { return workerId ? this.readings.filter(r => r.workerId === workerId) : [...this.readings]; }
  async createReading(reading: Omit<SafetyReading, 'id'>) {
    const r: SafetyReading = { ...reading, id: uuidv4() };
    this.readings.push(r); return r;
  }
  async findIncidents(filters?: { workerId?: string; status?: string }) {
    return this.incidents.filter(i => {
      if (filters?.workerId && i.workerId !== filters.workerId) return false;
      if (filters?.status && i.status !== filters.status) return false;
      return true;
    });
  }
  async findIncidentById(id: string) { return this.incidents.find(i => i.id === id) ?? null; }
  async createIncident(incident: Omit<SafetyIncident, 'id' | 'createdAt' | 'updatedAt'>) {
    const i: SafetyIncident = { ...incident, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.incidents.push(i); return i;
  }
  async updateIncident(id: string, updates: Partial<SafetyIncident>) {
    const idx = this.incidents.findIndex(i => i.id === id);
    if (idx === -1) return null;
    this.incidents[idx] = { ...this.incidents[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.incidents[idx];
  }
  async findActiveAlerts() { return this.alerts.filter(a => a.isActive); }
  async createAlert(alert: Omit<SafetyAlert, 'id' | 'createdAt'>) {
    const a: SafetyAlert = { ...alert, id: uuidv4(), createdAt: new Date().toISOString() };
    this.alerts.push(a); return a;
  }
}

// ─── Community Repository ──────────────────────────────────────────────────────

export class DevCommunityRepository implements CommunityRepository {
  private notices: CommunityNotice[] = clone(devCommunityNotices);
  private supportReqs: SupportRequest[] = clone(devSupportRequests);

  async findAllNotices(activeOnly = false) { return activeOnly ? this.notices.filter(n => n.isActive) : [...this.notices]; }
  async findNoticeById(id: string) { return this.notices.find(n => n.id === id) ?? null; }
  async createNotice(notice: Omit<CommunityNotice, 'id' | 'createdAt' | 'updatedAt'>) {
    const n: CommunityNotice = { ...notice, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.notices.push(n); return n;
  }
  async updateNotice(id: string, updates: Partial<CommunityNotice>) {
    const idx = this.notices.findIndex(n => n.id === id);
    if (idx === -1) return null;
    this.notices[idx] = { ...this.notices[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.notices[idx];
  }
  async deleteNotice(id: string) {
    const idx = this.notices.findIndex(n => n.id === id);
    if (idx === -1) return false;
    this.notices.splice(idx, 1); return true;
  }
  async findAllSupportRequests(filters?: any) {
    return this.supportReqs.filter(r => {
      if (filters?.workerId && r.workerId !== filters.workerId) return false;
      if (filters?.status && r.status !== filters.status) return false;
      return true;
    });
  }
  async findSupportRequestById(id: string) { return this.supportReqs.find(r => r.id === id) ?? null; }
  async createSupportRequest(req: Omit<SupportRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    const r: SupportRequest = { ...req, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.supportReqs.push(r); return r;
  }
  async updateSupportRequest(id: string, updates: Partial<SupportRequest>) {
    const idx = this.supportReqs.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.supportReqs[idx] = { ...this.supportReqs[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.supportReqs[idx];
  }
}

// ─── Notification Repository ───────────────────────────────────────────────────

export class DevNotificationRepository implements NotificationRepository {
  private store: Notification[] = clone(devNotifications);

  async findByUserId(userId: string) {
    return this.store.filter(n => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async findUnreadByUserId(userId: string) { return this.store.filter(n => n.userId === userId && !n.isRead); }
  async create(notification: Omit<Notification, 'id' | 'createdAt'>) {
    const n: Notification = { ...notification, id: uuidv4(), createdAt: new Date().toISOString() };
    this.store.push(n); return n;
  }
  async markAsRead(id: string) {
    const n = this.store.find(x => x.id === id);
    if (!n) return false;
    n.isRead = true; return true;
  }
  async markAllAsRead(userId: string) {
    this.store.filter(n => n.userId === userId).forEach(n => { n.isRead = true; });
    return true;
  }
}

// ─── Legacy Worker Repo ───────────────────────────────────────────────────────

export class DevWorkerRepository implements WorkerRepository {
  private store: Worker[] = clone(devWorkers);
  async findById(id: string) { return this.store.find(w => w.id === id) ?? null; }
  async findAll() { return [...this.store]; }
  async create(worker: Omit<Worker, 'id' | 'createdAt'>) {
    const w: Worker = { ...worker, id: uuidv4(), createdAt: new Date().toISOString() };
    this.store.push(w); return w;
  }
  async update(id: string, updates: Partial<Worker>) {
    const idx = this.store.findIndex(w => w.id === id);
    if (idx === -1) return null;
    this.store[idx] = { ...this.store[idx], ...updates };
    return this.store[idx];
  }
  async delete(id: string) {
    const idx = this.store.findIndex(w => w.id === id);
    if (idx === -1) return false;
    this.store.splice(idx, 1); return true;
  }
}
