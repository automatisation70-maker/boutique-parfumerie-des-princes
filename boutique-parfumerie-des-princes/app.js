// ─────────────────────────────────────────────────────────
//  app.js — Parfumerie des Princes
// ─────────────────────────────────────────────────────────

// ── État global ───────────────────────────────────────────
let cart = [];
let favs = JSON.parse(localStorage.getItem('pdp_favs') || '[]');
let currentCat = 'Tout';
let currentPriceRange = 'all';
let currentSearch = '';
let toastTimer = null;

// ── Formatage ─────────────────────────────────────────────
function fmt(n) {
  return Number(n).toLocaleString('fr-FR');
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg) {
  clearTimeout(toastTimer);
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Navigation ────────────────────────────────────────────
function goTo(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('p-' + page).classList.add('active');
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
}

// ── Filtres catégorie ─────────────────────────────────────
function filterCat(cat, el) {
  currentCat = cat;
  currentPriceRange = 'all';

  document.querySelectorAll('.cp').forEach(c => c.classList.remove('active'));
  if (el) {
    el.classList.add('active');
  } else {
    document.querySelectorAll('.cp').forEach(c => {
      if (c.dataset.cat === cat) c.classList.add('active');
    });
  }

  // Afficher/masquer filtres prix
  const pf = document.getElementById('priceFilters');
  pf.style.display = cat === 'Tout' ? 'none' : 'flex';
  document.querySelectorAll('.pf').forEach(b => b.classList.remove('active'));
  const allBtn = document.querySelector('.pf[data-range="all"]');
  if (allBtn) allBtn.classList.add('active');

  // Afficher/masquer sections
  const showAll = cat === 'Tout';
  document.getElementById('catSection').style.display = showAll ? 'block' : 'none';
  document.getElementById('coupSection').style.display = showAll ? 'block' : 'none';
  document.getElementById('prodTitle').textContent = showAll ? 'Tous les produits' : cat + (cat === 'Chaine' ? 's' : cat === 'Sac' ? 's' : cat === 'Parfum' ? 's' : 's');

  renderProducts();
  goTo('home', document.querySelector('.ni[data-page="home"]'));
}

// ── Filtres prix ──────────────────────────────────────────
function filterPrice(range, el) {
  currentPriceRange = range;
  document.querySelectorAll('.pf').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderProducts();
}

// ── Recherche ─────────────────────────────────────────────
function doSearch(q) {
  currentSearch = q.trim().toLowerCase();
  const clear = document.getElementById('searchClear');
  clear.style.display = q ? 'block' : 'none';

  if (q) {
    document.getElementById('catSection').style.display = 'none';
    document.getElementById('coupSection').style.display = 'none';
    document.getElementById('priceFilters').style.display = 'none';
    document.getElementById('prodTitle').textContent = `Résultats pour "${q}"`;
  } else {
    clearSearch();
    return;
  }
  renderProducts();
}

function clearSearch() {
  currentSearch = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  const showAll = currentCat === 'Tout';
  document.getElementById('catSection').style.display = showAll ? 'block' : 'none';
  document.getElementById('coupSection').style.display = showAll ? 'block' : 'none';
  document.getElementById('prodTitle').textContent = showAll ? 'Tous les produits' : currentCat + 's';
  if (currentCat !== 'Tout') document.getElementById('priceFilters').style.display = 'flex';
  renderProducts();
}

// ── Rendu produits ────────────────────────────────────────
function getFilteredProducts() {
  let list = PRODUCTS;

  if (currentSearch) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(currentSearch) ||
      p.cat.toLowerCase().includes(currentSearch)
    );
    return list;
  }

  if (currentCat !== 'Tout') {
    list = list.filter(p => p.cat === currentCat);
  }

  if (currentPriceRange !== 'all') {
    const [min, max] = currentPriceRange.split('-').map(Number);
    list = list.filter(p => p.price >= min && p.price <= max);
  }

  return list;
}

function prodImgHtml(p) {
  if (p.image) {
    return `<img src="${p.image}" alt="${p.name}"
      style="width:100%;height:100%;object-fit:contain"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
      <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:40px">${p.emoji}</span>`;
  }
  return `<span>${p.emoji}</span>`;
}

function renderProducts() {
  const grid = document.getElementById('prodGrid');
  const list = getFilteredProducts();

  if (!list.length) {
    grid.innerHTML = '<div class="no-results">Aucun produit trouvé</div>';
    return;
  }

  grid.innerHTML = list.map(p => {
    const isFav = favs.some(f => f.id === p.id);
    return `
      <div class="prod-card" onclick="openModal('${p.id}')">
        <div class="prod-img" style="background:${p.bg}">
          ${prodImgHtml(p)}
          ${p.badge ? `<div class="prod-badge">${p.badge}</div>` : ''}
          <button class="prod-fav ${isFav ? 'liked' : 'unliked'}"
            onclick="toggleFav(event,'${p.id}')"
            aria-label="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
            ${isFav ? '♥' : '♡'}
          </button>
        </div>
        <div class="prod-info">
          <div class="prod-cat">${p.cat}</div>
          <div class="prod-name">${p.name}</div>
          <div class="prod-row">
            <div class="prod-price">${fmt(p.price)} <span>FCFA</span></div>
            <button class="prod-add" onclick="addToCart(event,'${p.id}')" aria-label="Ajouter au panier">+</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Featured ──────────────────────────────────────────────
function renderFeatured() {
  if (!FEATURED) { document.getElementById('coupSection').style.display = 'none'; return; }
  const imgHtml = FEATURED.image
    ? `<img src="${FEATURED.image}" alt="${FEATURED.name}" style="width:100%;height:100%;object-fit:contain;border-radius:10px" />`
    : `<span style="font-size:30px">${FEATURED.emoji}</span>`;
  document.getElementById('featuredCard').innerHTML = `
    <div class="feat-img">${imgHtml}</div>
    <div>
      <div class="feat-cat">${FEATURED.cat}</div>
      <div class="feat-name">${FEATURED.name}</div>
      <div class="feat-desc">${FEATURED.desc || ''}</div>
      <div class="feat-row">
        <div class="feat-price">${fmt(FEATURED.price)} FCFA</div>
        <button class="feat-btn" onclick="addToCartById('${FEATURED.id}')">+ Panier</button>
      </div>
    </div>`;
}

// ── Panier ────────────────────────────────────────────────
function addToCart(event, id) {
  event.stopPropagation();
  addToCartById(id);
}

function addToCartById(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const ex = cart.find(i => i.id === id);
  if (ex) ex.qty++;
  else cart.push({ ...p, qty: 1 });
  updateCart();
  showToast(p.name + ' ajouté au panier');
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCart();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  updateCart();
}

function updateCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const badge = document.getElementById('cartBadge');
  badge.textContent = count;
  badge.style.display = count ? 'flex' : 'none';

  const footer = document.getElementById('cartFooter');
  const emptyEl = document.getElementById('cartEmpty');
  const itemsEl = document.getElementById('cartItems');

  if (!cart.length) {
    emptyEl.style.display = 'flex';
    itemsEl.innerHTML = '';
    footer.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  footer.style.display = 'block';
  document.getElementById('cartTotalVal').textContent = fmt(total) + ' FCFA';

  itemsEl.innerHTML = cart.map(it => `
    <div class="cart-item">
      <div class="ci-img">${it.emoji}</div>
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
      <button class="ci-del" onclick="removeFromCart('${it.id}')" aria-label="Supprimer">✕</button>
    </div>`).join('');
}

// ── Favoris ───────────────────────────────────────────────
function toggleFav(event, id) {
  event.stopPropagation();
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const idx = favs.findIndex(f => f.id === id);
  if (idx >= 0) {
    favs.splice(idx, 1);
    showToast('Retiré des favoris');
  } else {
    favs.push(p);
    showToast(p.name + ' ajouté aux favoris');
  }
  localStorage.setItem('pdp_favs', JSON.stringify(favs));
  renderProducts();
  updateFavs();
}

function updateFavs() {
  const emptyEl = document.getElementById('favEmpty');
  const grid = document.getElementById('favGrid');

  if (!favs.length) {
    emptyEl.style.display = 'flex';
    grid.innerHTML = '';
    return;
  }

  emptyEl.style.display = 'none';
  grid.innerHTML = favs.map(p => `
    <div class="prod-card">
      <div class="prod-img" style="background:${p.bg}">
        <span>${p.emoji}</span>
        <button class="prod-fav liked" onclick="toggleFav(event,'${p.id}')" aria-label="Retirer des favoris">♥</button>
      </div>
      <div class="prod-info">
        <div class="prod-cat">${p.cat}</div>
        <div class="prod-name">${p.name}</div>
        <div class="prod-row">
          <div class="prod-price">${fmt(p.price)} <span>FCFA</span></div>
          <button class="prod-add" onclick="addToCart(event,'${p.id}')" aria-label="Ajouter au panier">+</button>
        </div>
      </div>
    </div>`).join('');
}

// ── WhatsApp ──────────────────────────────────────────────
function contactWhatsApp() {
  const waNum = '2250700000000';
  window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent('Bonjour Parfumerie des Princes !'), '_blank');
}

function orderWhatsApp() {
  if (!cart.length) return;
  const waNum = localStorage.getItem('pdp_wa_number') || '2250700000000';
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  let msg = 'Bonjour Parfumerie des Princes !\nJe voudrais commander :\n\n';
  cart.forEach(i => {
    msg += `• ${i.name} ×${i.qty} — ${fmt(i.price * i.qty)} FCFA\n`;
  });
  msg += `\nTotal : ${fmt(total)} FCFA`;
  window.open('https://wa.me/' + waNum.replace(/\D/g, '') + '?text=' + encodeURIComponent(msg), '_blank');
}

function contactWhatsApp() {
  const waNum = localStorage.getItem('pdp_wa_number') || '2250700000000';
  const shopName = localStorage.getItem('pdp_shop_name') || 'Parfumerie des Princes';
  window.open('https://wa.me/' + waNum.replace(/\D/g, '') + '?text=' + encodeURIComponent('Bonjour ' + shopName + ' !'), '_blank');
}

// ── Modal produit ─────────────────────────────────────────

let currentModalId = null;

function openModal(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  currentModalId = id;

  // Image
  const imgWrap = document.getElementById('modalImgWrap');
  imgWrap.style.background = p.bg;
  if (p.image) {
    imgWrap.innerHTML = `<img src="${p.image}" alt="${p.name}"
      onerror="this.outerHTML='<div class=modal-img-emoji>${p.emoji}</div>'" />`;
  } else {
    imgWrap.innerHTML = `<div class="modal-img-emoji">${p.emoji}</div>`;
  }

  document.getElementById('modalCat').textContent = p.cat;
  document.getElementById('modalName').textContent = p.name;
  document.getElementById('modalPrice').textContent = fmt(p.price) + ' FCFA';
  document.getElementById('modalDesc').textContent = p.desc || 'Produit de qualité supérieure — Parfumerie des Princes, Bouaké.';

  const badge = document.getElementById('modalBadge');
  if (p.badge) { badge.textContent = p.badge; badge.style.display = 'block'; }
  else { badge.style.display = 'none'; }

  const isFav = favs.some(f => f.id === id);
  const favBtn = document.getElementById('modalFav');
  favBtn.textContent = isFav ? '♥' : '♡';
  favBtn.className = 'modal-fav' + (isFav ? ' liked' : '');

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  currentModalId = null;
}

function addFromModal() {
  if (!currentModalId) return;
  addToCartById(currentModalId);
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function toggleFavModal() {
  if (!currentModalId) return;
  const p = PRODUCTS.find(x => x.id === currentModalId);
  if (!p) return;
  const idx = favs.findIndex(f => f.id === currentModalId);
  if (idx >= 0) {
    favs.splice(idx, 1);
    showToast('Retiré des favoris');
  } else {
    favs.push(p);
    showToast(p.name + ' ajouté aux favoris');
  }
  localStorage.setItem('pdp_favs', JSON.stringify(favs));
  const favBtn = document.getElementById('modalFav');
  const isFav = favs.some(f => f.id === currentModalId);
  favBtn.textContent = isFav ? '♥' : '♡';
  favBtn.className = 'modal-fav' + (isFav ? ' liked' : '');
  renderProducts();
  updateFavs();
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Afficher un loader pendant le chargement
  document.getElementById('prodGrid').innerHTML = '<div class="no-results">Chargement des produits…</div>';

  // Charger depuis Google Sheets
  const loaded = await loadProducts();

  if (!loaded || PRODUCTS.length === 0) {
    document.getElementById('prodGrid').innerHTML = '<div class="no-results">Impossible de charger les produits.</div>';
  } else {
    renderProducts();
    renderFeatured();
  }

  updateFavs();
  updateCart();
});
