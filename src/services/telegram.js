const crypto = require('crypto');

const validateTelegramAuth = (authData) => {
  try {
    const data = {};
    const hash = authData.hash;
    
    // Remove hash from verification
    delete authData.hash;

    // Create data check string
    const dataCheckArr = Object.keys(authData)
      .sort()
      .map(key => `${key}=${authData[key]}`);
    
    const dataCheckString = dataCheckArr.join('\n');
    
    // Create secret key for HMAC
    const secret = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    
    // Get HMAC-SHA-256 signature of data check string with secret
    const signature = crypto
      .createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');

    // Check if signatures match
    return signature === hash;
  } catch (error) {
    console.error('Telegram auth validation error:', error);
    return false;
  }
};

module.exports = {
  validateTelegramAuth,
}; 