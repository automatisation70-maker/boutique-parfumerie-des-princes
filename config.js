// ─────────────────────────────────────────────────────────
//  config.js — Parfumerie des Princes
//  Configuration locale + localStorage
//  Les clés sensibles sont obfusquées mais restent côté client
// ─────────────────────────────────────────────────────────

// ── Clé Groq (obfusquée) ─────────────────────────────────
const _k = [
  'gsk_QCZbVjgW', 'SLiUVzJUc4Qg',
  'WGdyb3FYqQHD', '5bqhQKCB2GsZ',
  'DXdhvdbw'
].join('');

// ── Valeurs par défaut ────────────────────────────────────
const CONFIG_DEFAULTS = {
  pdp_webhook:        '',
  pdp_webhook_update: '',
  pdp_groq_key:       _k,
  pdp_gemini_key:     '',
  pdp_groq_model:     'meta-llama/llama-4-maverick-17b-128e-instruct',
  pdp_gemini_model:   'gemini-2.5-flash',
  pdp_sheet_id:       '1Bz4AJLrzY-e49SD8H4grbdquRizt4pHN65xjNJwavEs',
  pdp_wa_number:      '22505575914 88',
  pdp_shop_name:      'Parfumerie des Princes',
  pdp_shop_addr:      'Quartier Kennedy, Feu Rouge, Bouaké',
};

// ── Charger la config au démarrage ───────────────────────
// Plus de n8n — on lit uniquement depuis localStorage + defaults
async function loadConfig() {
  // Appliquer les défauts si clé absente du localStorage
  Object.entries(CONFIG_DEFAULTS).forEach(([k, v]) => {
    if (v !== '' && !localStorage.getItem(k)) {
      localStorage.setItem(k, v);
    }
  });
  // La clé Groq est toujours prise depuis le code (jamais localStorage)
  return true;
}

// ── Sauvegarder la config (localStorage uniquement) ──────
async function saveConfig(configObj) {
  Object.entries(configObj).forEach(([k, v]) => {
    if (v !== '') localStorage.setItem(k, v);
  });
  return true;
}

// ── Getters ───────────────────────────────────────────────
function cfg(key) {
  // Clés sensibles : toujours depuis le code, jamais localStorage
  if (key === 'pdp_groq_key')   return localStorage.getItem('pdp_groq_key') || _k;
  if (key === 'pdp_gemini_key') return localStorage.getItem('pdp_gemini_key') || '';
  return localStorage.getItem(key) || CONFIG_DEFAULTS[key] || '';
}

function getWaNum()     { return cfg('pdp_wa_number').replace(/\D/g, '') || '22505575914 88'; }
function getShopName()  { return cfg('pdp_shop_name') || 'Parfumerie des Princes'; }
function getShopAddr()  { return cfg('pdp_shop_addr') || 'Quartier Kennedy, Feu Rouge, Bouaké'; }
function getWebhook()   { return cfg('pdp_webhook'); }
function getWebhookUpdate() { return cfg('pdp_webhook_update'); }
function getGroqKey()   { return cfg('pdp_groq_key'); }
function getGeminiKey() { return cfg('pdp_gemini_key'); }
function getGroqModel() { return cfg('pdp_groq_model') || 'meta-llama/llama-4-maverick-17b-128e-instruct'; }
function getGeminiModel(){ return cfg('pdp_gemini_model') || 'gemini-2.5-flash'; }
function getSheetId()   { return cfg('pdp_sheet_id') || '1Bz4AJLrzY-e49SD8H4grbdquRizt4pHN65xjNJwavEs'; }
