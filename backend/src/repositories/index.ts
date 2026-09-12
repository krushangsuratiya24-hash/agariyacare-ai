// Repository singletons — one instance shared across the app
// Phase 5: healthcare, safety, notifications, and emergency use Postgres repos
// when DATABASE_URL is set, otherwise fall back to dev in-memory repos.

import {
  DevUserRepository, DevWorkerProfileRepository, DevBuyerProfileRepository,
  DevSaltClassificationRepository, DevSaltInventoryRepository, DevSaltListingRepository,
  DevBuyerRequestRepository, DevSavedListingRepository,
  DevOfferRepository, DevOfferHistoryRepository, DevTransactionRepository,
  DevMarketPriceRepository, DevHealthcareRepository, DevWelfareRepository,
  DevSafetyRepository, DevCommunityRepository, DevNotificationRepository,
  DevChatRepository, DevWorkerRepository,
} from './dev.repositories';

import {
  PgHealthcareRepository,
  PgSafetyRepository,
  PgNotificationRepository,
  PgEmergencyRepository,
} from './pg.repositories';

export type { EmergencyEvent, HealthcareNote } from './pg.repositories';

const HAS_DB = !!process.env.DATABASE_URL;

export const userRepo = new DevUserRepository();
export const workerProfileRepo = new DevWorkerProfileRepository();
export const buyerProfileRepo = new DevBuyerProfileRepository();
export const saltClassRepo = new DevSaltClassificationRepository();
export const saltInventoryRepo = new DevSaltInventoryRepository();
export const saltListingRepo = new DevSaltListingRepository();
export const buyerRequestRepo = new DevBuyerRequestRepository();
export const savedListingRepo = new DevSavedListingRepository();
export const offerRepo = new DevOfferRepository();
export const offerHistoryRepo = new DevOfferHistoryRepository();
export const transactionRepo = new DevTransactionRepository();
export const marketPriceRepo = new DevMarketPriceRepository();
export const healthcareRepo: PgHealthcareRepository | DevHealthcareRepository = HAS_DB ? new PgHealthcareRepository() : new DevHealthcareRepository();
export const welfareRepo = new DevWelfareRepository();
export const safetyRepo: PgSafetyRepository | DevSafetyRepository = HAS_DB ? new PgSafetyRepository() : new DevSafetyRepository();
export const communityRepo = new DevCommunityRepository();
export const notificationRepo: PgNotificationRepository | DevNotificationRepository = HAS_DB ? new PgNotificationRepository() : new DevNotificationRepository();
export const chatRepo = new DevChatRepository();
export const workerRepo = new DevWorkerRepository(); // legacy compat
export const emergencyRepo = new PgEmergencyRepository();
