const adminMiddleware = (req, res, next) => {
  try {
    const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];
    
    if (!adminIds.includes(req.user.telegram_id.toString())) {
      return res.status(403).json({
        error: true,
        message: 'Admin access required',
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error',
    });
  }
};

module.exports = adminMiddleware; 