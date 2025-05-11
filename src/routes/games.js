import express from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = express.Router();

// Get active games
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .in('status', ['upcoming', 'active'])
      .order('start_time', { ascending: true });

    if (error) throw error;

    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get game results
router.get('/:gameId/results', authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.id;

    // Get game details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;

    // Get results
    const { data: results, error: resultsError } = await supabase
      .from('game_results')
      .select(`
        *,
        users:user_id (
          username,
          first_name,
          last_name
        )
      `)
      .eq('game_id', gameId)
      .order('position', { ascending: true });

    if (resultsError) throw resultsError;

    // Get user's result if exists
    const userResult = results.find(r => r.user_id === userId);

    res.json({
      game,
      results,
      userResult
    });
  } catch (error) {
    console.error('Error fetching game results:', error);
    res.status(500).json({ error: 'Failed to fetch game results' });
  }
});

// Admin: Create new game
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, entry_fee, prize_pool, start_time, end_time } = req.body;

    const { data: game, error } = await supabase
      .from('games')
      .insert([{
        title,
        description,
        entry_fee,
        prize_pool,
        start_time,
        end_time,
        status: 'upcoming'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Admin: Update game status
router.patch('/:gameId/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { status } = req.body;

    if (!['upcoming', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: game, error } = await supabase
      .from('games')
      .update({ status })
      .eq('id', gameId)
      .select()
      .single();

    if (error) throw error;

    res.json(game);
  } catch (error) {
    console.error('Error updating game status:', error);
    res.status(500).json({ error: 'Failed to update game status' });
  }
});

export default router; 