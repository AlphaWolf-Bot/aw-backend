const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { addHours, isPast } = require('date-fns');

// Get user's coin balance
router.get('/balance', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('users')
      .select('coin_balance, total_earned, level, taps_remaining, last_tap_time')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    // Check if tap reset is needed
    if (data.last_tap_time) {
      const resetTime = addHours(new Date(data.last_tap_time), 4);
      
      if (isPast(resetTime) && data.taps_remaining < 100) {
        // Reset taps remaining
        await supabase
          .from('users')
          .update({ taps_remaining: 100 })
          .eq('id', userId);
          
        data.taps_remaining = 100;
      }
    }
    
    res.json({
      coinBalance: data.coin_balance,
      totalEarned: data.total_earned,
      level: data.level,
      tapsRemaining: data.taps_remaining,
      resetTime: data.last_tap_time ? addHours(new Date(data.last_tap_time), 4).toISOString() : null,
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get coin balance',
    });
  }
});

// Earn coins by tapping
router.post('/tap', async (req, res) => {
  try {
    const userId = req.user.id;
    const COINS_PER_TAP = 5;
    
    // Get user's current tap status
    const { data: user, error } = await supabase
      .from('users')
      .select('taps_remaining, last_tap_time')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    // Check if user has taps remaining
    if (user.taps_remaining <= 0) {
      // Check if reset time has passed
      if (user.last_tap_time) {
        const resetTime = addHours(new Date(user.last_tap_time), 4);
        
        if (isPast(resetTime)) {
          // Reset taps remaining
          await supabase
            .from('users')
            .update({
              taps_remaining: 99, // Subtract 1 for current tap
              last_tap_time: new Date().toISOString(),
            })
            .eq('id', userId);
        } else {
          return res.status(429).json({
            error: true,
            message: 'No taps remaining',
            resetTime: resetTime.toISOString(),
          });
        }
      } else {
        return res.status(429).json({
          error: true,
          message: 'No taps remaining',
        });
      }
    } else {
      // Decrement taps remaining
      await supabase
        .from('users')
        .update({
          taps_remaining: user.taps_remaining - 1,
          last_tap_time: new Date().toISOString(),
        })
        .eq('id', userId);
    }
    
    // Add coins to balance
    const { data, error: updateError } = await supabase.rpc('add_coins', {
      user_id: userId,
      amount: COINS_PER_TAP,
      transaction_type: 'tap',
      description: 'Earned from tapping',
    });
    
    if (updateError) {
      throw updateError;
    }
    
    // Get updated balance
    const { data: updatedUser, error: balanceError } = await supabase
      .from('users')
      .select('coin_balance, total_earned, level, taps_remaining')
      .eq('id', userId)
      .single();
      
    if (balanceError) {
      throw balanceError;
    }
    
    res.json({
      success: true,
      coinsEarned: COINS_PER_TAP,
      coinBalance: updatedUser.coin_balance,
      totalEarned: updatedUser.total_earned,
      level: updatedUser.level,
      tapsRemaining: updatedUser.taps_remaining,
      resetTime: addHours(new Date(), 4).toISOString(),
    });
  } catch (error) {
    console.error('Tap error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to process tap',
    });
  }
});

// Complete social task
router.post('/task/:taskId/complete', async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    
    // Check if task exists
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('active', true)
      .single();
    
    if (taskError) {
      return res.status(404).json({
        error: true,
        message: 'Task not found',
      });
    }
    
    // Check if user already completed this task
    const { data: completed, error: completedError } = await supabase
      .from('user_completed_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .single();
    
    if (completed) {
      return res.status(400).json({
        error: true,
        message: 'Task already completed',
      });
    }
    
    // Start a transaction to add coins and mark task as completed
    const { data, error } = await supabase.rpc('complete_task', {
      p_user_id: userId,
      p_task_id: taskId,
      p_reward: task.reward,
    });
    
    if (error) {
      throw error;
    }
    
    // Get updated balance
    const { data: updatedUser, error: balanceError } = await supabase
      .from('users')
      .select('coin_balance, total_earned, level')
      .eq('id', userId)
      .single();
      
    if (balanceError) {
      throw balanceError;
    }
    
    res.json({
      success: true,
      coinsEarned: task.reward,
      coinBalance: updatedUser.coin_balance,
      totalEarned: updatedUser.total_earned,
      level: updatedUser.level,
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to complete task',
    });
  }
});

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get transactions
    const { data, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    res.json({
      transactions: data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get transactions',
    });
  }
});

module.exports = router; 