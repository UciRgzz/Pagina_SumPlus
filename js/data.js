/* ================= CONFIG Y ALMACENAMIENTO COMPARTIDO (Supabase) =================*/

const IMAGES_BUCKET = 'imagenes';
const MAX_IMG_WIDTH = 1400;
const JPEG_QUALITY = 0.8;
const ANNOUNCEMENT_MAX_AGE_DAYS = 7; // los anuncios se borran solos pasados estos días

/* ---- Comprime la imagen seleccionada a un Blob JPEG liviano, listo para subir ---- */
function compressImage(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        let { width, height } = img;
        if(width > MAX_IMG_WIDTH){
          height = Math.round(height * (MAX_IMG_WIDTH / width));
          width = MAX_IMG_WIDTH;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen')),
          'image/jpeg', JPEG_QUALITY
        );
      };
      img.onerror = () => reject(new Error('Archivo de imagen inválido'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/* ---- Sube un Blob de imagen al bucket público y devuelve su URL ---- */
async function uploadImage(blob){
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabaseClient.storage.from(IMAGES_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if(error){
    alert('No se pudo subir la imagen: ' + error.message);
    return null;
  }
  const { data } = supabaseClient.storage.from(IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function deleteImageByUrl(url){
  if(!url) return;
  const path = url.split(`/${IMAGES_BUCKET}/`).pop();
  if(!path) return;
  await supabaseClient.storage.from(IMAGES_BUCKET).remove([path]);
}

/* ================= ANUNCIOS ================= */
function announcementCutoffIso(){
  return new Date(Date.now() - ANNOUNCEMENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function rowToAnnouncement(row){
  return { id: row.id, title: row.title, desc: row.description || '', eventDate: row.event_date, image: row.image_url, createdAt: row.created_at };
}

async function fetchAnnouncements(){
  const { data, error } = await supabaseClient
    .from('announcements')
    .select('*')
    .gte('created_at', announcementCutoffIso())
    .order('created_at', { ascending: true });
  if(error){ console.error(error); return []; }
  return data.map(rowToAnnouncement);
}

async function addAnnouncement({ title, desc, eventDate, imageBlob }){
  let image_url = null;
  if(imageBlob){
    image_url = await uploadImage(imageBlob);
    if(image_url === null && imageBlob) return false; // falló la subida, ya se avisó al usuario
  }
  const { error } = await supabaseClient.from('announcements').insert({
    title, description: desc || null, event_date: eventDate || null, image_url,
  });
  if(error){ alert('No se pudo guardar el anuncio: ' + error.message); return false; }
  return true;
}

async function deleteAnnouncement(id, imageUrl){
  const { error } = await supabaseClient.from('announcements').delete().eq('id', id);
  if(error){ alert('No se pudo eliminar: ' + error.message); return false; }
  if(imageUrl) await deleteImageByUrl(imageUrl);
  return true;
}

// Borra (fila + imagen) los anuncios ya vencidos. Se llama desde el editor al cargar.
async function pruneExpiredAnnouncements(){
  const cutoff = announcementCutoffIso();
  const { data } = await supabaseClient.from('announcements').select('id, image_url').lt('created_at', cutoff);
  if(!data || data.length === 0) return;
  await supabaseClient.from('announcements').delete().lt('created_at', cutoff);
  data.forEach(row => { if(row.image_url) deleteImageByUrl(row.image_url); });
}

// Devuelve los días que le quedan a un anuncio antes de expirar
function announcementDaysLeft(createdAtIso){
  const ageMs = Date.now() - new Date(createdAtIso).getTime();
  const daysLeft = ANNOUNCEMENT_MAX_AGE_DAYS - Math.floor(ageMs / (24 * 60 * 60 * 1000));
  return Math.max(daysLeft, 0);
}

/* ================= VIDEOS ================= */
async function fetchVideos(){
  const { data, error } = await supabaseClient.from('videos').select('*').order('created_at', { ascending: true });
  if(error){ console.error(error); return []; }
  return data.map(row => ({ id: row.id, url: row.url, title: row.title || '', youtubeId: row.youtube_id }));
}

async function addVideo({ url, title, youtubeId }){
  const { error } = await supabaseClient.from('videos').insert({ url, title: title || null, youtube_id: youtubeId });
  if(error){ alert('No se pudo guardar el video: ' + error.message); return false; }
  return true;
}

async function deleteVideo(id){
  const { error } = await supabaseClient.from('videos').delete().eq('id', id);
  if(error){ alert('No se pudo eliminar: ' + error.message); return false; }
  return true;
}

/* ================= CUMPLEAÑOS ================= */
async function fetchBirthdays(){
  const { data, error } = await supabaseClient.from('birthdays').select('*').order('created_at', { ascending: true });
  if(error){ console.error(error); return []; }
  return data.map(row => ({ id: row.id, name: row.name, month: row.month, day: row.day, photo: row.photo_url }));
}

async function addBirthday({ name, month, day, photoBlob }){
  let photo_url = null;
  if(photoBlob){
    photo_url = await uploadImage(photoBlob);
    if(photo_url === null) return false;
  }
  const { error } = await supabaseClient.from('birthdays').insert({ name, month, day, photo_url });
  if(error){ alert('No se pudo guardar el cumpleaños: ' + error.message); return false; }
  return true;
}

async function deleteBirthday(id, photoUrl){
  const { error } = await supabaseClient.from('birthdays').delete().eq('id', id);
  if(error){ alert('No se pudo eliminar: ' + error.message); return false; }
  if(photoUrl) await deleteImageByUrl(photoUrl);
  return true;
}

/* ================= PALABRA DEL DÍA (versículo manual) ================= */
async function fetchVerse(){
  const { data, error } = await supabaseClient.from('verse').select('*').eq('id', 1).maybeSingle();
  if(error || !data || !data.text) return null;
  return { text: data.text, reference: data.reference };
}

async function saveVerse({ text, reference }){
  const { error } = await supabaseClient.from('verse').upsert({ id: 1, text, reference, updated_at: new Date().toISOString() });
  if(error){ alert('No se pudo guardar la palabra del día: ' + error.message); return false; }
  return true;
}

async function clearVerse(){
  const { error } = await supabaseClient.from('verse').delete().eq('id', 1);
  if(error){ alert('No se pudo restablecer el versículo automático: ' + error.message); return false; }
  return true;
}

/* ================= VERSÍCULO AUTOMÁTICO DEL DÍA =================
   Si no hay un versículo manual guardado (arriba), se muestra uno de esta lista
   elegido automáticamente según el día del año, y se trae el texto de una API
   pública de la Biblia (Versión Biblia Libre) para no tener que cargarlo a mano.
   Esto sí se cachea por dispositivo en localStorage: no es contenido que el
   encargado edite, cada pantalla lo puede volver a pedir sin problema. */
const STORAGE_KEY_AUTO_VERSE = 'tv_versiculo_auto_v1';
const BIBLE_API_VERSION = 'es-vbl';

const VERSE_REFERENCES = [
  { book:'salmos', chapter:23, verse:1, ref:'Salmos 23:1' },
  { book:'proverbios', chapter:3, verse:5, ref:'Proverbios 3:5' },
  { book:'isaías', chapter:41, verse:10, ref:'Isaías 41:10' },
  { book:'romanos', chapter:8, verse:28, ref:'Romanos 8:28' },
  { book:'josué', chapter:1, verse:9, ref:'Josué 1:9' },
  { book:'mateo', chapter:6, verse:33, ref:'Mateo 6:33' },
  { book:'1corintios', chapter:13, verse:4, ref:'1 Corintios 13:4' },
  { book:'gálatas', chapter:5, verse:22, ref:'Gálatas 5:22' },
  { book:'jeremías', chapter:29, verse:11, ref:'Jeremías 29:11' },
  { book:'2timoteo', chapter:1, verse:7, ref:'2 Timoteo 1:7' },
  { book:'santiago', chapter:1, verse:5, ref:'Santiago 1:5' },
  { book:'salmos', chapter:46, verse:1, ref:'Salmos 46:1' },
  { book:'filipenses', chapter:4, verse:13, ref:'Filipenses 4:13' },
  { book:'filipenses', chapter:4, verse:6, ref:'Filipenses 4:6' },
  { book:'proverbios', chapter:16, verse:3, ref:'Proverbios 16:3' },
  { book:'isaías', chapter:40, verse:31, ref:'Isaías 40:31' },
  { book:'mateo', chapter:11, verse:28, ref:'Mateo 11:28' },
  { book:'juan', chapter:14, verse:27, ref:'Juan 14:27' },
  { book:'romanos', chapter:12, verse:2, ref:'Romanos 12:2' },
  { book:'efesios', chapter:2, verse:8, ref:'Efesios 2:8' },
  { book:'hebreos', chapter:11, verse:1, ref:'Hebreos 11:1' },
  { book:'1corintios', chapter:10, verse:13, ref:'1 Corintios 10:13' },
  { book:'salmos', chapter:91, verse:1, ref:'Salmos 91:1' },
  { book:'deuteronomio', chapter:31, verse:6, ref:'Deuteronomio 31:6' },
  { book:'lucas', chapter:1, verse:37, ref:'Lucas 1:37' },
  { book:'marcos', chapter:11, verse:24, ref:'Marcos 11:24' },
  { book:'colosenses', chapter:3, verse:23, ref:'Colosenses 3:23' },
  { book:'proverbios', chapter:22, verse:6, ref:'Proverbios 22:6' },
  { book:'números', chapter:6, verse:24, ref:'Números 6:24' },
  { book:'génesis', chapter:1, verse:1, ref:'Génesis 1:1' },
  { book:'1juan', chapter:4, verse:19, ref:'1 Juan 4:19' },
  { book:'efesios', chapter:4, verse:32, ref:'Efesios 4:32' },
  { book:'salmos', chapter:37, verse:4, ref:'Salmos 37:4' },
];

function todayKey(){
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function pickDailyReference(){
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return VERSE_REFERENCES[dayOfYear % VERSE_REFERENCES.length];
}

// Verso manual (si existe) tiene prioridad; si no, el automático ya cacheado para hoy.
async function loadDisplayVerse(){
  const manual = await fetchVerse();
  if(manual) return manual;
  try{
    const raw = localStorage.getItem(STORAGE_KEY_AUTO_VERSE);
    if(!raw) return null;
    const cached = JSON.parse(raw);
    return cached.date === todayKey() ? { text: cached.text, reference: cached.reference } : null;
  }catch(e){ return null; }
}

// Trae de la API el versículo del día si aún no está cacheado para hoy.
async function refreshAutoVerse(){
  const raw = localStorage.getItem(STORAGE_KEY_AUTO_VERSE);
  let cached = null;
  try{ cached = raw ? JSON.parse(raw) : null; }catch(e){}
  if(cached && cached.date === todayKey()) return false;

  const picked = pickDailyReference();
  try{
    const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${BIBLE_API_VERSION}/books/${encodeURIComponent(picked.book)}/chapters/${picked.chapter}/verses/${picked.verse}.json`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('verse http error');
    const data = await res.json();
    localStorage.setItem(STORAGE_KEY_AUTO_VERSE, JSON.stringify({ text: data.text.trim(), reference: picked.ref, date: todayKey() }));
    return true;
  }catch(e){
    return false;
  }
}

function initials(name){
  return (name || '').trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase() || '').join('');
}

const BIRTHDAY_MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

//función para calcular los días que faltan para un evento a partir de su fecha (en formato YYYY-MM-DD)
function daysUntilEvent(dateStr){
  if(!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const eventDay = new Date(y, m - 1, d);
  eventDay.setHours(0,0,0,0);
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.round((eventDay - today) / (24 * 60 * 60 * 1000));
}

function formatEventDate(dateStr){
  if(!dateStr) return '';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} de ${BIRTHDAY_MONTH_NAMES[m - 1]}`;
}

// ¿Cae este cumpleaños dentro del mes actual? (coincide con el título "Cumpleaños del mes")
function isBirthdayInCurrentMonth(month){
  return month === (new Date().getMonth() + 1);
}

function extractYouTubeId(url){
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for(const re of patterns){
    const m = url.match(re);
    if(m) return m[1];
  }
  return null;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
