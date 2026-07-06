import { createClient } from '@supabase/supabase-js';

// Pulling the URL and Key from the .env file using Vite's syntax
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);