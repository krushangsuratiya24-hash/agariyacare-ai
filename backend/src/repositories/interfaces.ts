// Repository interfaces

import {
  User, PublicUser, WorkerProfile, BuyerProfile,
  SaltType, SaltGrade, SaltInventory, SaltListing, BuyerRequest, SavedListing,
  Offer, OfferHistory, Transaction, MarketPrice,
  HealthcareRequest, HealthcareCamp, WelfareScheme,
  SafetyReading, SafetyIncident, SafetyAlert,
  CommunityNotice, SupportRequest, Notification,
  ChatConversation, ChatMessage,
  // Legacy
  SaltPriceEntry, Worker,
} from '../types';

// ─── Auth / Users ─────────────────────────────────────────────────────────────

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, updates: Partial<Omit<User, 'id' | 'passwordHash'>>): Promise<User | null>;
  updatePassword(id: string, passwordHash: string): Promise<boolean>;
  findAll(): Promise<PublicUser[]>;
}

// ─── Worker Profile ───────────────────────────────────────────────────────────

export interface WorkerProfileRepository {
  findByUserId(userId: string): Promise<WorkerProfile | null>;
  create(data: Omit<WorkerProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkerProfile>;
  update(userId: string, updates: Partial<WorkerProfile>): Promise<WorkerProfile | null>;
}

// ─── Buyer Profile ────────────────────────────────────────────────────────────

export interface BuyerProfileRepository {
  findByUserId(userId: string): Promise<BuyerProfile | null>;
  create(data: Omit<BuyerProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<BuyerProfile>;
  update(userId: string, updates: Partial<BuyerProfile>): Promise<BuyerProfile | null>;
}

// ─── Salt Classification ──────────────────────────────────────────────────────

export interface SaltClassificationRepository {
  findAllTypes(activeOnly?: boolean): Promise<SaltType[]>;
  findTypeById(id: string): Promise<SaltType | null>;
  createType(data: Omit<SaltType, 'id' | 'createdAt'>): Promise<SaltType>;
  updateType(id: string, updates: Partial<SaltType>): Promise<SaltType | null>;

  findGradesByTypeId(saltTypeId: string): Promise<SaltGrade[]>;
  findGradeById(id: string): Promise<SaltGrade | null>;
  findAllGrades(activeOnly?: boolean): Promise<SaltGrade[]>;
  createGrade(data: Omit<SaltGrade, 'id' | 'createdAt'>): Promise<SaltGrade>;
  updateGrade(id: string, updates: Partial<SaltGrade>): Promise<SaltGrade | null>;
}

// ─── Salt Inventory ───────────────────────────────────────────────────────────

export interface SaltInventoryRepository {
  findById(id: string): Promise<SaltInventory | null>;
  findByWorkerId(workerId: string): Promise<SaltInventory[]>;
  create(data: Omit<SaltInventory, 'id' | 'createdAt' | 'updatedAt'>): Promise<SaltInventory>;
  update(id: string, updates: Partial<SaltInventory>): Promise<SaltInventory | null>;
  adjustQuantity(id: string, deltaAvailable: number, deltaReserved: number, deltaSold: number): Promise<SaltInventory | null>;
}

// ─── Salt Listings ────────────────────────────────────────────────────────────

export interface SaltListingRepository {
  findById(id: string): Promise<SaltListing | null>;
  findAll(filters?: {
    saltTypeId?: string;
    saltGradeId?: string;
    status?: string;
    workerId?: string;
    district?: string;
    minQuantityKg?: number;
    maxPricePerKg?: number;
    search?: string;
  }): Promise<SaltListing[]>;
  findByWorkerId(workerId: string): Promise<SaltListing[]>;
  create(data: Omit<SaltListing, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>): Promise<SaltListing>;
  update(id: string, updates: Partial<SaltListing>): Promise<SaltListing | null>;
  incrementView(id: string): Promise<void>;
}

// ─── Buyer Requests ───────────────────────────────────────────────────────────

export interface BuyerRequestRepository {
  findById(id: string): Promise<BuyerRequest | null>;
  findAll(filters?: { buyerId?: string; saltTypeId?: string; status?: string; district?: string }): Promise<BuyerRequest[]>;
  findByBuyerId(buyerId: string): Promise<BuyerRequest[]>;
  create(data: Omit<BuyerRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<BuyerRequest>;
  update(id: string, updates: Partial<BuyerRequest>): Promise<BuyerRequest | null>;
}

// ─── Saved Listings ───────────────────────────────────────────────────────────

export interface SavedListingRepository {
  findByUserId(userId: string): Promise<SavedListing[]>;
  save(userId: string, listingId: string): Promise<SavedListing>;
  unsave(userId: string, listingId: string): Promise<boolean>;
  isSaved(userId: string, listingId: string): Promise<boolean>;
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export interface OfferRepository {
  findById(id: string): Promise<Offer | null>;
  findByListingId(listingId: string): Promise<Offer[]>;
  findByBuyerId(buyerId: string): Promise<Offer[]>;
  findByWorkerId(workerId: string): Promise<Offer[]>;
  findPendingByListingId(listingId: string): Promise<Offer[]>;
  create(data: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Offer>;
  update(id: string, updates: Partial<Offer>): Promise<Offer | null>;
}

export interface OfferHistoryRepository {
  findByOfferId(offerId: string): Promise<OfferHistory[]>;
  create(data: Omit<OfferHistory, 'id' | 'createdAt'>): Promise<OfferHistory>;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByRef(ref: string): Promise<Transaction | null>;
  findBySellerId(sellerId: string): Promise<Transaction[]>;
  findByBuyerId(buyerId: string): Promise<Transaction[]>;
  create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  update(id: string, updates: Partial<Transaction>): Promise<Transaction | null>;
  getNextRef(): Promise<string>;
}

// ─── Market Prices ────────────────────────────────────────────────────────────

export interface MarketPriceRepository {
  findAll(filters?: { saltTypeId?: string; saltGradeId?: string }): Promise<MarketPrice[]>;
  findLatest(): Promise<MarketPrice[]>;
  create(data: Omit<MarketPrice, 'id' | 'createdAt'>): Promise<MarketPrice>;
  update(id: string, updates: Partial<MarketPrice>): Promise<MarketPrice | null>;
  // Legacy
  findAllPrices(filters?: { saltType?: string; location?: string }): Promise<SaltPriceEntry[]>;
  getLatestPrices(): Promise<SaltPriceEntry[]>;
  getPriceTrend(days: number): Promise<SaltPriceEntry[]>;
  createEntry(entry: Omit<SaltPriceEntry, 'id'>): Promise<SaltPriceEntry>;
}

// ─── Healthcare ───────────────────────────────────────────────────────────────

export interface HealthcareRepository {
  findRequestById(id: string): Promise<HealthcareRequest | null>;
  findAllRequests(filters?: { workerId?: string; status?: string }): Promise<HealthcareRequest[]>;
  createRequest(req: Omit<HealthcareRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<HealthcareRequest>;
  updateRequest(id: string, updates: Partial<HealthcareRequest>): Promise<HealthcareRequest | null>;
  findAllCamps(): Promise<HealthcareCamp[]>;
  findCampById(id: string): Promise<HealthcareCamp | null>;
  createCamp(camp: Omit<HealthcareCamp, 'id'>): Promise<HealthcareCamp>;
  updateCamp(id: string, updates: Partial<HealthcareCamp>): Promise<HealthcareCamp | null>;
}

// ─── Welfare ──────────────────────────────────────────────────────────────────

export interface WelfareRepository {
  findAllSchemes(activeOnly?: boolean): Promise<WelfareScheme[]>;
  findSchemeById(id: string): Promise<WelfareScheme | null>;
  createScheme(scheme: Omit<WelfareScheme, 'id'>): Promise<WelfareScheme>;
  updateScheme(id: string, updates: Partial<WelfareScheme>): Promise<WelfareScheme | null>;
}

// ─── Safety ───────────────────────────────────────────────────────────────────

export interface SafetyRepository {
  findReadings(workerId?: string): Promise<SafetyReading[]>;
  createReading(reading: Omit<SafetyReading, 'id'>): Promise<SafetyReading>;
  findIncidents(filters?: { workerId?: string; status?: string }): Promise<SafetyIncident[]>;
  findIncidentById(id: string): Promise<SafetyIncident | null>;
  createIncident(incident: Omit<SafetyIncident, 'id' | 'createdAt' | 'updatedAt'>): Promise<SafetyIncident>;
  updateIncident(id: string, updates: Partial<SafetyIncident>): Promise<SafetyIncident | null>;
  findActiveAlerts(): Promise<SafetyAlert[]>;
  createAlert(alert: Omit<SafetyAlert, 'id' | 'createdAt'>): Promise<SafetyAlert>;
}

// ─── Community ────────────────────────────────────────────────────────────────

export interface CommunityRepository {
  findAllNotices(activeOnly?: boolean): Promise<CommunityNotice[]>;
  findNoticeById(id: string): Promise<CommunityNotice | null>;
  createNotice(notice: Omit<CommunityNotice, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommunityNotice>;
  updateNotice(id: string, updates: Partial<CommunityNotice>): Promise<CommunityNotice | null>;
  deleteNotice(id: string): Promise<boolean>;
  findAllSupportRequests(filters?: { workerId?: string; status?: string }): Promise<SupportRequest[]>;
  findSupportRequestById(id: string): Promise<SupportRequest | null>;
  createSupportRequest(req: Omit<SupportRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupportRequest>;
  updateSupportRequest(id: string, updates: Partial<SupportRequest>): Promise<SupportRequest | null>;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationRepository {
  findByUserId(userId: string): Promise<Notification[]>;
  findUnreadByUserId(userId: string): Promise<Notification[]>;
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  markAsRead(id: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<boolean>;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatRepository {
  findConversationsByUserId(userId: string): Promise<ChatConversation[]>;
  findConversationById(id: string): Promise<ChatConversation | null>;
  createConversation(data: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatConversation>;
  updateConversation(id: string, updates: Partial<ChatConversation>): Promise<ChatConversation | null>;
  findMessagesByConversationId(conversationId: string): Promise<ChatMessage[]>;
  createMessage(data: Omit<ChatMessage, 'id'>): Promise<ChatMessage>;
}

// ─── Legacy Worker (compat) ───────────────────────────────────────────────────

export interface WorkerRepository {
  findById(id: string): Promise<Worker | null>;
  findAll(): Promise<Worker[]>;
  create(worker: Omit<Worker, 'id' | 'createdAt'>): Promise<Worker>;
  update(id: string, updates: Partial<Worker>): Promise<Worker | null>;
  delete(id: string): Promise<boolean>;
}
