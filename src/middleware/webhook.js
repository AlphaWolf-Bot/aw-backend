import crypto from 'crypto';

export const verifyWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    
    if (!signature || !timestamp) {
      return res.status(401).json({
        error: true,
        message: 'Missing webhook signature or timestamp'
      });
    }

    // Verify timestamp is not too old (within 5 minutes)
    const timestampAge = Date.now() - parseInt(timestamp);
    if (timestampAge > 5 * 60 * 1000) {
      return res.status(401).json({
        error: true,
        message: 'Webhook timestamp is too old'
      });
    }

    // Get the raw body
    const rawBody = JSON.stringify(req.body);
    
    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
    hmac.update(`${timestamp}.${rawBody}`);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures
    if (signature !== expectedSignature) {
      return res.status(401).json({
        error: true,
        message: 'Invalid webhook signature'
      });
    }

    next();
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    res.status(500).json({
      error: true,
      message: 'Error verifying webhook signature'
    });
  }
}; 