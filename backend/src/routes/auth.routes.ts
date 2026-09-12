// Auth routes — signup, login, profile, change password

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { userRepo, workerProfileRepo, buyerProfileRepo } from '../repositories';
import { requireAuth, signToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'worker', phone, language = 'en' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'email, password, and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    if (!['worker', 'buyer', 'coordinator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const existing = await userRepo.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepo.create({
      email: email.toLowerCase(),
      passwordHash,
      role: role as UserRole,
      name,
      phone,
      language,
      onboardingCompleted: false,
      isActive: true,
    });

    // Create profile skeleton
    if (role === 'worker') {
      const workerCount = (await workerProfileRepo.findByUserId(user.id)) ? 0 : 1;
      await workerProfileRepo.create({
        userId: user.id,
        village: '',
        district: '',
        state: 'Gujarat',
        yearsOfWork: 0,
        saltProductionTonnesPerSeason: 0,
        familySize: 0,
        isRegisteredWorker: false,
        hasBankAccount: false,
        hasAadhaar: false,
        isBPL: false,
        hasDisability: false,
        hasHealthInsurance: false,
        housingStatus: 'rented',
        workerId: `AGW-${String(Date.now()).slice(-4)}`,
        profileCompletionPct: 10,
      });
    } else if (role === 'buyer') {
      await buyerProfileRepo.create({
        userId: user.id,
        businessType: '',
        location: '',
        district: '',
        state: 'Gujarat',
        preferredSaltTypes: [],
        preferredGrades: [],
        typicalOrderQuantityTonnes: 0,
        buyerId: `AGB-${String(Date.now()).slice(-4)}`,
      });
    }

    const token = signToken({ userId: user.id, role: user.role, email: user.email });

    const { passwordHash: _, ...publicUser } = user;
    res.status(201).json({ success: true, data: { user: publicUser, token } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Signup failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email and password are required' });
    }

    const user = await userRepo.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    const { passwordHash: _, ...publicUser } = user;
    res.json({ success: true, data: { user: publicUser, token } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await userRepo.findById(authReq.user!.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const { passwordHash: _, ...publicUser } = user;
    res.json({ success: true, data: publicUser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, phone, language, profilePhoto } = req.body;
    const updated = await userRepo.update(authReq.user!.userId, { name, phone, language, profilePhoto });
    if (!updated) return res.status(404).json({ success: false, error: 'User not found' });
    const { passwordHash: _, ...publicUser } = updated;
    res.json({ success: true, data: publicUser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/onboarding
router.put('/onboarding', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const updated = await userRepo.update(authReq.user!.userId, { onboardingCompleted: true });
    if (!updated) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, message: 'Onboarding completed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Valid current and new password (min 6 chars) required' });
    }
    const user = await userRepo.findById(authReq.user!.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, error: 'Current password incorrect' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await userRepo.updatePassword(user.id, newHash);
    res.json({ success: true, message: 'Password updated' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/worker-profile
router.get('/worker-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const profile = await workerProfileRepo.findByUserId(authReq.user!.userId);
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/worker-profile
router.put('/worker-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const profile = await workerProfileRepo.update(authReq.user!.userId, req.body);
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/buyer-profile
router.get('/buyer-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const profile = await buyerProfileRepo.findByUserId(authReq.user!.userId);
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/buyer-profile
router.put('/buyer-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const profile = await buyerProfileRepo.update(authReq.user!.userId, req.body);
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
