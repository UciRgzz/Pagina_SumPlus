/* ================= CONFIGURACIÓN DE SUPABASE =================*/
   
const SUPABASE_URL = 'https://qpeugqplqlahcsvhsudb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xu-R5c-dSFZ_BQwZW3D1ng_QHOx66Qz';


const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
