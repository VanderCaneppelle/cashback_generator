import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rowzwykzflwxejhfrejx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvd3p3eWt6Zmx3eGVqaGZyZWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODQ5MTgsImV4cCI6MjA2ODI2MDkxOH0.VWM4DBpPUkb8iJ_CQtAwBXTZH-P8C792JBMo3LEepuw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 