const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyWebhookSignature } = require('../middleware/webhook');

// Telegram webhook handler
router.post('/telegram', verifyWebhookSignature, async (req, res) => {
  try {
    const update = req.body;
    
    // Handle different types of updates
    if (update.message) {
      // Handle incoming messages
      const { message } = update;
      
      // Store message in database
      const { error } = await supabase
        .from('telegram_messages')
        .insert({
          message_id: message.message_id,
          chat_id: message.chat.id,
          user_id: message.from.id,
          text: message.text,
          type: message.type || 'text',
          created_at: new Date(message.date * 1000).toISOString()
        });

      if (error) throw error;
    }
    
    // Always respond with 200 OK to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// Payment webhook handler
router.post('/payment', verifyWebhookSignature, async (req, res) => {
  try {
    const paymentData = req.body;
    
    // Verify payment status
    if (paymentData.status === 'completed') {
      // Update user's coin balance
      const { error } = await supabase
        .from('users')
        .update({
          coin_balance: supabase.raw(`coin_balance + ${paymentData.amount}`),
          total_earned: supabase.raw(`total_earned + ${paymentData.amount}`)
        })
        .eq('id', paymentData.userId);

      if (error) throw error;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: paymentData.userId,
          amount: paymentData.amount,
          type: 'deposit',
          status: 'completed',
          payment_id: paymentData.paymentId,
          created_at: new Date().toISOString()
        });

      if (transactionError) throw transactionError;
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.sendStatus(500);
  }
});

// Withdrawal webhook handler
router.post('/withdrawal', verifyWebhookSignature, async (req, res) => {
  try {
    const withdrawalData = req.body;
    
    // Update withdrawal status
    const { error } = await supabase
      .from('withdrawals')
      .update({
        status: withdrawalData.status,
        processed_at: new Date().toISOString(),
        transaction_hash: withdrawalData.transactionHash
      })
      .eq('id', withdrawalData.withdrawalId);

    if (error) throw error;

    // If withdrawal failed, refund the coins
    if (withdrawalData.status === 'failed') {
      const { error: refundError } = await supabase
        .from('users')
        .update({
          coin_balance: supabase.raw(`coin_balance + ${withdrawalData.amount}`)
        })
        .eq('id', withdrawalData.userId);

      if (refundError) throw refundError;
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Withdrawal webhook error:', error);
    res.sendStatus(500);
  }
});

module.exports = router; 