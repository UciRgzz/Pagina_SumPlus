/* ================= CONFIGURACIÓN DE SUPABASE =================
   Pasos para dejar esto funcionando (una sola vez):
   1. Crea una cuenta gratis en https://supabase.com y un proyecto nuevo.
   2. Abre "SQL Editor" en el proyecto y ejecuta todo el contenido de schema.sql
      (crea las tablas, los permisos y activa el tiempo real).
   3. Abre "Storage" y crea un bucket llamado exactamente  imagenes  , marcado como Public.
   4. En "Project Settings" > "API" copia el "Project URL" y la "anon public key"
      y pégalos abajo, reemplazando los dos textos de ejemplo.
   Sin estos 4 pasos la página no va a poder guardar ni mostrar nada. */
   
const SUPABASE_URL = 'https://qpeugqplqlahcsvhsudb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xu-R5c-dSFZ_BQwZW3D1ng_QHOx66Qz';


const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
