import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkazmxfwvbiidjpadmbq.supabase.co';
const supabaseAnonKey = 'sb_publishable_e7aESqZuXV6I5l0BX0Vh0Q_mKIeOb2K';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);