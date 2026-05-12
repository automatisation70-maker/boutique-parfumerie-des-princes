// ─────────────────────────────────────────────────────────
//  products.js — Connexion Google Sheets en temps réel
//  Sheet ID : 1Bz4AJLrzY-e49SD8H4grbdquRizt4pHN65xjNJwavEs
//  Onglet   : Produits
//  Colonnes : A=ID_Produit B=Nom_Produit C=Categorie D=Prix_FCFA
//             E=Description F=Image_Drive_ID G=URL_Image H=Date_Ajout
//             I=Badge (NOUVEAU / PROMO / vide)
//             J=Statut (actif / inactif — laisser vide = actif par défaut)
// ─────────────────────────────────────────────────────────

const SHEET_ID = '1Bz4AJLrzY-e49SD8H4grbdquRizt4pHN65xjNJwavEs';
const SHEET_TAB = 'Produits';

const CAT_BG = {
  'Parfum':        '#f5f0ea',
  'Sac':           '#f7f0ec',
  'Chaine':        '#f4f0f8',
  'Porte-monnaie': '#f0f5ea',
};

const CAT_EMOJI = {
  'Parfum':        '🌹',
  'Sac':           '👜',
  'Chaine':        '📿',
  'Porte-monnaie': '👛',
};

let PRODUCTS = [];
let FEATURED = null;

// ── Convertit n'importe quelle URL Drive en URL image directe ──
function toDriveImageUrl(rawUrl, driveId) {
  // Si on a l'ID Drive directement
  const id = driveId || extractDriveId(rawUrl);
  if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  return rawUrl || null;
}

function extractDriveId(url) {
  if (!url) return null;
  // Format : /uc?export=view&id=ID ou /file/d/ID/view
  const m1 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

// ── Chargement depuis Google Sheets ──────────────────────
async function loadProducts() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_TAB)}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)?.[1];
    if (!jsonStr) throw new Error('Format inattendu');

    const data = JSON.parse(jsonStr);
    const rows = data.table.rows;
    if (!rows || rows.length === 0) return false;

    PRODUCTS = rows
      .filter(row => row.c && row.c[0] && row.c[0].v)
      .map(row => {
        const get = (i) => (row.c && row.c[i] && row.c[i].v !== null) ? String(row.c[i].v).trim() : '';
        const cat = get(2) || 'Autre';
        const driveId = get(5);
        const rawImageUrl = get(6);
        const statut = get(9).toLowerCase(); // colonne J

        return {
          id:     get(0),
          name:   get(1),
          cat:    cat,
          price:  parseFloat(get(3)) || 0,
          desc:   get(4),
          driveId: driveId,
          image:  toDriveImageUrl(rawImageUrl, driveId),
          badge:  get(8) || '',
          statut: statut || 'actif',
          bg:     CAT_BG[cat] || '#f5f5f0',
          emoji:  CAT_EMOJI[cat] || '✨',
        };
      })
      .filter(p => p.statut !== 'inactif'); // masquer les produits inactifs

    const withBadge = PRODUCTS.find(p => p.badge === 'NOUVEAU' || p.badge === 'PROMO');
    FEATURED = withBadge || PRODUCTS[0] || null;

    updateCatCounts();
    return true;

  } catch (err) {
    console.error('Erreur chargement Sheet :', err);
    return false;
  }
}

function updateCatCounts() {
  const counts = {};
  PRODUCTS.forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
  document.querySelectorAll('.cat-card').forEach(card => {
    const cat = card.dataset.cat;
    const countEl = card.querySelector('.cat-count');
    if (countEl && counts[cat]) {
      countEl.textContent = counts[cat] + ' produit' + (counts[cat] > 1 ? 's' : '');
    }
  });
}
