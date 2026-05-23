// ─────────────────────────────────────────────────────────
//  admin.js v7 — Parfumerie des Princes
// ─────────────────────────────────────────────────────────

const SECRET_SETTINGS = 'Allassane-SECRET-CODE';

let allProducts = [];
let gestionFilter = 'Tout';
let editingProductId = null;
let photoBase64 = null;
let photoMime = null;

function fmt(n) { return Number(n).toLocaleString('fr-FR'); }

// ── Toast ─────────────────────────────────────────────────
let toastTimer;
function showToast(msg, ok = true) {
  clearTimeout(toastTimer);
  const t = document.getElementById('toast');
  t.querySelector('.toast-ico').textContent = ok ? '✓' : '✕';
  t.style.background = ok ? 'var(--navy)' : 'var(--red)';
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════
function getAdminCode() { return localStorage.getItem('pdp_admin_code') || null; }

function tryUnlock() {
  const input = document.getElementById('lockInput').value.trim();
  if (!input) return;
  const stored = getAdminCode();

  // Premier accès → créer le code
  if (!stored) {
    if (input.length < 4) {
      document.getElementById('lockSub').textContent = 'Code trop court — minimum 4 caractères';
      return;
    }
    localStorage.setItem('pdp_admin_code', input);
    enterAdmin();
    return;
  }

  // Accès normal
  if (input === stored || input === SECRET_SETTINGS) {
    enterAdmin();
  } else {
    document.getElementById('lockError').style.display = 'block';
    document.getElementById('lockInput').value = '';
    setTimeout(() => document.getElementById('lockError').style.display = 'none', 2000);
  }
}

async function enterAdmin() {
  document.getElementById('lockScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'flex';
  // Charger la config fraîche depuis le Sheet privé
  await loadConfig();
  prefillParams();
  loadAndRefresh();
}

// ══════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════
function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'gestion') renderGestion();
  if (name === 'dashboard') renderDashboard();
}

// ══════════════════════════════════════════════════════════
//  DONNÉES
// ══════════════════════════════════════════════════════════
async function loadAndRefresh() {
  const loaded = await loadProducts();
  if (loaded) {
    allProducts = await loadAllProducts();
    renderDashboard();
    renderGestion();
  }
}

async function loadAllProducts() {
  const SHEET_ID = localStorage.getItem('pdp_sheet_id') || '1Bz4AJLrzY-e49SD8H4grbdquRizt4pHN65xjNJwavEs';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Produits`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)?.[1];
    if (!jsonStr) return PRODUCTS;
    const data = JSON.parse(jsonStr);
    const rows = data.table?.rows || [];
    return rows.filter(r => r.c?.[0]?.v).map(row => {
      const g = (i) => (row.c?.[i]?.v != null) ? String(row.c[i].v).trim() : '';
      const cat = g(2) || 'Autre';
      const driveId = g(5);
      const rawUrl = g(6);
      const id = driveId || extractId(rawUrl);
      return {
        id: g(0), name: g(1), cat,
        price: Math.round(parseFloat(g(3)) || 0),
        desc: g(4), driveId,
        image: id ? `https://lh3.googleusercontent.com/d/${id}` : null,
        badge: g(8) || '',
        statut: g(9).toLowerCase() || 'actif',
        date: g(7),
        groupe: g(10) || '',
        couleur: g(11) || '',
        bg: {Parfum:'#f5f0ea',Sac:'#f7f0ec',Chaine:'#f4f0f8','Porte-monnaie':'#f0f5ea'}[cat] || '#f5f5f0',
        emoji: {Parfum:'🌹',Sac:'👜',Chaine:'📿','Porte-monnaie':'👛'}[cat] || '✨',
      };
    });
  } catch { return PRODUCTS; }
}

function extractId(url) {
  if (!url) return null;
  return url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] || url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || null;
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════
function renderDashboard() {
  const products = allProducts.length ? allProducts : PRODUCTS;
  const actifs = products.filter(p => p.statut !== 'inactif');
  const archives = products.filter(p => p.statut === 'inactif');
  const nouveaux = actifs.filter(p => p.badge === 'NOUVEAU');
  const promos = actifs.filter(p => p.badge === 'PROMO');

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card kpi-blue kpi-btn" onclick="filterFromDash('actif')">
      <div class="kpi-val">${actifs.length}</div><div class="kpi-label">Produits actifs</div>
    </div>
    <div class="kpi-card kpi-gold kpi-btn" onclick="filterFromDash('inactif')">
      <div class="kpi-val">${archives.length}</div><div class="kpi-label">Archivés</div>
    </div>
    <div class="kpi-card kpi-green kpi-btn" onclick="filterFromDash('NOUVEAU')">
      <div class="kpi-val">${nouveaux.length}</div><div class="kpi-label">NOUVEAU</div>
    </div>
    <div class="kpi-card kpi-red kpi-btn" onclick="filterFromDash('PROMO')">
      <div class="kpi-val">${promos.length}</div><div class="kpi-label">PROMO</div>
    </div>`;

  const cats = ['Parfum','Sac','Chaine','Porte-monnaie','Autre'];
  const emojis = {Parfum:'🌹',Sac:'👜',Chaine:'📿','Porte-monnaie':'👛',Autre:'✨'};
  const max = Math.max(...cats.map(c => actifs.filter(p => p.cat === c).length), 1);
  document.getElementById('catBars').innerHTML = cats.map(c => {
    const n = actifs.filter(p => p.cat === c).length;
    return `<div class="cat-bar-row">
      <span class="cat-bar-label">${emojis[c]} ${c}</span>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${Math.round(n/max*100)}%"></div></div>
      <span class="cat-bar-count">${n}</span></div>`;
  }).join('');

  const total = products.length || 1;
  document.getElementById('statusBars').innerHTML = `
    <div class="status-row"><div class="status-dot green"></div><span>Actifs</span>
      <div class="status-track"><div class="status-fill green" style="width:${Math.round(actifs.length/total*100)}%"></div></div>
      <span class="status-pct">${actifs.length} (${Math.round(actifs.length/total*100)}%)</span></div>
    <div class="status-row"><div class="status-dot grey"></div><span>Archivés</span>
      <div class="status-track"><div class="status-fill grey" style="width:${Math.round(archives.length/total*100)}%"></div></div>
      <span class="status-pct">${archives.length} (${Math.round(archives.length/total*100)}%)</span></div>`;

  const recents = [...actifs].reverse().slice(0, 5);

  function fmtDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      // Heure Côte d'Ivoire = UTC+0 (GMT/WAT)
      return d.toLocaleString('fr-FR', {
        timeZone: 'Africa/Abidjan',
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  }

  document.getElementById('recentList').innerHTML = recents.length
    ? recents.map(p => `
        <div class="recent-item">
          <div class="recent-img" style="background:${p.bg}">
            ${p.image ? `<img src="${p.image}" onerror="this.style.display='none'" />` : p.emoji}
          </div>
          <div class="recent-info">
            <div class="recent-name">${p.name}</div>
            <div class="recent-meta">${p.cat} · ${fmt(p.price)} FCFA ${p.badge ? `· <span class="recent-badge">${p.badge}</span>` : ''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="recent-id">${p.id}</div>
            ${p.date ? `<div style="font-size:9px;color:var(--text-3);margin-top:2px">${fmtDate(p.date)}</div>` : ''}
          </div>
        </div>`).join('')
    : '<div class="empty-msg">Aucun produit</div>';
}


// ══════════════════════════════════════════════════════════
//  SYNC GOOGLE SHEETS
// ══════════════════════════════════════════════════════════
// getWebhookUpdate() défini dans config.js

async function syncToSheets(id_produit, updates) {
  const webhook = getWebhookUpdate();
  if (!webhook) {
    // Pas de webhook configuré → modification locale seulement
    showToast('⚠ Pas de webhook MAJ — configurer dans Paramètres > Clés API', false);
    return false;
  }
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_produit, updates })
    });
    const data = await res.json();
    if (data.success) return true;
    throw new Error(data.message || 'Erreur serveur');
  } catch (err) {
    console.error('syncToSheets error:', err);
    showToast('⚠ Sync Sheets échoué: ' + err.message, false);
    return false;
  }
}


// ── Filtrer produits depuis dashboard ─────────────────────
function filterFromDash(type) {
  // Aller sur l'onglet Produits
  const tab = document.querySelector('.tab[data-tab="gestion"]');
  if (tab) switchTab('gestion', tab);

  // Appliquer le filtre
  if (type === 'actif') {
    filterGestion('Tout', document.querySelector('.gf[data-cat="Tout"]'));
  } else if (type === 'inactif') {
    filterGestion('inactif', document.querySelector('.gf[data-cat="inactif"]'));
  } else if (type === 'NOUVEAU' || type === 'PROMO') {
    // Filtre badge — afficher tous puis filtrer par badge
    gestionFilter = 'Tout';
    document.querySelectorAll('.gf').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.gf[data-cat="Tout"]');
    if (allBtn) allBtn.classList.add('active');

    const products = allProducts.length ? allProducts : PRODUCTS;
    const list = products.filter(p => p.statut !== 'inactif' && p.badge === type);
    const container = document.getElementById('gestionList');
    if (!list.length) {
      container.innerHTML = `<div class="empty-msg">Aucun produit ${type}</div>`;
      return;
    }
    renderGestionList(list);
  }
}

// ══════════════════════════════════════════════════════════
//  GESTION
// ══════════════════════════════════════════════════════════
function filterGestion(cat, el) {
  gestionFilter = cat;
  document.querySelectorAll('.gf').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderGestion();
}

function renderGestion() {
  const products = allProducts.length ? allProducts : PRODUCTS;
  let list = gestionFilter === 'inactif'
    ? products.filter(p => p.statut === 'inactif')
    : gestionFilter === 'Tout'
      ? products.filter(p => p.statut !== 'inactif')
      : products.filter(p => p.cat === gestionFilter && p.statut !== 'inactif');

  const el = document.getElementById('gestionList');
  if (!list.length) { el.innerHTML = '<div class="empty-msg">Aucun produit</div>'; return; }

  renderGestionList(list);
}

function renderGestionList(list) {
  const el = document.getElementById('gestionList');
  el.innerHTML = list.map(p => `
    <div class="gestion-card ${p.statut === 'inactif' ? 'archived' : ''}" id="gcard-${p.id}">
      <div class="gcard-img" style="background:${p.bg}">
        ${p.image ? `<img src="${p.image}" onerror="this.style.display='none'" />` : `<span style="font-size:24px">${p.emoji}</span>`}
        ${p.badge ? `<div class="gcard-badge">${p.badge}</div>` : ''}
        ${p.statut === 'inactif' ? '<div class="gcard-archived">Archivé</div>' : ''}
      </div>
      <div class="gcard-body">
        <div class="gcard-name">${p.name}</div>
        <div class="gcard-meta">${p.cat} · <span class="gcard-price">${fmt(p.price)} FCFA</span></div>
        <div class="gcard-id">${p.id}</div>
        <div class="gcard-actions">
          <button class="gcard-btn edit" onclick="openEditModal('${p.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Modifier
          </button>
          ${p.statut !== 'inactif'
            ? `<button class="gcard-btn archive" onclick="confirmArchive('${p.id}')">📦 Archiver</button>`
            : `<button class="gcard-btn restore" onclick="restoreProduct('${p.id}')">↺ Réactiver</button>`}
        </div>
      </div>
    </div>`).join('');
}

// Archivage
function confirmArchive(id) {
  const p = (allProducts.length ? allProducts : PRODUCTS).find(x => x.id === id);
  if (!p) return;
  document.getElementById('archiveModalSub').textContent = `"${p.name}"`;
  document.getElementById('archiveConfirmBtn').onclick = () => archiveProduct(id);
  document.getElementById('archiveModal').classList.add('open');
}
function closeArchiveModal(e) {
  if (e && e.target !== document.getElementById('archiveModal')) return;
  document.getElementById('archiveModal').classList.remove('open');
}
async function archiveProduct(id) {
  const p = (allProducts.length ? allProducts : PRODUCTS).find(x => x.id === id);
  if (!p) return;
  p.statut = 'inactif';
  const i = PRODUCTS.findIndex(x => x.id === id);
  if (i > -1) PRODUCTS.splice(i, 1);
  document.getElementById('archiveModal').classList.remove('open');
  showToast(`${p.name} archivé`);
  renderGestion(); renderDashboard();
  // Sync Sheets
  await syncToSheets(id, { Statut: 'inactif' });
}
async function restoreProduct(id) {
  const p = (allProducts.length ? allProducts : PRODUCTS).find(x => x.id === id);
  if (!p) return;
  p.statut = 'actif';
  if (!PRODUCTS.find(x => x.id === id)) PRODUCTS.push(p);
  showToast(`${p.name} réactivé`);
  renderGestion(); renderDashboard();
  // Sync Sheets
  await syncToSheets(id, { Statut: 'actif' });
}

// Modification
function openEditModal(id) {
  const p = (allProducts.length ? allProducts : PRODUCTS).find(x => x.id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById('editNom').value = p.name;
  document.getElementById('editCat').value = p.cat;
  document.getElementById('editPrix').value = p.price;
  document.getElementById('editDesc').value = p.desc || '';
  document.getElementById('editBadge').value = p.badge || '';
  document.getElementById('editStatut').value = p.statut || 'actif';
  const wrap = document.getElementById('editImgWrap');
  const prev = document.getElementById('editImgPreview');
  if (p.image) { prev.src = p.image; wrap.style.background = p.bg; }
  else { prev.src = ''; }
  document.getElementById('editModal').classList.add('open');
}
function closeEditModal(e) {
  if (e && e.target !== document.getElementById('editModal')) return;
  document.getElementById('editModal').classList.remove('open');
}
function previewEditImg(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { document.getElementById('editImgPreview').src = e.target.result; };
  reader.readAsDataURL(file);
}
async function saveEditProduct() {
  const products = allProducts.length ? allProducts : PRODUCTS;
  const p = products.find(x => x.id === editingProductId);
  if (!p) return;

  const newName = document.getElementById('editNom').value.trim() || p.name;
  const newCat = document.getElementById('editCat').value;
  const newPrice = Math.round(parseFloat(document.getElementById('editPrix').value) || p.price);
  const newDesc = document.getElementById('editDesc').value.trim();
  const newBadge = document.getElementById('editBadge').value;
  const newStatut = document.getElementById('editStatut').value;

  // Construire l'objet updates (seulement les champs modifiés)
  const updates = {};
  if (newName !== p.name) updates.Nom_Produit = newName;
  if (newCat !== p.cat) updates.Categorie = newCat;
  if (newPrice !== p.price) updates.Prix_FCFA = newPrice;
  if (newDesc !== p.desc) updates.Description = newDesc;
  if (newBadge !== p.badge) updates.Badge = newBadge;
  if (newStatut !== p.statut) updates.Statut = newStatut;

  // Mise à jour locale immédiate
  p.name = newName; p.cat = newCat; p.price = newPrice;
  p.desc = newDesc; p.badge = newBadge; p.statut = newStatut;

  const idx = PRODUCTS.findIndex(x => x.id === editingProductId);
  if (p.statut === 'inactif' && idx > -1) PRODUCTS.splice(idx, 1);
  else if (p.statut === 'actif' && idx === -1) PRODUCTS.push(p);
  else if (idx > -1) Object.assign(PRODUCTS[idx], p);

  document.getElementById('editModal').classList.remove('open');

  // Sync Google Sheets si des champs ont changé
  if (Object.keys(updates).length > 0) {
    showToast(`${p.name} en cours de sync…`);
    const ok = await syncToSheets(editingProductId, updates);
    if (ok) showToast(`✓ ${p.name} mis à jour dans Google Sheets`);
  } else {
    showToast(`${p.name} — aucun changement`);
  }

  renderGestion(); renderDashboard();
}

// ══════════════════════════════════════════════════════════
//  NOUVEAU PRODUIT
// ══════════════════════════════════════════════════════════
function triggerCamera() {
  document.getElementById('photoCamera').click();
}
function triggerGallery() {
  document.getElementById('photoGallery').click();
}

function handlePhoto(input) {
  const file = input.files[0]; if (!file) return;
  photoMime = file.type;
  const reader = new FileReader();
  reader.onload = async e => {
    photoBase64 = e.target.result.split(',')[1];
    // Afficher la preview
    const prev = document.getElementById('previewImg');
    prev.src = e.target.result;
    prev.style.display = 'block';
    document.getElementById('photoPlaceholder').style.display = 'none';
    document.getElementById('photoCard').classList.add('has-photo');
    // Changer les boutons photo
    document.getElementById('photoBtns').innerHTML = `
      <button class="photo-btn photo-btn-change" onclick="triggerGallery()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Changer la photo
      </button>`;
    // Révéler le champ prix
    document.getElementById('prixRow').style.display = 'flex';
    // Lancer l'analyse IA
    await analyzeWithAI();
  };
  reader.readAsDataURL(file);
}

const AI_PROMPT = 'Analyse ce produit. Réponds UNIQUEMENT en JSON sans markdown, sans commentaire : {"categorie":"Parfum|Sac|Chaine|Porte-monnaie|Autre","nom":"nom élégant court","description":"description luxueuse 1-2 phrases","groupe":"NomBase sans couleur ex: YSL-MYSLF","couleur":"couleur principale ex: Noir"}';

async function callGroq(key, model) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      max_tokens: 400,
      messages: [{ role: 'user', content: [
        { type: 'text', text: AI_PROMPT },
        { type: 'image_url', image_url: { url: `data:${photoMime};base64,${photoBase64}` } }
      ]}]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Groq error');
  return data.choices?.[0]?.message?.content || '{}';
}

async function callGemini(key, model) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { text: AI_PROMPT },
        { inline_data: { mime_type: photoMime, data: photoBase64 } }
      ]}],
      generationConfig: { maxOutputTokens: 400 }
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Gemini error');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

async function analyzeWithAI() {
  setStep(1, 'loading');

  // Essai 1 — via n8n (clés sécurisées serveur)
  try {
    const res = await fetch('https://n8n-allassane.duckdns.org/webhook/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: photoBase64, image_mime: photoMime })
    });
    const data = await res.json();
    if (data.success && data.result) {
      applyAIResult(data.result);
      setStep(1, 'done');
      document.getElementById('prodForm').style.display = 'flex';
      return;
    }
  } catch(e) {
    console.warn('[IA] n8n inaccessible, bascule sur clés locales');
  }

  // Essai 2 — fallback clés saisies manuellement (jamais stockées)
  const groqKey = document.getElementById('pGroq')?.value?.trim();
  const geminiKey = document.getElementById('pGemini')?.value?.trim();

  if (!groqKey && !geminiKey) {
    setStep(1, 'error');
    showToast('Analyse IA échouée — remplissez manuellement', false);
    document.getElementById('prodForm').style.display = 'flex';
    return;
  }

  let text = null;
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: getGroqModel(), max_tokens: 400,
          messages: [{ role: 'user', content: [
            { type: 'text', text: AI_PROMPT },
            { type: 'image_url', image_url: { url: `data:${photoMime};base64,${photoBase64}` } }
          ]}]
        })
      });
      const data = await res.json();
      if (!data.error) text = data.choices?.[0]?.message?.content;
    } catch(e) {}
  }

  if (!text && geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: AI_PROMPT },
            { inline_data: { mime_type: photoMime, data: photoBase64 } }
          ]}],
          generationConfig: { maxOutputTokens: 400 }
        })
      });
      const data = await res.json();
      if (!data.error) text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch(e) {}
  }

  if (!text) {
    setStep(1, 'error');
    showToast('Analyse IA échouée — remplissez manuellement', false);
    document.getElementById('prodForm').style.display = 'flex';
    return;
  }

  applyAIResult(text);
  setStep(1, 'done');
  document.getElementById('prodForm').style.display = 'flex';
}

function applyAIResult(text) {
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
    if (parsed.categorie) document.getElementById('fCat').value = parsed.categorie;
    if (parsed.nom) document.getElementById('fNom').value = parsed.nom;
    if (parsed.description) document.getElementById('fDesc').value = parsed.description;
    if (parsed.groupe) document.getElementById('fGroupe').value = parsed.groupe;
    if (parsed.couleur) document.getElementById('fCouleur').value = parsed.couleur;
  } catch(e) {
    console.warn('[IA] Parse JSON échoué:', e.message);
  }
}


function setStep(n, state) {
  const el = document.getElementById('step' + n);
  const icons = { loading:'⏳', done:'✅', error:'❌' };
  el.querySelector('.step-ico').textContent = icons[state];
  el.classList.add('visible');
}

async function submitProduct() {
  const prix = document.getElementById('fPrix').value;
  if (!prix) { showToast('Le prix est obligatoire', false); return; }
  const webhook = getWebhook();
  if (!webhook) { showToast('Webhook non configuré dans Paramètres > Clés API', false); return; }

  const cat = document.getElementById('fCat').value;
  const prefixes = {Parfum:'PARF',Sac:'SAC',Chaine:'CHAI','Porte-monnaie':'PORT',Autre:'AUT'};
  const id = (prefixes[cat]||'PRD') + '-' + Math.floor(Math.random()*9000+1000);
  const nom = document.getElementById('fNom').value || cat;
  const filename = `${id}_${nom.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_-]/g,'')}_nobg.png`;

  const btn = document.getElementById('submitBtn');
  const btnRond = document.getElementById('prixSubmitBtn');
  btn.disabled = true; btn.textContent = 'Envoi en cours…';
  if (btnRond) btnRond.disabled = true;
  setStep(2, 'loading');

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_produit: id, nom_produit: nom, categorie: cat,
        prix: prix.split(".")[0],
        description: document.getElementById('fDesc').value,
        badge: document.getElementById('fBadge').value,
        groupe: document.getElementById('fGroupe').value,
        couleur: document.getElementById('fCouleur').value,
        filename, image_base64: photoBase64, image_mimetype: photoMime
      })
    });
    setStep(2, 'done'); setStep(3, 'loading');
    if (res.ok) {
      setStep(3, 'done');
      showToast('Produit enregistré !');
      // Auto-refresh puis reset automatique pour saisie rapide
      setTimeout(async () => {
        await loadAndRefresh();
        resetForm();
      }, 1500);
    } else throw new Error();
  } catch {
    setStep(2, 'error');
    showToast('Erreur lors de l\'envoi', false);
    btn.disabled = false; btn.textContent = 'Réessayer';
  }
}

function resetForm() {
  photoBase64 = null; photoMime = null;
  // Remettre la zone photo
  const prev = document.getElementById('previewImg');
  prev.style.display = 'none'; prev.src = '';
  document.getElementById('photoPlaceholder').style.display = 'flex';
  document.getElementById('photoCard').classList.remove('has-photo');
  // Remettre les boutons
  document.getElementById('photoBtns').innerHTML = `
    <button class="photo-btn" onclick="triggerCamera()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      Appareil photo
    </button>
    <button class="photo-btn" onclick="triggerGallery()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      Choisir une photo
    </button>`;
  document.getElementById('prixRow').style.display = 'none';
  document.getElementById('prodForm').style.display = 'none';
  document.getElementById('submitSuccess').style.display = 'none';
  ['step1','step2','step3'].forEach(id => {
    document.getElementById(id).classList.remove('visible');
    const ico = {step1:'⏳',step2:'⬆️',step3:'📋'};
    document.getElementById(id).querySelector('.step-ico').textContent = ico[id];
  });
  const btn = document.getElementById('submitBtn');
  btn.style.display = 'block'; btn.disabled = false;
  btn.textContent = 'Enregistrer →';
  const btnRond = document.getElementById('prixSubmitBtn');
  if (btnRond) btnRond.disabled = false;
  ['fPrix','fNom','fDesc','fGroupe','fCouleur'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('photoCamera').value = '';
  document.getElementById('photoGallery').value = '';
}

// ══════════════════════════════════════════════════════════
//  PARAMÈTRES
// ══════════════════════════════════════════════════════════
function prefillParams() {
  // Afficher le numéro sans le préfixe 225
  const rawWa = cfg('pdp_wa_number').replace(/\D/g, '');
  document.getElementById('pWa').value = rawWa.startsWith('225') ? rawWa.slice(3) : rawWa;
  document.getElementById('pNom').value = cfg('pdp_shop_name');
  document.getElementById('pAddr').value = cfg('pdp_shop_addr');
}

async function saveParams() {
  const waRaw = document.getElementById('pWa').value.replace(/\D/g, '');
  const wa = waRaw ? '225' + waRaw : '';
  const nom = document.getElementById('pNom').value.trim();
  const addr = document.getElementById('pAddr').value.trim();
  const config = {};
  if (wa) config.pdp_wa_number = wa;
  if (nom) config.pdp_shop_name = nom;
  if (addr) config.pdp_shop_addr = addr;
  if (Object.keys(config).length === 0) return;
  showToast('Sauvegarde en cours…');
  const ok = await saveConfig(config);
  flashOk('paramOk');
  showToast(ok ? '✓ Sauvegardé sur tous les appareils' : '✓ Sauvegardé localement');
}

function changeAdminCode() {
  const n = document.getElementById('pCodeNew').value.trim();
  const c = document.getElementById('pCodeConfirm').value.trim();
  document.getElementById('codeErr').style.display = 'none';
  document.getElementById('codeOk').style.display = 'none';
  if (!n || n.length < 4) { showToast('Code trop court', false); return; }
  if (n !== c) { document.getElementById('codeErr').style.display = 'block'; return; }
  if (n === SECRET_SETTINGS) { showToast('Ce code est réservé au système', false); return; }
  localStorage.setItem('pdp_admin_code', n);
  document.getElementById('pCodeNew').value = '';
  document.getElementById('pCodeConfirm').value = '';
  flashOk('codeOk'); showToast('Code admin mis à jour');
}

// Section API protégée
function unlockApiSection() {
  const code = document.getElementById('apiCodeInput').value.trim();
  if (code !== SECRET_SETTINGS) {
    document.getElementById('apiCodeErr').style.display = 'block';
    document.getElementById('apiCodeInput').value = '';
    setTimeout(() => document.getElementById('apiCodeErr').style.display = 'none', 2000);
    return;
  }
  // Déverrouiller et pré-remplir
  document.getElementById('apiLock').style.display = 'none';
  const fields = document.getElementById('apiFields');
  fields.classList.add('unlocked');
  document.getElementById('pWebhook').value = cfg('pdp_webhook');
  document.getElementById('pWebhookUpdate').value = cfg('pdp_webhook_update');
  document.getElementById('pGroq').value = cfg('pdp_groq_key');
  document.getElementById('pGemini').value = cfg('pdp_gemini_key');
  document.getElementById('pGroqModel').value = cfg('pdp_groq_model') || 'meta-llama/llama-4-scout-17b-16e-instruct';
  document.getElementById('pGeminiModel').value = cfg('pdp_gemini_model') || 'gemini-2.0-flash';
  document.getElementById('pSheet').value = cfg('pdp_sheet_id');
}

async function saveApiKeys() {
  const webhook = document.getElementById('pWebhook').value.trim();
  const webhookUpdate = document.getElementById('pWebhookUpdate').value.trim();
  const groq = document.getElementById('pGroq').value.trim();
  const gemini = document.getElementById('pGemini').value.trim();
  const groqModel = document.getElementById('pGroqModel').value.trim();
  const geminiModel = document.getElementById('pGeminiModel').value.trim();
  const sheet = document.getElementById('pSheet').value.trim();
  const config = {};
  if (webhook) config.pdp_webhook = webhook;
  if (webhookUpdate) config.pdp_webhook_update = webhookUpdate;
  if (groq) config.pdp_groq_key = groq;
  if (gemini) config.pdp_gemini_key = gemini;
  if (groqModel) config.pdp_groq_model = groqModel;
  if (geminiModel) config.pdp_gemini_model = geminiModel;
  if (sheet) config.pdp_sheet_id = sheet;
  if (Object.keys(config).length === 0) return;
  showToast('Sauvegarde en cours…');
  const ok = await saveConfig(config);
  flashOk('apiOk');
  showToast(ok ? '✓ Connexions sauvegardées sur tous les appareils' : '✓ Sauvegardé localement');
}

function flashOk(id) {
  const el = document.getElementById(id);
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 2500);
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!getAdminCode()) {
    document.getElementById('lockSub').textContent = 'Première connexion — choisissez votre code d\'accès admin';
  }
  document.getElementById('lockInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  document.getElementById('adminCodeInput') && document.getElementById('adminCodeInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
});
document.addEventListener('DOMContentLoaded', () => {
  if (!getAdminCode()) {
    document.getElementById('lockSub').textContent = 'Première connexion — choisissez votre code d\'accès admin';
  }
  document.getElementById('lockInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  document.getElementById('adminCodeInput') && document.getElementById('adminCodeInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

  // Bloquer les touches ↑↓ sur les champs prix
  ['fPrix', 'editPrix'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
    });
  });
});
