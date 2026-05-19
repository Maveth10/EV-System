import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tkeigbxkmvctjryijhgw.supabase.co';
const supabaseKey = 'sb_publishable_ZWfUDMzpfOt9nk5i07aFVA_0VMpxsLr';

export const supabase = createClient(supabaseUrl, supabaseKey);