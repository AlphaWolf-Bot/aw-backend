const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Get withdrawal history
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get withdrawals
    const { data, error, count } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    res.json({
      withdrawals: data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get withdrawals',
    });
  }
});

// Create withdrawal request
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, upiId } = req.body;
    
    // Validate input
    if (!amount || amount < 1000 || !upiId) {
      return res.status(400).json({
        error: true,
        message: 'Invalid withdrawal request. Minimum amount is 1000 coins and UPI ID is required.',
      });
    }
    
    // Check UPI ID format
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    if (!upiRegex.test(upiId)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid UPI ID format',
      });
    }
    
    // Get user's balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('coin_balance')
      .eq('id', userId)
      .single();
    
    if (userError) {
      throw userError;
    }
    
    // Check if user has enough balance
    if (user.coin_balance < amount) {
      return res.status(400).json({
        error: true,
        message: 'Insufficient coin balance',
      });
    }
    
    // Calculate INR amount (1000 coins = 10 INR)
    const amountInr = (amount / 1000) * 10;
    
    // Start transaction to create withdrawal and deduct coins
    const { data, error } = await supabase.rpc('create_withdrawal', {
      p_user_id: userId,
      p_amount_coins: amount,
      p_amount_inr: amountInr,
      p_upi_id: upiId,
    });
    
    if (error) {
      throw error;
    }
    
    // Get updated balance
    const { data: updatedUser, error: balanceError } = await supabase
      .from('users')
      .select('coin_balance')
      .eq('id', userId)
      .single();
      
    if (balanceError) {
      throw balanceError;
    }
    
    res.json({
      success: true,
      message: 'Withdrawal request submitted for approval',
      withdrawalId: data.withdrawal_id,
      coinBalance: updatedUser.coin_balance,
    });
  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to process withdrawal request',
    });
  }
});

module.exports = router; 