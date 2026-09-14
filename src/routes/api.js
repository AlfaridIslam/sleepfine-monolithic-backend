import express from 'express';
import authRoutes from '../modules/auth/routes/authRoutes.js';
import adminRoutes from '../modules/admin/routes/adminRoutes.js';
import salesRoutes from '../modules/sales/routes/salesRoutes.js';
import accountsRoutes from '../modules/accounts/routes/accountsRoutes.js';
import logisticsRoutes from '../modules/logistics/routes/logisticsRoutes.js';
import notificationsRoutes from '../modules/notifications/routes/notificationsRoutes.js';

const router = express.Router();

// Root API V1 check
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SleepFine Monolithic API v1',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mounted modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/sales', salesRoutes);
router.use('/accounts', accountsRoutes);
router.use('/logistics', logisticsRoutes);
router.use('/notifications', notificationsRoutes);

export default router;


