import { supabase } from '../config/supabase.js';

export const getSettings = async (key) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) throw error;
    return data.value;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    throw error;
  }
};

export const updateSettings = async (key, value) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    throw error;
  }
};

export const getCoinSettings = async () => {
  try {
    const settings = await getSettings('coin_settings');
    return settings || {
      tapReward: 1,
      maxTapsPerDay: 100,
      tapCooldown: 60, // seconds
      referralReward: 100,
      levelUpThreshold: 1000
    };
  } catch (error) {
    console.error('Error fetching coin settings:', error);
    throw error;
  }
};

export const getWithdrawalSettings = async () => {
  try {
    const settings = await getSettings('withdrawal_settings');
    return settings || {
      minWithdrawal: 1000,
      maxWithdrawal: 10000,
      processingFee: 0.05, // 5%
      processingTime: 24 // hours
    };
  } catch (error) {
    console.error('Error fetching withdrawal settings:', error);
    throw error;
  }
}; 