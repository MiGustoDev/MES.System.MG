import { supabase } from './supabase';

export interface DailyPlanningContext {
  date: string;
  converter_raw_text: string | null;
  converter_data: unknown[] | null;
  daily_goal_paste: string | null;
  daily_goal_data: Record<string, number> | null;
}

const CONVERTER_PASTE_KEY = 'converter_paste';
const CONVERTER_RESULTS_KEY = 'converter_results';

export function readConverterFromLocalStorage(): {
  rawText: string;
  parsedRows: unknown[];
} {
  const rawText = localStorage.getItem(CONVERTER_PASTE_KEY) ?? '';
  const parsedRaw = localStorage.getItem(CONVERTER_RESULTS_KEY);
  if (!parsedRaw) return { rawText, parsedRows: [] };
  try {
    const parsed = JSON.parse(parsedRaw);
    return { rawText, parsedRows: Array.isArray(parsed) ? parsed : [] };
  } catch {
    return { rawText, parsedRows: [] };
  }
}

export function applyConverterToLocalStorage(rawText: string, parsedRows: unknown[] | null | undefined) {
  localStorage.setItem(CONVERTER_PASTE_KEY, rawText ?? '');
  if (parsedRows && parsedRows.length > 0) {
    localStorage.setItem(CONVERTER_RESULTS_KEY, JSON.stringify(parsedRows));
  } else {
    localStorage.removeItem(CONVERTER_RESULTS_KEY);
  }
  window.dispatchEvent(new CustomEvent('daily-context-loaded'));
}

export async function loadDailyPlanningContext(date: string): Promise<DailyPlanningContext | null> {
  const { data, error } = await (supabase
    .from('daily_planning_context') as any)
    .select('*')
    .eq('date', date)
    .maybeSingle();

  if (error) {
    console.error('Error loading daily planning context:', error);
    return null;
  }
  return (data as DailyPlanningContext) ?? null;
}

export async function saveDailyPlanningContext(
  date: string,
  payload: {
    converterRawText: string;
    converterData: unknown[];
    dailyGoalPaste: string;
    dailyGoalData: Record<string, number>;
  }
): Promise<void> {
  const row = {
    date,
    converter_raw_text: payload.converterRawText || null,
    converter_data: payload.converterData.length > 0 ? payload.converterData : null,
    daily_goal_paste: payload.dailyGoalPaste || null,
    daily_goal_data: Object.keys(payload.dailyGoalData).length > 0 ? payload.dailyGoalData : null,
  };

  const { error } = await (supabase
    .from('daily_planning_context') as any)
    .upsert(row, { onConflict: 'date' });

  if (error) throw error;
}
