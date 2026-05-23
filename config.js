// ─────────────────────────────────────────────────────────
//  config.js — Parfumerie des Princes
//  Charge la configuration depuis le Sheet privé via n8n
//  et la met à disposition de toute l'app
// ─────────────────────────────────────────────────────────

// URL de base n8n — seule URL codée en dur car nécessaire pour bootstrapper
const N8N_BASE = 'https://n8n-allassane.duckdns.org';
const CONFIG_GET_URL = N8N_BASE + '/webhook/get-config';
const CONFIG_SET_URL = N8N_BASE + '/webhook/set-config';

// Clés avec valeurs par défaut (utilisées si Sheet inaccessible)
const CONFIG_DEFAULTS = {
  pdp_webhook:        '',
  pdp_webhook_update: '',
  pdp_groq_key:       '',
  pdp_gemini_key:     '',
  pdp_groq_model:     'meta-llama/llama-4-scout-17b-16e-instruct',
  pdp_gemini_model:   'gemini-2.5-flash',
  pdp_sheet_id:       '1Bz4AJLrzY-e49SD8H4grbdquRizt4pHN65xjNJwavEs',
  pdp_wa_number:      '2250700000000',
  pdp_shop_name:      'Parfumerie des Princes',
  pdp_shop_addr:      'Quartier Kennedy, Feu Rouge, Bouaké',
};

// ── Charger la config au démarrage ────────────────────────
async function loadConfig() {
  try {
    const res = await fetch(CONFIG_GET_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.success && data.config) {
      // Écrire dans localStorage pour accès synchrone
      Object.entries(data.config).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) localStorage.setItem(k, v);
      });
      console.log('[Config] Chargée depuis Sheet (' + Object.keys(data.config).length + ' clés)');
      return true;
    }
  } catch (err) {
    console.warn('[Config] Sheet inaccessible, utilisation du cache local:', err.message);
  }
  // Fallback : appliquer les défauts si la clé n'existe pas encore
  Object.entries(CONFIG_DEFAULTS).forEach(([k, v]) => {
    if (!localStorage.getItem(k) && v) localStorage.setItem(k, v);
  });
  return false;
}

// ── Sauvegarder la config dans le Sheet ──────────────────
async function saveConfig(configObj) {
  try {
    // Sauvegarder en local immédiatement
    Object.entries(configObj).forEach(([k, v]) => {
      if (v !== '') localStorage.setItem(k, v);
    });

    // Envoyer au Sheet via n8n
    const res = await fetch(CONFIG_SET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: configObj })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.warn('[Config] Sauvegarde Sheet échouée:', err.message);
    return false;
  }
}

// ── Getters pratiques ─────────────────────────────────────
function cfg(key) {
  return localStorage.getItem(key) || CONFIG_DEFAULTS[key] || '';
}

function getWaNum()    { return cfg('pdp_wa_number').replace(/\D/g, '') || '2250700000000'; }
function getShopName() { return cfg('pdp_shop_name') || 'Parfumerie des Princes'; }
function getShopAddr() { return cfg('pdp_shop_addr') || 'Quartier Kennedy, Feu Rouge, Bouaké'; }
function getWebhook()  { return cfg('pdp_webhook'); }
function getWebhookUpdate() { return cfg('pdp_webhook_update'); }
function getGroqKey()    { return cfg('pdp_groq_key'); }
function getGeminiKey()  { return cfg('pdp_gemini_key'); }
function getGroqModel()  { return cfg('pdp_groq_model') || 'meta-llama/llama-4-scout-17b-16e-instruct'; }
function getGeminiModel(){ return cfg('pdp_gemini_model') || 'gemini-2.0-flash'; }
function getSheetId()  { return cfg('pdp_sheet_id') || '1Bz4AJLrzY-e49SD8H4grbdquRizt4pHN65xjNJwavEs'; }
