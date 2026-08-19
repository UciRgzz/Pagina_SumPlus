/* ================= CONFIG Y ALMACENAMIENTO COMPARTIDO =================*/

const STORAGE_KEY = 'tv_anuncios_v1';
const STORAGE_KEY_VIDEOS = 'tv_videos_v1';
const STORAGE_KEY_BIRTHDAYS = 'tv_cumpleanos_v1';
const STORAGE_KEY_VERSE = 'tv_versiculo_v1';
const VIDEOS_SEEDED_KEY = 'tv_videos_seeded_v1';
const MAX_IMG_WIDTH = 1400;
const JPEG_QUALITY = 0.8;

// Videos con los que arranca la lista la primera vez que se abre la página en un navegador nuevo (ej. el TV).
const DEFAULT_VIDEOS = [
  { url:'https://youtu.be/l_6e2-ZsKpE?si=xs_rXl1LzbHlgNFi', title:'' },
  { url:'https://youtu.be/Aq6t9gFY9bk', title:'' },
];
//creamos la función para cargar y guardar la lista de anuncios y videos en el localStorage del navegador.
function loadList(key){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveList(key, list, itemLabel){
  try{
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  }catch(e){
    alert(`No se pudo guardar: el almacenamiento del navegador está lleno. Elimina algún ${itemLabel} o usa imágenes más ligeras.`);
    return false;
  }
}
const loadAnnouncements = ()=> loadList(STORAGE_KEY);
const saveAnnouncements = (list)=> saveList(STORAGE_KEY, list, 'anuncio con imagen');
const loadVideos = ()=> loadList(STORAGE_KEY_VIDEOS);
const saveVideos = (list)=> saveList(STORAGE_KEY_VIDEOS, list, 'video');
const loadBirthdays = ()=> loadList(STORAGE_KEY_BIRTHDAYS);
const saveBirthdays = (list)=> saveList(STORAGE_KEY_BIRTHDAYS, list, 'cumpleaños');

function loadVerse(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_VERSE);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveVerse(verse){
  try{
    localStorage.setItem(STORAGE_KEY_VERSE, JSON.stringify(verse));
    return true;
  }catch(e){
    alert('No se pudo guardar la palabra del día: el almacenamiento del navegador está lleno.');
    return false;
  }
}
function clearVerse(){
  localStorage.removeItem(STORAGE_KEY_VERSE);
}

function initials(name){
  return (name || '').trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase() || '').join('');
}

const BIRTHDAY_MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ¿Cae este cumpleaños (mes/día) dentro de la semana actual (lunes a domingo)?
function isBirthdayInCurrentWeek(month, day){
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7; // Domingo=0..Sábado=6 -> lunes=0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);

  const years = new Set([monday.getFullYear(), sunday.getFullYear()]);
  for(const y of years){
    const candidate = new Date(y, month - 1, day);
    if(candidate >= monday && candidate <= sunday) return true;
  }
  return false;
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
//creamos la función para inicializar la lista de videos con los predeterminados si no hay videos guardados en el localStorage.
function seedDefaultVideosIfNeeded(list){
  if(list.length > 0 || localStorage.getItem(VIDEOS_SEEDED_KEY)) return list;
  const seeded = DEFAULT_VIDEOS
    .map((v, i)=> ({ url:v.url, title:v.title, youtubeId: extractYouTubeId(v.url), id: Date.now() + i }))
    .filter(v => v.youtubeId);
  saveVideos(seeded);
  localStorage.setItem(VIDEOS_SEEDED_KEY, '1');
  return seeded;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
