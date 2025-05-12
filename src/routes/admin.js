const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch users'
    });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch user'
    });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update user'
    });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete user'
    });
  }
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalCoins }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gt('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('users').select('coin_balance').then(({ data }) => ({
        count: data.reduce((sum, user) => sum + user.coin_balance, 0)
      }))
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalCoins
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch statistics'
    });
  }
});

module.exports = router; 