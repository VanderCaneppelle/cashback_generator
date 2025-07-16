import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    'https://rowzwykzflwxejhfrejx.supabase.co', // URL do seu projeto
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvd3p3eWt6Zmx3eGVqaGZyZWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODQ5MTgsImV4cCI6MjA2ODI2MDkxOH0.VWM4DBpPUkb8iJ_CQtAwBXTZH-P8C792JBMo3LEepuw' // anon public key
); 