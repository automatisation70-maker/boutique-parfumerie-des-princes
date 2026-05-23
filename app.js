// app.js v8 — Parfumerie des Princes

let cart = [];
let favs = JSON.parse(localStorage.getItem('pdp_favs') || '[]');
let currentCat = 'Tout';
let currentPriceRange = 'all';
let currentSearch = '';
let currentPage = 'home';
let currentModalId = null;
let toastTimer = null;
let tapCount = 0; let tapTimer = null;
let lastScrollY = 0;

// getWaNum, getShopName, getShopAddr, getWebhook définis dans config.js

function fmt(n) { return Number(n).toLocaleString('fr-FR'); }

function showToast(msg) {
  clearTimeout(toastTimer);
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Navigation ────────────────────────────────────────────
function goTo(page, el) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('p-' + page).classList.add('active');
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  const header = document.getElementById('mainHeader');
  const catsBar = document.getElementById('catsBar');
  const priceFilters = document.getElementById('priceFilters');

  if (page === 'contact') {
    header.style.display = 'none';
    catsBar.style.display = 'none';
    priceFilters.style.display = 'none';
  } else {
    header.style.display = 'block';
    catsBar.style.display = 'flex';
    document.getElementById('headerBrand').classList.remove('hidden');
    lastScrollY = 0;
    if (page === 'home' && currentCat !== 'Tout') priceFilters.style.display = 'flex';
    else priceFilters.style.display = 'none';
  }
  updateCartFooter();
  document.getElementById('mainContent').scrollTop = 0;
}

// ── Header scroll ─────────────────────────────────────────
function initHeaderScroll() {
  let ticking = false;
  document.getElementById('mainContent').addEventListener('scroll', () => {
    if (currentPage !== 'home') return;
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = document.getElementById('mainContent').scrollTop;
        const delta = y - lastScrollY;
        lastScrollY = y;
        const brand = document.getElementById('headerBrand');
        if (y <= 8) brand.classList.remove('hidden');
        else if (delta > 3) brand.classList.add('hidden');
        else if (delta < -8) brand.classList.remove('hidden');
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ── Triple tap → admin ────────────────────────────────────
function initTripleTap() {
  document.getElementById('logoBtn').addEventListener('click', () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 600);
    if (tapCount >= 3) { tapCount = 0; window.location.href = 'admin.html'; }
  });
}

// ── Filtres catégorie ─────────────────────────────────────
function filterCat(cat, el) {
  currentCat = cat;
  currentPriceRange = 'all';

  // Sync barre catégories du haut
  document.querySelectorAll('.cp').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll(`.cp[data-cat="${cat}"]`).forEach(c => c.classList.add('active'));

  // Sync pills visuelles dans la page
  document.querySelectorAll('.cat-pill').forEach(c => c.classList.remove('active'));
  document.querySelectorAll(`.cat-pill[data-cat="${cat}"]`).forEach(c => c.classList.add('active'));

  // Filtres prix — visibles seulement si catégorie sélectionnée
  const pf = document.getElementById('priceFilters');
  pf.style.display = (cat === 'Tout') ? 'none' : 'flex';
  document.querySelectorAll('.pf').forEach(b => b.classList.remove('active'));
  document.querySelector('.pf[data-range="all"]')?.classList.add('active');

  // Titre section
  const titles = { Tout:'Tous les produits', Parfum:'Parfums', Sac:'Sacs', Chaine:'Chaînes', 'Porte-monnaie':'Porte-monnaie' };
  document.getElementById('prodTitle').textContent = titles[cat] || cat;

  // Masquer la section catégories une fois qu'on a filtré (sauf si retour à Tout)
  const catSec = document.getElementById('catSection');
  if (catSec) catSec.style.display = (cat === 'Tout') ? 'block' : 'none';

  renderProducts();
  if (currentPage !== 'home') goTo('home', document.querySelector('.ni[data-page="home"]'));
}

function filterPrice(range, el) {
  currentPriceRange = range;
  document.querySelectorAll('.pf').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderProducts();
}

// ── Recherche ─────────────────────────────────────────────
function doSearch(q) {
  currentSearch = q.trim().toLowerCase();
  document.getElementById('searchClear').style.display = q ? 'block' : 'none';
  if (q) {
    document.getElementById('priceFilters').style.display = 'none';
    document.getElementById('prodTitle').textContent = `"${q}"`;
  } else { clearSearch(); return; }
  renderProducts();
}

function clearSearch() {
  currentSearch = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  const titles = { Tout:'Tous les produits', Parfum:'Parfums', Sac:'Sacs', Chaine:'Chaînes', 'Porte-monnaie':'Porte-monnaie' };
  document.getElementById('prodTitle').textContent = titles[currentCat] || currentCat;
  if (currentCat !== 'Tout') document.getElementById('priceFilters').style.display = 'flex';
  const catSec = document.getElementById('catSection');
  if (catSec) catSec.style.display = (currentCat === 'Tout') ? 'block' : 'none';
  renderProducts();
}

// ── Filtrage produits ─────────────────────────────────────
function getFiltered() {
  let list = PRODUCTS;
  if (currentSearch) return list.filter(p => p.name.toLowerCase().includes(currentSearch) || p.cat.toLowerCase().includes(currentSearch));
  if (currentCat !== 'Tout') list = list.filter(p => p.cat === currentCat);
  if (currentPriceRange !== 'all') {
    const [min, max] = currentPriceRange.split('-').map(Number);
    list = list.filter(p => p.price >= min && p.price <= max);
  }
  return list;
}

function prodImgHtml(p) {
  if (p.image) {
    // Image disponible : on affiche l'image, l'emoji fallback est caché
    return `<img src="${p.image}" alt="${p.name}"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
      <span class="prod-img-fallback" style="display:none">${p.emoji}</span>`;
  }
  // Pas d'image : on affiche l'emoji
  return `<span class="prod-img-fallback" style="display:flex">${p.emoji}</span>`;
}

// ── Rendu produits ────────────────────────────────────────
function renderProducts() {
  const grid = document.getElementById('prodGrid');
  const list = getFiltered();
  if (!list.length) {
    grid.innerHTML = '<div class="no-results">Aucun produit dans cette catégorie</div>';
    return;
  }
  // Stocker la liste visible pour le carousel modal
  window._currentProductList = list;
  window._favProductList = favList;
    grid.innerHTML = favList.map(p => `
      <div class="prod-card" onclick="openModal('${p.id}', window._favProductList)">
        <div class="prod-img">${prodImgHtml(p)}${p.badge ? `<div class="prod-badge">${p.badge}</div>` : ''}</div>
        <div class="prod-info">
          <div class="prod-cat">${p.cat}</div>
          <div class="prod-name">${p.name}</div>
          <div class="prod-row">
            <div class="prod-price">${fmt(p.price)} <span>FCFA</span></div>
            <button class="prod-add" onclick="addToCart(event,'${p.id}')">+</button>
          </div>
        </div>
      </div>`).join('');
}

// ── Favoris ───────────────────────────────────────────────
function updateFavs() {
  favs = favs.filter(f => PRODUCTS.some(p => p.id === f.id));
  const empty = document.getElementById('favEmpty');
  const grid = document.getElementById('favGrid');
  if (!favs.length) { empty.style.display = 'flex'; grid.innerHTML = ''; return; }
  empty.style.display = 'none';
  const favList = [...favs];
  grid.innerHTML = favList.map(p => `
    <div class="prod-card" onclick="openModal('${p.id}', favList)">
      <div class="prod-img">${prodImgHtml(p)}${p.badge ? `<div class="prod-badge">${p.badge}</div>` : ''}</div>
      <div class="prod-info">
        <div class="prod-cat">${p.cat}</div>
        <div class="prod-name">${p.name}</div>
        <div class="prod-row">
          <div class="prod-price">${fmt(p.price)} <span>FCFA</span></div>
          <button class="prod-add" onclick="addToCart(event,'${p.id}')">+</button>
        </div>
      </div>
    </div>`).join('');
}

// ── Panier ────────────────────────────────────────────────
function addToCart(e, id) { e.stopPropagation(); addById(id); }
function addById(id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  const ex = cart.find(i => i.id === id);
  if (ex) ex.qty++; else cart.push({ ...p, qty: 1 });
  renderCart(); showToast(p.name + ' ajouté au panier');
}
function removeFromCart(id) { cart = cart.filter(i => i.id !== id); renderCart(); }
function changeQty(id, d) {
  const it = cart.find(i => i.id === id); if (!it) return;
  it.qty += d;
  if (it.qty <= 0) cart = cart.filter(i => i.id !== id);
  renderCart();
}
function updateCartFooter() {
  document.getElementById('cartFooter').style.display = (currentPage === 'cart' && cart.length > 0) ? 'block' : 'none';
}
function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = count; badge.style.display = count ? 'flex' : 'none';
  document.getElementById('cartTotalVal').textContent = fmt(total) + ' FCFA';
  const empty = document.getElementById('cartEmpty');
  const items = document.getElementById('cartItems');
  if (!cart.length) { empty.style.display = 'flex'; items.innerHTML = ''; updateCartFooter(); return; }
  empty.style.display = 'none';
  items.innerHTML = cart.map(it => {
    const img = it.image ? `<img src="${it.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.outerHTML='<span style=font-size:22px>${it.emoji}</span>'" />` : `<span style="font-size:22px">${it.emoji}</span>`;
    return `<div class="cart-item">
      <div class="ci-img" style="background:${it.bg||'var(--gold-light)'}">${img}</div>
      <div class="ci-body">
        <div class="ci-name">${it.name}</div>
        <div class="ci-cat">${it.cat}</div>
        <div class="ci-price">${fmt(it.price * it.qty)} FCFA</div>
        <div class="ci-qty">
          <button class="ci-qty-btn" onclick="changeQty('${it.id}',-1)">−</button>
          <span class="ci-qty-val">${it.qty}</span>
          <button class="ci-qty-btn" onclick="changeQty('${it.id}',1)">+</button>
        </div>
      </div>
      <button class="ci-del" onclick="removeFromCart('${it.id}')">✕</button>
    </div>`;
  }).join('');
  updateCartFooter();
}

// ── WhatsApp ──────────────────────────────────────────────
function orderWhatsApp() {
  if (!cart.length) return;
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  let msg = `Bonjour ${getShopName()} !\nJe voudrais commander :\n\n`;
  cart.forEach(i => { msg += `• ${i.name} ×${i.qty} — ${fmt(i.price * i.qty)} FCFA\n`; });
  msg += `\nTotal : ${fmt(total)} FCFA`;
  window.open(`https://wa.me/${getWaNum()}?text=${encodeURIComponent(msg)}`, '_blank');
}
function contactWhatsApp() {
  window.open(`https://wa.me/${getWaNum()}?text=${encodeURIComponent('Bonjour ' + getShopName() + ' !')}`, '_blank');
}
function shareProduct() {
  if (!currentModalId) return;
  const p = PRODUCTS.find(x => x.id === currentModalId); if (!p) return;
  const msg = `✨ *${p.name}*\n${p.cat} — *${fmt(p.price)} FCFA*\n\n${p.desc||''}\n\n📍 ${getShopName()}, Bouaké`;
  window.open(`https://wa.me/${getWaNum()}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Modal ─────────────────────────────────────────────────
// Liste des produits visibles à l'écran (pour navigation carousel global)
let modalProductList = [];

function openModal(id, list) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  currentModalId = id;

  // Si une liste est passée, on l'utilise ; sinon on garde la liste en cours
  if (list) modalProductList = list;

  // Image
  const wrap = document.getElementById('modalImgWrap');
  const src = p.image;
  if (src) {
    wrap.style.setProperty('--thumb-src', `url('${src}')`);
    wrap.style.removeProperty('background');
  } else {
    wrap.style.removeProperty('--thumb-src');
    wrap.style.background = p.bg || '';
  }
  let imgEl = wrap.querySelector('img, .modal-img-emoji');
  if (imgEl) imgEl.remove();
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center center;padding:16px 0 8px;box-sizing:border-box;z-index:1;';
    img.onerror = () => { const em = document.createElement('div'); em.className = 'modal-img-emoji'; em.textContent = p.emoji; img.replaceWith(em); };
    wrap.insertBefore(img, wrap.firstChild);
  } else {
    const em = document.createElement('div');
    em.className = 'modal-img-emoji'; em.textContent = p.emoji;
    wrap.insertBefore(em, wrap.firstChild);
  }

  // Infos
  document.getElementById('modalCat').textContent = p.cat;
  document.getElementById('modalName').textContent = p.name;
  document.getElementById('modalPrice').textContent = fmt(p.price) + ' FCFA';
  document.getElementById('modalDesc').textContent = p.desc || 'Produit de qualité supérieure — Parfumerie des Princes.';
  const badge = document.getElementById('modalBadge');
  badge.textContent = p.badge; badge.style.display = p.badge ? 'block' : 'none';
  const isFav = favs.some(f => f.id === id);
  const btn = document.getElementById('modalFav');
  btn.textContent = isFav ? '♥' : '♡'; btn.className = 'modal-fav-overlay' + (isFav ? ' liked' : '');

  // Flèches carousel global
  updateGlobalNavArrows();

  // Variantes (carousel de couleurs/tailles)
  renderVariants(p);
  updateNavArrows();

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Met à jour les flèches gauche/droite du carousel global
function updateGlobalNavArrows() {
  const idx = modalProductList.findIndex(x => x.id === currentModalId);
  const prev = document.getElementById('imgNavPrev');
  const next = document.getElementById('imgNavNext');
  if (!prev || !next) return;
  prev.style.display = idx > 0 ? 'flex' : 'none';
  next.style.display = (idx >= 0 && idx < modalProductList.length - 1) ? 'flex' : 'none';
}

// Navigation produit suivant/précédent dans le carousel global
function navigateImg(dir) {
  const idx = modalProductList.findIndex(x => x.id === currentModalId);
  const target = modalProductList[idx + dir];
  if (target) openModal(target.id);
}

function renderVariants(p) {
  updateNavArrows();
  const container = document.getElementById('modalVariants');
  if (!container) return;

  // Trouver les variantes : même groupe non vide, ou même nom de base
  let variants = [];
  if (p.groupe) {
    variants = PRODUCTS.filter(x => x.groupe && x.groupe === p.groupe);
  }
  // Fallback : même nom (sans tenir compte de la casse)
  if (variants.length <= 1) {
    const baseName = p.name.toLowerCase().replace(/\s*(noir|blanc|rose|or|doré|bleu|rouge|vert|beige|gris|silver|gold|black|white|pink)\s*/gi, '').trim();
    if (baseName.length > 3) {
      variants = PRODUCTS.filter(x => {
        const xBase = x.name.toLowerCase().replace(/\s*(noir|blanc|rose|or|doré|bleu|rouge|vert|beige|gris|silver|gold|black|white|pink)\s*/gi, '').trim();
        return xBase === baseName;
      });
    }
  }

  // Masquer si une seule variante (= pas de groupe)
  if (variants.length <= 1) {
  currentVariants = [];
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  currentVariants = variants;
    container.innerHTML = `
      <div class="variants-label">Autres coloris</div>
      <div class="variants-scroll">
        ${variants.map(v => `
        <div class="variant-thumb ${v.id === p.id ? 'active' : ''}" onclick="openModal('${v.id}')" title="${v.couleur || v.name}">
          ${v.image
            ? `<img src="${v.image}" onerror="this.style.display='none'" />`
            : `<span>${v.emoji}</span>`}
          ${v.couleur ? `<div class="variant-label">${v.couleur}</div>` : ''}
        </div>`).join('')}
    </div>`;
}

function closeModalBtn() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  currentModalId = null;
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = ''; currentModalId = null;
}
function addFromModal() {
  if (!currentModalId) return;
  addById(currentModalId);
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function toggleFavModal() {
  if (!currentModalId) return;
  const p = PRODUCTS.find(x => x.id === currentModalId); if (!p) return;
  const idx = favs.findIndex(f => f.id === currentModalId);
  if (idx >= 0) { favs.splice(idx, 1); showToast('Retiré des favoris'); }
  else { favs.push(p); showToast(p.name + ' ajouté aux favoris'); }
  localStorage.setItem('pdp_favs', JSON.stringify(favs));
  const isFav = favs.some(f => f.id === currentModalId);
  const btn = document.getElementById('modalFav');
  btn.textContent = isFav ? '♥' : '♡'; btn.className = 'modal-fav-overlay' + (isFav ? ' liked' : '');
  updateFavs();
}


// ── Appliquer les paramètres à l'UI ──────────────────────
function applySettingsToUI() {
  const name = getShopName();
  const addr = getShopAddr();
  const tel = localStorage.getItem('pdp_wa_number') || '';
  const telDisplay = tel ? '+' + tel.replace(/^\+/, '').replace(/(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}).*/, '$1 $2 $3 $4 $5 $6') : '+225 07 00 00 00 00';

  // Header
  const brandName = document.querySelector('.brand-name');
  if (brandName) brandName.textContent = name;
  const brandTel = document.querySelector('.brand-tel');
  if (brandTel && tel) brandTel.textContent = '📞 ' + telDisplay;

  // Page contact
  const chName = document.querySelector('.ch-name');
  if (chName) chName.textContent = name;
  const contactAddr = document.querySelector('#p-contact .info-val');
  if (contactAddr) contactAddr.textContent = addr;
  // Numéro dans contact
  const allInfoVals = document.querySelectorAll('#p-contact .info-val');
  if (allInfoVals[2] && tel) allInfoVals[2].textContent = telDisplay;
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Charger la config depuis le Sheet privé (met à jour localStorage)
  await loadConfig();
  applySettingsToUI();
  const loaded = await loadProducts();
  if (!loaded || !PRODUCTS.length) {
    document.getElementById('prodGrid').innerHTML = '<div class="no-results">Impossible de charger les produits. Vérifiez votre connexion.</div>';
  } else {
    renderProducts(); // Affiche "Tout" par défaut
  }
  updateFavs();
  renderCart();
  initHeaderScroll();
  initTripleTap();
});

// ── Navigation variantes par flèches ──────────────────────
let currentVariants = [];
function updateNavArrows() {
  const prev = document.getElementById('modalNavPrev');
  const next = document.getElementById('modalNavNext');
  if (!prev || !next) return;
  const idx = currentVariants.findIndex(v => v.id === currentModalId);
  prev.className = 'modal-nav-prev' + (idx > 0 ? ' visible' : '');
  next.className = 'modal-nav-next' + (idx < currentVariants.length - 1 ? ' visible' : '');
}
function navigateVariant(dir) {
  const idx = currentVariants.findIndex(v => v.id === currentModalId);
  const next = currentVariants[idx + dir];
  if (next) openModal(next.id);
}
