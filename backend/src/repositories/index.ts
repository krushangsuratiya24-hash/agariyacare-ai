// Repository singletons — one instance shared across the app

import {
  DevUserRepository, DevWorkerProfileRepository, DevBuyerProfileRepository,
  DevSaltClassificationRepository, DevSaltInventoryRepository, DevSaltListingRepository,
  DevBuyerRequestRepository, DevSavedListingRepository,
  DevOfferRepository, DevOfferHistoryRepository, DevTransactionRepository,
  DevMarketPriceRepository, DevHealthcareRepository, DevWelfareRepository,
  DevSafetyRepository, DevCommunityRepository, DevNotificationRepository,
  DevChatRepository, DevWorkerRepository,
} from './dev.repositories';

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
export const healthcareRepo = new DevHealthcareRepository();
export const welfareRepo = new DevWelfareRepository();
export const safetyRepo = new DevSafetyRepository();
export const communityRepo = new DevCommunityRepository();
export const notificationRepo = new DevNotificationRepository();
export const chatRepo = new DevChatRepository();
export const workerRepo = new DevWorkerRepository(); // legacy compat
