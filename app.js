const fmt = n => n.toLocaleString('fr-DZ') + ' DA';
let cart = JSON.parse(localStorage.getItem('girlyshop_cart')) || [];
let wish = new Set(JSON.parse(localStorage.getItem('girlyshop_wish')) || []);
let currentFilter = 'tout';
let currentSort = 'default';
let currentSearch = '';
let currentModalProductId = null;

// Initialize app
function init() {
  // Check local storage for language, default French
  currentLang = localStorage.getItem('girlyshop_lang') || 'fr';
  setLanguage(currentLang);

  render();
  updateCart();
  loadAlgeriaData();

  // Update wish buttons on initial load
  wish.forEach(id => {
    const btn = document.querySelector(`.pwish[onclick*="toggleWish(${id}"]`);
    if (btn) {
      btn.classList.add('active');
      btn.textContent = '♥';
    }
  });

  // Search input listener
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase();
      render();
    });
  }
}

// ── DELIVERY FORM LOGIC ──
let fetchedWilayas = [];
let fetchedBaladias = {};

async function loadAlgeriaData() {
  try {
    const data = typeof ALGERIA_DATA !== 'undefined' ? ALGERIA_DATA : [];
    if (!data.length) {
      console.warn("ALGERIA_DATA not loaded properly");
      return;
    }

    let wilayaMap = {};
    data.forEach(c => {
      // Find the chef-lieu to get the wilaya name
      if (c.post_code && String(c.post_code).endsWith('001')) {
        let wName = String(c.wilaya_id).padStart(2, '0') + ' - ' + c.name;
        if (String(c.wilaya_id) === "16") wName = "16 - Alger"; // Clean naming
        wilayaMap[c.wilaya_id] = wName;
      }
    });

    // Fallback if no 001 exists for a wilaya
    data.forEach(c => {
      if (!wilayaMap[c.wilaya_id]) wilayaMap[c.wilaya_id] = String(c.wilaya_id).padStart(2, '0') + ' - Wilaya';
    });

    Object.values(wilayaMap).forEach(wName => {
      if (!fetchedWilayas.includes(wName)) fetchedWilayas.push(wName);
      fetchedBaladias[wName] = [];
    });

    data.forEach(c => {
      let wName = wilayaMap[c.wilaya_id];
      fetchedBaladias[wName].push(c.name + (c.ar_name ? " (" + c.ar_name + ")" : ""));
    });

    fetchedWilayas.sort((a, b) => parseInt(a) - parseInt(b));
    initWilayas();
  } catch (err) {
    console.error('Failed to parse Commune_Of_Algeria JSON:', err);
  }
}

function initWilayas() {
  const wilayaSelect = document.getElementById('co-wilaya');
  const cwilayaSelect = document.getElementById('cwilaya'); // Contact Us Dropdown

  fetchedWilayas.forEach(w => {
    if (wilayaSelect) {
      let opt = document.createElement('option');
      opt.value = w;
      opt.textContent = w;
      wilayaSelect.appendChild(opt);
    }

    if (cwilayaSelect) {
      let opt2 = document.createElement('option');
      opt2.value = w;
      opt2.textContent = w;
      cwilayaSelect.appendChild(opt2);
    }
  });
}

function updateBaladias() {
  const wSelect = document.getElementById('co-wilaya');
  const bSelect = document.getElementById('co-baladia');
  const selectedWilaya = wSelect.value;

  bSelect.innerHTML = '<option value="">Commune *</option>';

  if (!selectedWilaya) {
    bSelect.disabled = true;
    return;
  }

  bSelect.disabled = false;

  if (fetchedBaladias[selectedWilaya]) {
    fetchedBaladias[selectedWilaya].sort().forEach(b => {
      let opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      bSelect.appendChild(opt);
    });
  } else {
    let opt = document.createElement('option');
    opt.value = "Autre Commune (à préciser)";
    opt.textContent = "Autre Commune (à préciser)";
    bSelect.appendChild(opt);
  }
}

// Save state to LocalStorage
function saveState() {
  localStorage.setItem('girlyshop_cart', JSON.stringify(cart));
  localStorage.setItem('girlyshop_wish', JSON.stringify([...wish]));
}

function getFiltered() {
  let arr = currentFilter === 'tout' ? [...PRODS]
    : currentFilter === 'solde' ? PRODS.filter(p => p.badge === 'sale')
      : PRODS.filter(p => p.cat === currentFilter);

  // Apply Search
  if (currentSearch) {
    arr = arr.filter(p => p.name.toLowerCase().includes(currentSearch) || p.cat.toLowerCase().includes(currentSearch));
  }

  // Apply Sort
  if (currentSort === 'price-asc') arr.sort((a, b) => a.price - b.price);
  else if (currentSort === 'price-desc') arr.sort((a, b) => b.price - a.price);
  else if (currentSort === 'new') arr.sort((a, b) => (b.badge === 'new' ? 1 : 0) - (a.badge === 'new' ? 1 : 0));

  return arr;
}

function render() {
  const grid = document.getElementById('pgrid');
  if (!grid) return;
  const arr = getFiltered();

  if (arr.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--grey);">Aucun produit ne correspond à votre recherche.</div>`;
    return;
  }

  grid.innerHTML = arr.map((p, i) => {
    const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const badgeText = p.badge === 'sale' ? (currentLang === 'ar' ? 'تخفيض' : 'Solde') : (currentLang === 'ar' ? 'جديد' : 'Nouveau');
    const apercuBtn = currentLang === 'ar' ? 'معاينة وإضافة' : 'Aperçu & Ajouter';

    return `
    <div class="pcard" style="animation-delay:${i * 0.07}s" onclick="openProductModal(${p.id})">
      <div class="pcard-img">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        ${p.badge ? `<div class="pbadge ${p.badge}">${badgeText}</div>` : ''}
        ${disc ? `<div class="pdiscount">-${disc}%</div>` : ''}
        <div class="pactions">
          <button class="padd" onclick="event.stopPropagation();openProductModal(${p.id})">${apercuBtn}</button>
          <button class="pwish ${wish.has(p.id) ? 'active' : ''}" onclick="event.stopPropagation();toggleWish(${p.id},this)">${wish.has(p.id) ? '♥' : '♡'}</button>
        </div>
      </div>
      <div class="pinfo">
        <div class="pcat">${p.cat.charAt(0).toUpperCase() + p.cat.slice(1)}</div>
        <div class="pname">${p.name}</div>
        <div class="pprice">
          <span class="now">${fmt(p.price)}</span>
          ${p.oldPrice ? `<span class="old">${fmt(p.oldPrice)}</span>` : ''}
        </div>
        <div class="psizes">${p.sizes.map(s => `<span class="szp">${s}</span>`).join('')}</div>
      </div>
    </div>`;
  }).join('');
}

function filterP(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  render();
}

function sortP(v) { currentSort = v; render(); }

function toggleWish(id, btn) {
  if (wish.has(id)) {
    wish.delete(id);
    if (btn) { btn.textContent = '♡'; btn.classList.remove('active'); }
    showToast(currentLang === 'ar' ? 'تم الإزالة من المفضلة' : 'Retiré des favoris');
  } else {
    wish.add(id);
    if (btn) { btn.textContent = '♥'; btn.classList.add('active'); }
    showToast(currentLang === 'ar' ? 'تمت الإضافة للمفضلة ♥' : 'Ajouté aux favoris ♥');
  }
  saveState();
  // Update wishlist icon in modal if open
  const modalWish = document.getElementById('mdl-wish-btn');
  if (modalWish && currentModalProductId === id) {
    if (wish.has(id)) { modalWish.textContent = '♥'; modalWish.classList.add('active'); }
    else { modalWish.textContent = '♡'; modalWish.classList.remove('active'); }
  }
}

// Add to cart with size from Modal
function addCartModal() {
  if (!currentModalProductId) return;
  const p = PRODS.find(x => x.id === currentModalProductId);

  // Check size selection if available
  const selectedSizeEl = document.querySelector('.sz-opt.selected');
  let size = p.sizes[0]; // default

  if (p.sizes.length > 0 && p.sizes[0] !== "Unique") {
    if (!selectedSizeEl) {
      document.getElementById('sz-error').style.display = 'block';
      return;
    }
    size = selectedSizeEl.dataset.size;
  }

  document.getElementById('sz-error').style.display = 'none';

  addCart(p.id, size);
  closeProductModal();
}

function addCart(id, size) {
  const p = PRODS.find(x => x.id === id);
  // Item identity is id + size
  const ex = cart.find(x => x.id === id && x.selectedSize === size);
  if (ex) ex.qty++;
  else cart.push({ ...p, qty: 1, selectedSize: size });

  updateCart();
  saveState();
  showToast((currentLang === 'ar' ? 'تمت الإضافة ✦ ' : '') + `"${p.name}"` + (currentLang === 'fr' ? ' ajouté ✦' : ''));
}

function removeCart(index) {
  cart.splice(index, 1);
  updateCart();
  saveState();
}

function changeQty(index, d) {
  const item = cart[index];
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) removeCart(index);
  else {
    updateCart();
    saveState();
  }
}

let discountAmount = 0;
let promoActive = false;

function applyPromo() {
  const val = document.getElementById('promo-input').value.trim().toUpperCase();
  const msgEl = document.getElementById('promo-msg');
  if (val === 'AID26') {
    promoActive = true;
    msgEl.textContent = 'Code promo AID26 appliqué (-10%)';
    msgEl.style.color = 'var(--green)';
    msgEl.style.display = 'block';
  } else {
    promoActive = false;
    msgEl.textContent = 'Code invalide ou expiré';
    msgEl.style.color = 'red';
    msgEl.style.display = 'block';
  }
  updateCart();
}

function updateCart() {
  const totalQty = cart.reduce((s, x) => s + x.qty, 0);
  document.getElementById('cart-count').textContent = totalQty;
  const mobCount = document.getElementById('s-count');
  if (mobCount) mobCount.textContent = totalQty;
  document.getElementById('cart-subtitle').textContent = totalQty + ' article' + (totalQty > 1 ? 's' : '');

  const list = document.getElementById('cpitems');
  const foot = document.getElementById('cpfoot');
  if (!cart.length) {
    let emptyMsg = currentLang === 'ar' ? 'سلة التسوق فارغة' : 'Votre panier est vide';
    list.innerHTML = `<div class="cart-empty-msg"><div style="font-size:3rem;opacity:.3">🛍️</div><p>${emptyMsg}</p></div>`;
    foot.style.display = 'none';
    promoActive = false; // reset promo if cart empty
  } else {
    let trSize = currentLang === 'ar' ? 'المقاس' : 'Taille';
    let trRemove = currentLang === 'ar' ? 'إزالة' : 'Retirer';

    list.innerHTML = cart.map((item, index) => `
      <div class="ci">
        <div class="ci-img"><img src="${item.img}" alt="${item.name}"></div>
        <div class="ci-info">
          <div class="ci-name">${item.name}</div>
          <div class="ci-meta">${trSize}: ${item.selectedSize}</div>
          <div class="ci-row">
            <div class="qctrl">
              <button class="qbtn" onclick="changeQty(${index},-1)">−</button>
              <span class="qnum">${item.qty}</span>
              <button class="qbtn" onclick="changeQty(${index},1)">+</button>
            </div>
            <span class="ci-price">${fmt(item.price * item.qty)}</span>
          </div>
          <button class="ci-rm" onclick="removeCart(${index})">${trRemove}</button>
        </div>
      </div>`).join('');

    const sub = cart.reduce((s, x) => s + x.price * x.qty, 0);
    document.getElementById('cp-sub').textContent = fmt(sub);

    let total = sub;
    if (promoActive) {
      discountAmount = sub * 0.10; // 10% off
      total = sub - discountAmount;
      document.getElementById('cp-sub').innerHTML = `<s>${fmt(sub)}</s> <span style="color:var(--pink)">(-10%)</span>`;
    } else {
      discountAmount = 0;
    }

    document.getElementById('cp-total').textContent = fmt(total);
    foot.style.display = 'block';
  }
}

function toggleCart() {
  document.getElementById('cart-ov').classList.toggle('open');
  document.getElementById('cart-panel').classList.toggle('open');
}

function checkout() {
  if (!cart.length) return;

  // Get checkout form data
  const name = document.getElementById('co-name').value.trim();
  const phone = document.getElementById('co-phone').value.trim();
  const wilaya = document.getElementById('co-wilaya').value;
  const baladia = document.getElementById('co-baladia').value;
  const address = document.getElementById('co-address').value.trim();

  if (!name || !phone || !wilaya || !baladia || !address) {
    showToast(TRANSLATIONS['js_alert_fill'][currentLang]);
    return;
  }

  let lOrder = currentLang === 'ar' ? 'طلب جديد' : 'Nouvelle commande';
  let lClient = currentLang === 'ar' ? 'الزبون(ة)' : 'Client(e)';
  let lPhone = currentLang === 'ar' ? 'رقم الهاتف' : 'Téléphone';
  let lAddr = currentLang === 'ar' ? 'العنوان' : 'Adresse';
  let lDet = currentLang === 'ar' ? 'تفاصيل الطلبية' : 'Détails de la commande';
  let lSz = currentLang === 'ar' ? 'المقاس' : 'Taille';
  let lQty = currentLang === 'ar' ? 'الكمية' : 'Qté';
  let lTotal = currentLang === 'ar' ? 'المجموع' : 'Total';
  let lDelivery = currentLang === 'ar' ? 'توصيل مجاني | الدفع عند الاستلام' : 'Livraison gratuite | Paiement à la livraison';

  let msg = `🌸 *GIRLY SHOP - ${lOrder}*\n\n`;

  msg += `👤 *${lClient}:* ${name}\n`;
  msg += `📱 *${lPhone}:* ${phone}\n`;
  msg += `📍 *${lAddr}:* ${address}, ${baladia}, ${wilaya}\n\n`;

  msg += `*${lDet}:*\n`;
  cart.forEach(item => {
    msg += `- ${item.name}\n  ${lSz}: ${item.selectedSize} | ${lQty}: ${item.qty} | ${fmt(item.price * item.qty)}\n\n`;
  });

  const sub = cart.reduce((s, x) => s + x.price * x.qty, 0);
  if (promoActive) {
    msg += `🎁 *Promo AID26 Appliquée: -10%*\n`;
  }
  const total = sub - discountAmount;
  msg += `💰 *${lTotal}: ${fmt(total)}*\n`;
  msg += `🚚 ${lDelivery} 💳`;

  // Custom encoding to ensure WhatsApp reads spaces and newlines correctly without %EF%BF%BD
  const encodedMsg = encodeURIComponent(msg).replace(/%20/g, '+');

  window.open(`https://api.whatsapp.com/send/?phone=213542654405&text=${encodedMsg}&type=phone_number&app_absent=0`, '_blank');
}

function sendContact() {
  const n = document.getElementById('cname').value.trim();
  const p = document.getElementById('cphone').value.trim();
  const m = document.getElementById('cmsg').value.trim();
  const w = document.getElementById('cwilaya').value;
  if (!n || !p) { showToast(currentLang === 'ar' ? 'الرجاء ملء الحقول الإلزامية' : 'Remplissez les champs obligatoires'); return; }

  let lMsgOf = currentLang === 'ar' ? 'رسالة من' : 'Message de';
  let lPhone = currentLang === 'ar' ? 'رقم الهاتف' : 'Téléphone';
  let lMsg = currentLang === 'ar' ? 'الرسالة' : 'Message';

  let msg = `🌸 *GIRLY SHOP - ${lMsgOf} ${n}*\n\n`;
  msg += `📞 ${lPhone}: ${p}\n`;
  if (w) msg += `📍 Wilaya: ${w}\n`;
  if (m) msg += `\n💬 ${lMsg}:\n${m}`;

  const encodedMsg = encodeURIComponent(msg).replace(/%20/g, '+');
  window.open(`https://api.whatsapp.com/send/?phone=213542654405&text=${encodedMsg}&type=phone_number&app_absent=0`, '_blank');

  showToast(TRANSLATIONS['js_msg_sent'][currentLang]);
  document.getElementById('cname').value = '';
  document.getElementById('cphone').value = '';
  document.getElementById('cmsg').value = '';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// Modal Logic
function openProductModal(id) {
  const p = PRODS.find(x => x.id === id);
  currentModalProductId = id;

  document.getElementById('mdl-img').src = p.img;
  document.getElementById('mdl-name').textContent = p.name;
  document.getElementById('mdl-cat').textContent = p.cat.charAt(0).toUpperCase() + p.cat.slice(1);

  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  let priceHTML = `<span class="now">${fmt(p.price)}</span>`;
  if (p.oldPrice) priceHTML += `<span class="old">${fmt(p.oldPrice)}</span>`;
  if (disc) priceHTML += `<span style="background:var(--accent);color:#fff;font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:4px;font-weight:bold;">-${disc}%</span>`;
  document.getElementById('mdl-price').innerHTML = priceHTML;
  document.getElementById('mdl-desc').textContent = p.desc || '';

  // Sizes
  const szContainer = document.getElementById('mdl-sizes');
  if (p.sizes.length === 1 && p.sizes[0] === "Unique") {
    szContainer.innerHTML = `<div class="sz-opt selected" data-size="Unique">Unique</div>`;
  } else {
    szContainer.innerHTML = p.sizes.map(s => `<div class="sz-opt" onclick="selectSize(this)" data-size="${s}">${s}</div>`).join('');
  }
  document.getElementById('sz-error').style.display = 'none';

  // Wish button state
  const wishBtn = document.getElementById('mdl-wish-btn');
  if (wish.has(id)) {
    wishBtn.classList.add('active');
    wishBtn.textContent = '♥';
  } else {
    wishBtn.classList.remove('active');
    wishBtn.textContent = '♡';
  }

  document.getElementById('modal-ov').classList.add('open');
}

function selectSize(el) {
  document.querySelectorAll('.sz-opt').forEach(opt => opt.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('sz-error').style.display = 'none';
}

function closeProductModal() {
  document.getElementById('modal-ov').classList.remove('open');
  currentModalProductId = null;
}

// ── TRANSLATION LOGIC ──
function toggleLanguage() {
  const newLang = currentLang === 'fr' ? 'ar' : 'fr';
  setLanguage(newLang);
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('girlyshop_lang', lang);

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Update button UI
  const btn = document.getElementById('lang-btn');
  if (btn) {
    if (lang === 'ar') btn.innerHTML = '<span style="opacity:0.6;font-weight:400">FR</span> <span style="font-size:0.8em; opacity:0.6;">|</span> <span style="font-weight:700">ع</span>';
    else btn.innerHTML = '<span style="font-weight:700">FR</span> <span style="font-size:0.8em; opacity:0.6;">|</span> <span style="opacity:0.6;font-weight:400">ع</span>';
  }

  // Translate DOM nodes automatically based on tags
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (TRANSLATIONS[key] && TRANSLATIONS[key][lang]) {
      // Don't overwrite inner HTML entirely if it has other elements, just text content
      let textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
      if (textNode) {
        textNode.textContent = TRANSLATIONS[key][lang];
      } else {
        el.innerHTML = TRANSLATIONS[key][lang];
      }
    }
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (TRANSLATIONS[key] && TRANSLATIONS[key][lang]) {
      el.setAttribute('placeholder', TRANSLATIONS[key][lang]);
    }
  });

  // Re-render JS dynamic strings
  render();
  updateCart();
}

// On document load
document.addEventListener('DOMContentLoaded', init);
