import { Router } from 'express';
import {
  signup, login, logout, getMe,
  signupValidation, loginValidation,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
