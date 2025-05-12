const express = require('express');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        telegram_id,
        username,
        coin_balance,
        total_earned,
        level,
        taps_remaining,
        last_tap_time,
        referral_code,
        referred_by,
        created_at
      `)
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get user's referral stats
router.get('/referrals', authMiddleware, async (req, res) => {
  try {
    const { data: referrals, error: referralsError } = await supabase
      .from('users')
      .select('id')
      .eq('referred_by', req.user.id);

    if (referralsError) throw referralsError;

    const { data: earnings, error: earningsError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', req.user.id)
      .eq('type', 'referral');

    if (earningsError) throw earningsError;

    const totalEarnings = earnings.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      totalReferrals: referrals.length,
      totalEarnings
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

// Get user's level progress
router.get('/level', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('total_earned, level')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'coin_settings')
      .single();

    if (settingsError) throw settingsError;

    const { levelUpThreshold } = settings.value;
    const nextLevelThreshold = (user.level + 1) * levelUpThreshold;
    const progress = (user.total_earned / nextLevelThreshold) * 100;

    res.json({
      currentLevel: user.level,
      totalEarned: user.total_earned,
      nextLevelThreshold,
      progress: Math.min(progress, 100)
    });
  } catch (error) {
    console.error('Error fetching level progress:', error);
    res.status(500).json({ error: 'Failed to fetch level progress' });
  }
});

// Admin: Get all users
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { data: users, error, count } = await supabase
      .from('users')
      .select(`
        id,
        telegram_id,
        username,
        coin_balance,
        total_earned,
        level,
        referral_code,
        referred_by,
        is_admin,
        created_at
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Update user
router.patch('/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { coin_balance, level, is_admin } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({
        coin_balance,
        level,
        is_admin
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
