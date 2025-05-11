import { supabase } from '../config/supabase.js';

export const adminMiddleware = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Error in admin middleware:', error);
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
};
export default adminMiddleware;
