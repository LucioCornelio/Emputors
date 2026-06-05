import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aqxleorkndmencmjczfx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeGxlb3JrbmRtZW5jbWpjemZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MzY0NTEsImV4cCI6MjA5NjIxMjQ1MX0.yLsVABBxacO5t9mAoAS6IaTCFpsWYLDlXdbAsW2kKfw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)