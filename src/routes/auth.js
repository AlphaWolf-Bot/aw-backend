const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { validateTelegramAuth } = require('../services/telegram');

// Login with Telegram
router.post('/login', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({
        error: true,
        message: 'Missing initData parameter',
      });
    }
    
    // Parse and validate Telegram auth data
    const authData = Object.fromEntries(new URLSearchParams(initData));
    
    if (!validateTelegramAuth(authData)) {
      return res.status(401).json({
        error: true,
        message: 'Invalid authentication data',
      });
    }
    
    // Extract user data
    const userData = JSON.parse(authData.user || '{}');
    const telegramId = userData.id;
    
    if (!telegramId) {
      return res.status(400).json({
        error: true,
        message: 'Invalid user data',
      });
    }
    
    // Check if user exists
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // If user doesn't exist, create new user
    if (!user) {
      const referralCode = generateReferralCode(8);
      
      // Extract referral from query if present
      const queryParams = new URLSearchParams(authData.start_param || '');
      const referredBy = queryParams.get('ref');
      
      let referredByUserId = null;
      
      // If referred by someone, find the referrer
      if (referredBy) {
        const { data: referrer } = await supabase
          .from('users')
          .select('id')
          .eq('referral_code', referredBy)
          .single();
          
        if (referrer) {
          referredByUserId = referrer.id;
        }
      }
      
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          username: userData.username || null,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          coin_balance: 0,
          total_earned: 0,
          level: 1,
          taps_remaining: 100,
          referral_code: referralCode,
          referred_by: referredByUserId,
        })
        .select()
        .single();
      
      if (createError) {
        throw createError;
      }
      
      user = newUser;
      
      // If referred by someone, reward them
      if (referredByUserId) {
        await rewardReferrer(referredByUserId, user.id);
      }
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, telegramId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user data and token
    res.json({
      user: {
        id: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        coinBalance: user.coin_balance,
        totalEarned: user.total_earned,
        level: user.level,
        tapsRemaining: user.taps_remaining,
        referralCode: user.referral_code,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: true,
      message: 'Authentication failed',
    });
  }
});

// Refresh user data
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Missing authentication token',
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }
    
    // Return user data
    res.json({
      user: {
        id: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        coinBalance: user.coin_balance,
        totalEarned: user.total_earned,
        level: user.level,
        tapsRemaining: user.taps_remaining,
        referralCode: user.referral_code,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({
      error: true,
      message: 'Invalid or expired token',
    });
  }
});

// Generate a random referral code
function generateReferralCode(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

// Reward referrer
async function rewardReferrer(referrerId, referredUserId) {
  const REFERRAL_REWARD = 50;
  
  // Start transaction
  const { data, error } = await supabase.rpc('reward_referrer', {
    referrer_id: referrerId,
    referred_user_id: referredUserId,
    reward_amount: REFERRAL_REWARD,
  });
  
  if (error) {
    console.error('Error rewarding referrer:', error);
  }
}

module.exports = router; 