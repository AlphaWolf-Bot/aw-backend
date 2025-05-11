import express from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = express.Router();

// Get active tournaments
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .in('status', ['upcoming', 'active'])
      .order('start_time', { ascending: true });

    if (error) throw error;

    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get tournament details and participants
router.get('/:tournamentId', authMiddleware, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.id;

    // Get tournament details
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) throw tournamentError;

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select(`
        *,
        users:user_id (
          username,
          first_name,
          last_name
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('position', { ascending: true });

    if (participantsError) throw participantsError;

    // Check if user is participating
    const userParticipation = participants.find(p => p.user_id === userId);

    res.json({
      tournament,
      participants,
      userParticipation
    });
  } catch (error) {
    console.error('Error fetching tournament details:', error);
    res.status(500).json({ error: 'Failed to fetch tournament details' });
  }
});

// Join tournament
router.post('/:tournamentId/join', authMiddleware, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.id;

    // Get tournament details
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) throw tournamentError;

    if (tournament.status !== 'upcoming') {
      return res.status(400).json({ error: 'Tournament is not open for joining' });
    }

    // Check if user has enough coins
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    if (user.coin_balance < tournament.entry_fee) {
      return res.status(400).json({ error: 'Insufficient coins to join tournament' });
    }

    // Check if user is already participating
    const { data: existingParticipation, error: participationError } = await supabase
      .from('tournament_participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId)
      .single();

    if (participationError && participationError.code !== 'PGRST116') {
      throw participationError;
    }

    if (existingParticipation) {
      return res.status(400).json({ error: 'Already participating in this tournament' });
    }

    // Deduct entry fee and add participant
    const { error: joinError } = await supabase.rpc('join_tournament', {
      p_user_id: userId,
      p_tournament_id: tournamentId,
      p_entry_fee: tournament.entry_fee
    });

    if (joinError) throw joinError;

    res.json({ message: 'Successfully joined tournament' });
  } catch (error) {
    console.error('Error joining tournament:', error);
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

// Admin: Create new tournament
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, entry_fee, prize_pool, start_time, end_time } = req.body;

    const { data: tournament, error } = await supabase
      .from('tournaments')
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

    res.status(201).json(tournament);
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Admin: Update tournament status
router.patch('/:tournamentId/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { status } = req.body;

    if (!['upcoming', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update({ status })
      .eq('id', tournamentId)
      .select()
      .single();

    if (error) throw error;

    res.json(tournament);
  } catch (error) {
    console.error('Error updating tournament status:', error);
    res.status(500).json({ error: 'Failed to update tournament status' });
  }
});

export default router; 