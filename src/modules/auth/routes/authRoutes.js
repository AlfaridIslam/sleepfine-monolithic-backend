import express from 'express';
import { login, logout, checkAuth, refreshToken } from '../controllers/authController.js';
import { authenticate } from '../../../middlewares/auth.js';
import { validateRequest, businessSchemas } from '../../../middlewares/validateRequest.js';

const router = express.Router();

// Public auth routes
router.post('/login', validateRequest(businessSchemas.login), login);

// Protected auth routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, checkAuth);
router.post('/refresh', authenticate, refreshToken);

export default router;
