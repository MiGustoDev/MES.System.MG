
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dugupwzsojsppkrqptzy.supabase.co'
const supabaseKey = 'sb_publishable_Cwv9_voLgbNWtvckXSJbaw_9s0oWAwT'
const supabase = createClient(supabaseUrl, supabaseKey)

const date = '2026-02-14'

const SHIFT_TYPES = ['Mañana', 'Tarde', 'Noche'];
const SECTOR_PRODUCTS = {
  'Mesa de Carnes': [
    'AGUJA', 'TAPA DE ASADO', 'BOLA LOMO', 'ROAST BEEF', 'VACIO', 'MATAMBRE',
    'PALETA DE CERDO', 'BONDIOLA DE CERDO', 'PALETA DE VACA', 'PECHO DE CERDO', 'POLLO', 'CUADRADA',
  ],
  'Cocina': [
    'CP', 'EB', 'AC', 'BB', 'MPP', 'CY', 'CC', 'CA', 'CS', 'PO', 'PA', 'PC', 'JQ', 'VP', 'MT', 'QC', 'CH', 'V', 'JH', '4Q', 'CZ', 'CZ COCIDA', 'QC S/P', 'MPP S/P', 'CEBOLLA CC', 'FONDEO', 'SOFRITO', 'VACIO LIMPIO', 'VACIO PICADO', 'MATAMBRE SIN PICAR',
  ],
  'Picadillo': [
    'CP', 'EB', 'AC', 'BB', 'MPP', 'CY', 'CC', 'CA', 'CS', 'PO', 'PA', 'PC', 'JQ', 'VP', 'MT', 'QC', 'CH', 'V', 'JH', '4Q', 'CZ', 'MUZZA 330GR', 'MUZZA 2.5KG', 'HEBRAS', 'HUEVO', 'MUZZARELLA PICADA ARMADO', 'PANCETA FETEADA', 'CHEDDAR PICADO', 'JAMON FETEADA', 'JAMON CUBETEADO', 'PROVOLETA PICADA', 'SARDO PICADO', 'CHEDDAR AC', 'CHEDDAR EB', 'CHEDDAR TONADITA', 'PESADO CH', 'CHERRY', 'PESADO 4Q', 'PESADO RJ', 'BOLLOS JQ',
  ],
  'Armado': [
    'CP', 'EB', 'AC', 'BB', 'MPP', 'CYR', 'CC', 'CA', 'CS', 'PO', 'PA', 'PC', 'JQ', 'VP', 'MT', 'QC', 'RJ', 'CH', 'V', 'JH', '4Q', 'CZ',
  ],
  'Salsas': [
    'SALSA AJO', 'SALSA CHEDDAR', 'SALSA BARBACOA', 'CHIMICHURRI ENV', 'CHIMICHURRI PIC', 'CREMA ACIDA', 'SALSA KETCHUP', 'SALSA BIG BURGER', 'SALSA BURGER', 'SALSA CRIOLLA', 'SALSA MATAMBRE', 'SALSA PIZZA',
  ],
};

const machines = ['MÁQUINA 1', 'MÁQUINA 2', 'MÁQUINA 3']
const names = ['Juan Perez', 'Maria Garcia', 'Carlos Lopez', 'Ana Martinez', 'Diego Rodriguez', 'Elena Sanchez']

async function populate() {
  console.log(`Populating ALL PRODUCTS across ALL tables for ${date}...`)
  
  const historyData = []
  const programmingData = []
  const productionData = []

  for (const [sector, products] of Object.entries(SECTOR_PRODUCTS)) {
    for (const shift of SHIFT_TYPES) {
      for (const product of products) {
        const planned = Math.floor(Math.random() * 100) + 50
        const variation = Math.floor(Math.random() * 21) - 10
        const produced = planned + variation
        const diff = produced - planned
        const status = diff > 0 ? 'Adelanto' : (diff === 0 ? 'OK' : 'Atraso')
        const machine = sector === 'Armado' ? machines[Math.floor(Math.random() * machines.length)] : null
        const cargador = names[Math.floor(Math.random() * names.length)]
        const checker = names[Math.floor(Math.random() * names.length)]
        const obs = Math.random() > 0.9 ? 'Revisión de calidad aprobada' : null

        const common = {
          date, sector, product, shift_type: shift,
          machine, cargador, checker, observations: obs,
          created_at: new Date().toISOString()
        }

        historyData.push({ ...common, planned, produced, difference: diff, status })
        programmingData.push({ ...common, planned_kg: planned })
        productionData.push({ ...common, planned, produced, updated_at: new Date().toISOString() })
      }
    }
  }

  console.log("Cleaning up old demo data...")
  await supabase.from('history').delete().eq('date', date)
  await supabase.from('programming').delete().eq('date', date)
  await supabase.from('production').delete().eq('date', date)

  console.log(`Inserting ${historyData.length} records...`)
  
  // Batch insert to avoid large request issues
  const chunkSize = 100;
  for (let i = 0; i < historyData.length; i += chunkSize) {
    await supabase.from('history').insert(historyData.slice(i, i + chunkSize))
    await supabase.from('programming').insert(programmingData.slice(i, i + chunkSize))
    await supabase.from('production').insert(productionData.slice(i, i + chunkSize))
  }

  console.log(`Successfully inserted COMPLETE data for ${date}.`)
}

populate()
