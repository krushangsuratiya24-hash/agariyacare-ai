import { Router } from 'express';
import {
  getProfile, updateProfile, updateWorkerProfile, updateBuyerProfile,
  uploadAvatar, completeOnboarding, getNotifications, markNotificationRead,
  updateProfileValidation, updateWorkerProfileValidation, updateBuyerProfileValidation,
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { avatarUpload } from '../middleware/upload';

const router = Router();

// All user routes require auth
router.use(authenticate);

router.get('/profile', getProfile);
router.patch('/profile', updateProfileValidation, updateProfile);
router.patch('/profile/worker', authorize('AGARIYA_WORKER'), updateWorkerProfileValidation, updateWorkerProfile);
router.patch('/profile/buyer', authorize('BUYER'), updateBuyerProfileValidation, updateBuyerProfile);
router.post('/profile/avatar', (req, res, next) => {
  avatarUpload(req, res, (err) => {
    if (err) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    next();
  });
}, uploadAvatar);
router.post('/onboarding/complete', completeOnboarding);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;
