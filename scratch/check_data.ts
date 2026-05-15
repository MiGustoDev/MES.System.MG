
import { createClient } from '@supabase/supabase-client'
import * as dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .eq('date', '2026-05-13')
    .limit(10)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Sample data for 2026-05-13:', data)
  
  const { data: sectors } = await supabase
    .from('history')
    .select('sector')
    .eq('date', '2026-05-13')
  
  console.log('Unique sectors with data:', [...new Set(sectors?.map(s => s.sector))])
}

checkData()
