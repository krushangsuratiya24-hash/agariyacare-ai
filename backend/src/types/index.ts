// AgariyaCare AI — Shared Backend Types

export type UserRole = 'AGARIYA_WORKER' | 'BUYER' | 'COORDINATOR' | 'ADMIN';
export type LanguagePref = 'en' | 'gu';

// ─── Auth / Users ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone: string | null;
  password_hash?: string;     // snake_case (DB)
  passwordHash?: string;      // camelCase (dev repo)
  role: UserRole | string;    // allow lowercase dev strings
  full_name?: string;         // snake_case (DB)
  name?: string;              // camelCase (dev repo)
  avatar_url?: string | null;
  profilePhoto?: string;      // dev repo alias
  language_pref?: string;     // snake_case (DB)
  language?: string;          // camelCase (dev repo)
  is_active?: boolean;        // snake_case (DB)
  isActive?: boolean;         // camelCase (dev repo)
  onboarding_completed?: boolean;  // snake_case (DB)
  onboardingCompleted?: boolean;   // camelCase (dev repo)
  email_verified?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
  createdAt?: Date | string;  // dev repo compat
  updatedAt?: Date | string;  // dev repo compat
  [key: string]: any;
}

export interface PublicUser extends Omit<User, 'password_hash' | 'passwordHash'> {}

export interface WorkerProfile {
  id: string;
  user_id?: string;
  // new-schema columns
  village?: string | null;
  district?: string | null;
  state?: string;
  years_experience?: number | null;
  salt_pan_area_acres?: number | null;
  salt_type?: string | null;
  annual_production_kg?: number | null;
  cooperative_member?: boolean;
  cooperative_name?: string | null;
  bio?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
  // camelCase dev-repo fields
  userId?: string;
  workerId?: string;
  yearsOfWork?: number;
  familySize?: number;
  annualIncome?: number;
  isBPL?: boolean;
  hasDisability?: boolean;
  housingStatus?: string;
  hasBankAccount?: boolean;
  hasAadhaar?: boolean;
  isRegisteredWorker?: boolean;
  hasHealthInsurance?: boolean;
  saltProductionTonnesPerSeason?: number;
  preferredSaltType?: string;
  preferredSaltGrade?: string;
  profileCompletionPct?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: any;
}

export interface BuyerProfile {
  id: string;
  user_id?: string;
  userId?: string;            // dev repo compat
  company_name?: string | null;
  companyName?: string;       // dev repo compat
  business_type?: string | null;
  businessType?: string;      // dev repo compat
  location?: string | null;
  city?: string | null;
  state?: string | null;
  preferred_salt_type?: string | null;
  monthly_demand_kg?: number | null;
  bio?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
  createdAt?: Date | string;  // dev repo compat
  updatedAt?: Date | string;  // dev repo compat
  [key: string]: any;
}

export interface Notification {
  id: string;
  user_id?: string;
  userId?: string;
  type: string;
  title?: string;
  body?: string;
  message?: string;
  is_read?: boolean;
  isRead?: boolean;
  category?: string;
  link?: string;
  metadata?: Record<string, unknown> | null;
  created_at?: Date | string;
  createdAt?: Date | string;
  [key: string]: any;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

// ─── Salt Types ───────────────────────────────────────────────────────────────

export interface SaltType {
  id: string;
  name: string;
  nameGu?: string;
  description?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: string;
  [key: string]: any;
}

export interface SaltGrade {
  id: string;
  saltTypeId: string;
  name: string;
  nameGu?: string;
  description?: string;
  minNaClPercent?: number;
  typicalPriceRangeMin?: number;
  typicalPriceRangeMax?: number;
  sortOrder?: number;
  isActive: boolean;
  createdAt: string;
  [key: string]: any;
}

export interface SaltInventory {
  id: string;
  workerId: string;
  saltTypeId: string;
  saltGradeId: string;
  saltType?: SaltType;
  saltGrade?: SaltGrade;
  totalQuantityKg: number;
  availableQuantityKg: number;
  reservedQuantityKg: number;
  soldQuantityKg: number;
  expectedPricePerKg: number;
  harvestDate?: string;
  productionDate?: string;    // dev repo alias
  location: string;
  notes?: string;
  qualityNotes?: string;      // dev repo alias
  images?: string[];
  isArchived?: boolean;       // dev repo alias
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface SaltListing {
  id: string;
  workerId: string;
  inventoryId?: string;
  saltTypeId: string;
  saltGradeId: string;
  saltType?: SaltType;
  saltGrade?: SaltGrade;
  worker?: Partial<User>;
  quantityKg: number;
  askingPricePerKg: number;
  minOrderKg?: number;
  availableFrom?: string;
  season?: string;
  description?: string;
  qualityDescription?: string; // dev repo alias
  pickupLocation?: string;     // dev repo alias
  district?: string;
  state?: string;
  images?: string[];
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'SOLD';
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface BuyerRequest {
  id: string;
  buyerId: string;
  buyer?: Partial<User>;
  saltTypeId?: string;
  saltGradeId?: string;
  saltType?: SaltType;
  saltGrade?: SaltGrade;
  quantityKg: number;
  targetPricePerKg?: number;
  location?: string;
  district?: string;           // dev repo alias
  requiredBy?: string;
  requiredByDate?: string;     // dev repo alias
  description?: string;
  qualityRequirements?: string; // dev repo alias
  additionalNotes?: string;     // dev repo alias
  status: 'OPEN' | 'FILLED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface SavedListing {
  id: string;
  userId: string;
  listingId: string;
  listing?: SaltListing;
  savedAt?: string;
  createdAt?: string; // dev repo compat
}

export interface Offer {
  id: string;
  listingId: string;
  listing?: SaltListing;
  buyerId: string;
  buyer?: Partial<User>;
  workerId: string;
  worker?: Partial<User>;
  pricePerKg: number;
  quantityKg: number;
  totalAmount: number;
  message?: string;
  parentOfferId?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'WITHDRAWN' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
}

export interface OfferHistory {
  id: string;
  offerId: string;
  actorId: string;
  actorRole: 'buyer' | 'worker' | 'admin';
  eventType: 'OFFER' | 'COUNTER' | 'ACCEPT' | 'REJECT' | 'WITHDRAW' | 'EXPIRE';
  pricePerKg: number;
  quantityKg: number;
  message?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  transactionRef: string;
  offerId?: string;
  listingId?: string;
  listing?: SaltListing;
  sellerId: string;
  seller?: Partial<User>;
  buyerId: string;
  buyer?: Partial<User>;
  saltTypeId?: string;
  saltGradeId?: string;
  saltType?: SaltType;
  saltGrade?: SaltGrade;
  quantityKg: number;
  agreedPricePerKg: number;
  totalAmount: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';
  paymentMethod?: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketPrice {
  id: string;
  saltTypeId: string;
  saltGradeId?: string;      // dev repo alias
  saltType?: SaltType;
  region?: string;
  market?: string;           // dev repo alias
  location?: string;         // dev repo alias
  pricePerKg: number;
  dataStatus?: string;       // dev repo alias
  source?: string;
  recordedAt: string;
  createdAt: string;
  [key: string]: any;
}

// ─── AI / Chat ─────────────────────────────────────────────────────────────────

export type AgentType =
  | 'marketplace'
  | 'healthcare'
  | 'welfare'
  | 'safety'
  | 'community'
  | 'salt_price'
  | 'general';

export interface ChatAction {
  label: string;
  link?: string;
  url?: string;
  type?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentUsed?: AgentType[];
  actions?: ChatAction[];
  timestamp: string;
  createdAt?: string;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Lightweight history message for AI providers (no DB fields required)
export type HistoryMessage = { role: 'user' | 'assistant'; content: string };

export interface ChatRequest {
  message: string;
  userId?: string;
  workerId?: string;
  conversationHistory?: HistoryMessage[];
  language?: 'en' | 'gu';
  conversationId?: string;
}

export interface ChatResponse {
  message: string;
  agentsUsed: AgentType[];
  actions?: ChatAction[];
  timestamp: string;
  toolsUsed?: string[];
}

// ─── Legacy dev-repo types ─────────────────────────────────────────────────────

export interface SaltPriceEntry {
  id: string;
  saltType?: string;
  grade?: string;
  region?: string;
  pricePerKg?: number;
  // Extended dev fields
  market?: string;
  location?: string;
  qualityGrade?: string;
  pricePerTonne?: number;
  buyer?: string;
  date?: string;
  lastUpdated?: string;
  source: string;
  [key: string]: any;
}

export interface Worker {
  id: string;
  name: string;
  workerId: string;
  age: number;
  gender: string;
  location: string;
  occupation: string;
  experienceYears: number;
  familySize: number;
  annualIncome: number;
  isGujaratResident: boolean;
  isBPL: boolean;
  hasDisability: boolean;
  housingStatus: string;
  hasBankAccount: boolean;
  hasAadhaar: boolean;
  isRegisteredWorker: boolean;
  hasHealthInsurance: boolean;
  saltProduction: number;
  role?: string; // legacy dev data uses lowercase 'worker', 'buyer', etc.
  createdAt: string;
  [key: string]: any;
}

// ─── Healthcare ───────────────────────────────────────────────────────────────

export interface HealthcareRequest {
  id: string;
  workerId: string;
  symptoms?: string | string[];
  description?: string;
  severity?: string;
  status: string;
  coordinatorNotes?: string;
  requestedAt?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface HealthcareCamp {
  id: string;
  name: string;
  location: string;
  date: string;
  time: string;
  services: string[];
  contact: string;
  isActive: boolean;
  capacity?: number;
  registered?: number;
  [key: string]: any;
}

// ─── Welfare ──────────────────────────────────────────────────────────────────

export interface WelfareScheme {
  id: string;
  name: string;
  nameGu?: string;
  description: string;
  descriptionGu?: string;
  category: string;
  // eligibilityCriteria can be a string[] (dev data) or an object (new schema)
  eligibilityCriteria: string[] | {
    minAge?: number;
    maxAge?: number;
    requiresBPL?: boolean;
    requiresDisability?: boolean;
    requiresBankAccount?: boolean;
    requiresAadhaar?: boolean;
    requiresWorkerRegistration?: boolean;
    maxAnnualIncome?: number;
    requiresGujaratResidency?: boolean;
    [key: string]: any;
  };
  benefits?: string;
  applicationUrl?: string;
  applicationMethod?: string;
  officialSourceUrl?: string;
  lastVerified?: string;
  requiredDocuments: string[];
  isActive: boolean;
  [key: string]: any;
}

// ─── Safety ───────────────────────────────────────────────────────────────────

export interface SafetyReading {
  id: string;
  workerId: string;
  temperature: number;
  humidity: number;
  heatIndex: number;
  riskLevel?: string;
  safetyLevel?: string;
  recommendation?: string;
  recordedAt?: string;
  timestamp?: string;
  workingDurationHours?: number;
  waterAvailability?: string;
  restBreaksTaken?: number;
  source?: string;
  [key: string]: any;
}

export interface SafetyIncident {
  id: string;
  workerId: string;
  workerName?: string;
  type?: string;
  description: string;
  severity: string;
  location?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface SafetyAlert {
  id: string;
  type?: string;
  title?: string;
  message: string;
  severity?: string;
  affectedArea?: string;
  isActive: boolean;
  createdAt: string;
  [key: string]: any;
}

// ─── Community ────────────────────────────────────────────────────────────────

export interface CommunityNotice {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface SupportRequest {
  id: string;
  workerId: string;
  workerName?: string;
  category: string;
  subject?: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

// ─── Welfare Matching ─────────────────────────────────────────────────────────

export type WelfareMatchResult = 'LIKELY_ELIGIBLE' | 'POSSIBLY_ELIGIBLE' | 'NEEDS_VERIFICATION' | 'NOT_MATCHING';

export interface WelfareMatch {
  scheme: WelfareScheme;
  result: WelfareMatchResult;
  score: number;
  matchedCriteria: string[];
  missingInfo: string[];
  explanation: string;
  nextStep: string;
}

// ─── Safety Level ─────────────────────────────────────────────────────────────

export type SafetyLevel = 'SAFE' | 'CAUTION' | 'HIGH_RISK' | 'EMERGENCY';

// ─── Price Comparison ─────────────────────────────────────────────────────────

export interface PriceComparison {
  quantity: number;
  buyerOffer: number;
  referencePrice: number;
  offerValue: number;
  referenceValue: number;
  difference: number;
  percentageDifference: number;
  assessment: 'FAIR' | 'BELOW_MARKET' | 'ABOVE_MARKET';
}

// ─── Shared API Response ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Express augmentation ─────────────────────────────────────────────────────
// Global type augmentation is handled in types/express.d.ts
