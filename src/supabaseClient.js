import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pwccuebhemosmvjptlsc.supabase.co';
const supabaseAnonKey = 'sb_publishable_eJ11VvkKMr5RwlMYi0p2fA_hw4OSxBr';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
