import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { getCoinSettings, getWithdrawalSettings, updateSettings } from '../services/settings.js';

const router = express.Router();

// Get coin settings
router.get('/coins', authMiddleware, async (req, res) => {
  try {
    const settings = await getCoinSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching coin settings:', error);
    res.status(500).json({ error: 'Failed to fetch coin settings' });
  }
});

// Get withdrawal settings
router.get('/withdrawals', authMiddleware, async (req, res) => {
  try {
    const settings = await getWithdrawalSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching withdrawal settings:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal settings' });
  }
});

// Admin: Update coin settings
router.put('/coins', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { tapReward, maxTapsPerDay, tapCooldown, referralReward, levelUpThreshold } = req.body;

    const settings = await updateSettings('coin_settings', {
      tapReward,
      maxTapsPerDay,
      tapCooldown,
      referralReward,
      levelUpThreshold
    });

    res.json(settings.value);
  } catch (error) {
    console.error('Error updating coin settings:', error);
    res.status(500).json({ error: 'Failed to update coin settings' });
  }
});

// Admin: Update withdrawal settings
router.put('/withdrawals', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { minWithdrawal, maxWithdrawal, processingFee, processingTime } = req.body;

    const settings = await updateSettings('withdrawal_settings', {
      minWithdrawal,
      maxWithdrawal,
      processingFee,
      processingTime
    });

    res.json(settings.value);
  } catch (error) {
    console.error('Error updating withdrawal settings:', error);
    res.status(500).json({ error: 'Failed to update withdrawal settings' });
  }
});

export default router; 