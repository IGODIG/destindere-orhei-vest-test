/* Configurație centrală pentru repository-ul de test */
const DEFAULT_CONFIG = {
  apiUrl: "https://script.google.com/macros/s/AKfycbwoWCpAnPVs-kUEd6JBCRiV30ZRYsPfFP69s4PSK_8H5TYuhrzHjr6Q48UL1VodKMPQ/exec",
  event: {},
  countdown: {},
  gallery: { images: [] },
  memories: {},
  features: { items: [] },
  participation: { fields: {} },
  stats: { cards: [] },
  food: { products: [] },
  location: {},
  modules: []
};

function deepMerge(target, source) {
  Object.keys(source || {}).forEach(k => {
    if (source[k] && typeof source[k] === "object" && !Array.isArray(source[k])) {
      target[k] = deepMerge(target[k] || {}, source[k]);
    } else target[k] = source[k];
  });
  return target;
}
function normalizeTheme(value) {
  const theme = String(value || "").trim().toLowerCase();
  return ["auto","spring","summer","autumn","winter"].includes(theme) ? theme : "auto";
}

function resolveThemeFromDate(dateValue) {
  const raw = String(dateValue || "").trim();
  if (!raw) return "spring";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "spring";
  const month = Number(match[2]);
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function resolveTheme(cfg) {
  const event = cfg?.event || {};
  const configured = normalizeTheme(event.theme);
  return configured === "auto" ? resolveThemeFromDate(event.date) : configured;
}

function normalizeConfig(c) {
  c = deepMerge(structuredClone(DEFAULT_CONFIG), c || {});
  c.event = c.event || {};
  c.event.theme = normalizeTheme(c.event.theme);
  c.gallery = c.gallery || {images:[]};
  c.gallery.images = Array.isArray(c.gallery.images) ? c.gallery.images : [];
  c.features = c.features || {items:[]};
  c.features.items = Array.isArray(c.features.items) ? c.features.items : [];
  c.food = c.food || {products:[]};
  c.food.products = Array.isArray(c.food.products) ? c.food.products : [];
  c.stats = c.stats || {cards:[]};
  c.stats.cards = Array.isArray(c.stats.cards) ? c.stats.cards : [];
  c.participation = c.participation || {fields:{}};
  c.participation.fields = c.participation.fields || {};
  c.modules = Array.isArray(c.modules) ? c.modules : [];
  c.apiUrl = DEFAULT_CONFIG.apiUrl;
  return c;
}
var CONFIG = normalizeConfig({});

async function apiGet(params) {
  const u = new URL(DEFAULT_CONFIG.apiUrl);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k,v));
  u.searchParams.set("_", Date.now());
  const r = await fetch(u,{cache:"no-store"});
  if(!r.ok) throw new Error("Server HTTP "+r.status);
  const d = await r.json();
  if(!d.success) throw new Error(d.message || d.error || "Operația nu a reușit.");
  return d;
}
async function apiPost(data) {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([k,v]) => body.set(k, typeof v === "object" ? JSON.stringify(v) : String(v ?? "")));
  const r = await fetch(DEFAULT_CONFIG.apiUrl,{method:"POST",body});
  if(!r.ok) throw new Error("Server HTTP "+r.status);
  const d = await r.json();
  if(!d.success) throw new Error(d.message || d.error || "Operația nu a reușit.");
  return d;
}
async function fetchEvents(){ return (await apiGet({type:"events"})).events || []; }
async function fetchEvent(id){ return (await apiGet({type:"event",eventId:id})).event; }
async function saveEventCentral(event,userId){
  const ev=event.config?.event||{};
  const d=await apiPost({
    action:"saveEvent",
    eventId:event.id,
    config:event.config,
    status:event.status,
    activeFrom:event.activeFrom||"",
    activeUntil:event.activeUntil||"",
    name:ev.name||"",
    congregation:ev.congregation||"",
    date:ev.date||"",
    time:ev.time||"",
    location:ev.location||"",
    theme:ev.theme||"auto",
    updatedBy:userId||""
  });
  return d.event;
}
async function createEventCentral(sourceEventId,userId){
  const d=await apiPost({action:"createEvent",sourceEventId,updatedBy:userId||""});
  return d.event;
}
async function activateEventCentral(eventId,activeFrom,activeUntil,userId){
  const d=await apiPost({action:"activateEvent",eventId,activeFrom:activeFrom||"",activeUntil:activeUntil||"",updatedBy:userId||""});
  return d.event;
}
async function archiveEventCentral(eventId,userId){
  const d=await apiPost({action:"archiveEvent",eventId,updatedBy:userId||""});
  return d.event;
}

async function deleteEventCentral(eventId,userId){
  return apiPost({action:"deleteEvent",eventId,updatedBy:userId||""});
}
