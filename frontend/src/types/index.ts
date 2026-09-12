export type UserRole = 'AGARIYA_WORKER' | 'BUYER' | 'COORDINATOR' | 'ADMIN';
export type LanguagePref = 'en' | 'gu';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  language_pref: LanguagePref;
  is_active: boolean;
  onboarding_completed: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  village: string | null;
  district: string | null;
  state: string;
  years_experience: number | null;
  salt_pan_area_acres: number | null;
  salt_type: string | null;
  annual_production_kg: number | null;
  cooperative_member: boolean;
  cooperative_name: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuyerProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  business_type: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  preferred_salt_type: string | null;
  monthly_demand_kg: number | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errors?: Array<{ msg: string; path: string }>;
}

// ─── Phase 5 additions ────────────────────────────────────────────────────────

export type SafetyLevel = 'SAFE' | 'NORMAL' | 'CAUTION' | 'HIGH_RISK' | 'EMERGENCY';

export interface HealthcareRequest {
  id: string;
  workerId: string;
  workerName?: string;
  symptoms?: string | string[];
  description?: string;
  severity?: string;
  status: string;
  coordinatorNotes?: string;
  assignedTo?: string;
  scheduledDate?: string;
  resolvedAt?: string;
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

export interface SafetyReading {
  id: string;
  workerId: string;
  temperature: number;
  humidity: number;
  heatIndex: number;
  safetyLevel?: string;
  riskLevel?: string;
  workingDurationHours?: number;
  waterAvailability?: string;
  restBreaksTaken?: number;
  source?: string;
  timestamp?: string;
  recordedAt?: string;
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
  coordinatorNotes?: string;
  assignedTo?: string;
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

export interface SaltInventory {
  id: string;
  workerId: string;
  saltTypeId: string;
  saltGradeId: string;
  saltType?: any;
  saltGrade?: any;
  totalQuantityKg: number;
  availableQuantityKg: number;
  reservedQuantityKg: number;
  soldQuantityKg: number;
  expectedPricePerKg: number;
  harvestDate?: string;
  location: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface SaltListing {
  id: string;
  workerId: string;
  saltTypeId: string;
  saltGradeId: string;
  saltType?: any;
  saltGrade?: any;
  worker?: Partial<User> & { name?: string; full_name?: string };
  quantityKg: number;
  askingPricePerKg: number;
  district?: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'SOLD';
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Offer {
  id: string;
  listingId: string;
  listing?: SaltListing;
  buyerId: string;
  buyer?: Partial<User> & { name?: string; full_name?: string };
  workerId: string;
  worker?: Partial<User> & { name?: string; full_name?: string };
  pricePerKg: number;
  quantityKg: number;
  totalAmount: number;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'WITHDRAWN' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Transaction {
  id: string;
  transactionRef: string;
  offerId?: string;
  listingId?: string;
  sellerId: string;
  buyerId: string;
  quantityKg: number;
  agreedPricePerKg: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface PublicUser extends User {
  name?: string;
  id: string;
}
