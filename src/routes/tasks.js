import express from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all active tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('active', true);

    if (error) throw error;

    // Get user's completed tasks
    const { data: completedTasks, error: completedError } = await supabase
      .from('user_completed_tasks')
      .select('task_id')
      .eq('user_id', req.user.id);

    if (completedError) throw completedError;

    const completedTaskIds = new Set(completedTasks.map(t => t.task_id));

    // Add completion status to tasks
    const tasksWithStatus = tasks.map(task => ({
      ...task,
      completed: completedTaskIds.has(task.id)
    }));

    res.json(tasksWithStatus);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Complete a task
router.post('/:taskId/complete', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // Check if task exists and is active
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('active', true)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found or inactive' });
    }

    // Check if task is already completed
    const { data: existingCompletion, error: completionError } = await supabase
      .from('user_completed_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .single();

    if (completionError && completionError.code !== 'PGRST116') {
      throw completionError;
    }

    if (existingCompletion) {
      return res.status(400).json({ error: 'Task already completed' });
    }

    // Complete the task and reward the user
    const { error: completeError } = await supabase.rpc('complete_task', {
      p_user_id: userId,
      p_task_id: taskId,
      p_reward: task.reward
    });

    if (completeError) throw completeError;

    res.json({ 
      message: 'Task completed successfully',
      reward: task.reward
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

export default router; 