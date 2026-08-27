import { Router } from 'express';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend server is running smoothly',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
