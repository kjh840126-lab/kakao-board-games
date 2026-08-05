import { createClient } from '@supabase/supabase-js';

// ⚠️ Supabase 대시보드 > Project Settings > API 에서 확인 가능한 URL과 Anon Key를 입력해 주세요.
const SUPABASE_URL = 'https://eogtjzeodbriahwmaqfw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A_DKwqE7Ygs2VAiKSSuVxQ_YyjhXfgb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);