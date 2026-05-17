// =========================================
//  KISAN BAZAR — app.js
//  All frontend logic lives here.
//  Data stored in localStorage for now.
//  Later: swap localStorage calls with API.
// =========================================

// --- DATA STORE ---
// When backend is ready, replace these with fetch() calls.
let crops = JSON.parse(localStorage.getItem('kb_crops') || '[]');

// Category keywords for chip filter
const CATEGORY_KEYWORDS = {
  vegetable: ['tomato', 'onion', 'potato', 'brinjal', 'capsicum', 'cabbage',
              'cauliflower', 'carrot', 'spinach', 'peas', 'beans', 'ladyfinger',
              'bhindi', 'palak', 'methi', 'gobi', 'aloo', 'tamatar', 'pyaaz'],
  fruit:     ['mango', 'banana', 'apple', 'grapes', 'pomegranate', 'guava',
              'papaya', 'watermelon', 'orange', 'lemon', 'aam', 'kela',
              'angur', 'anar', 'tarbooz'],
  grain:     ['wheat', 'rice', 'maize', 'jowar', 'bajra', 'corn', 'barley',
              'gehu', 'chawal', 'makka', 'dal', 'lentil', 'chana', 'moong'],
  spice:     ['turmeric', 'chilli', 'coriander', 'garlic', 'ginger', 'cumin',
              'jeera', 'haldi', 'mirch', 'lehsun', 'adrak', 'pepper', 'ajwain'],
};

let activeFilter = 'all';

// --- NAVIGATION ---
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  window.scrollTo(0, 0);

  if (page === 'farmer') renderFarmerListings();
  if (page === 'buyer')  renderBuyerListings();
}

// --- ADD CROP (Farmer Panel) ---
function addCrop() {
  const name     = document.getElementById('cropName').value.trim();
  const qty      = document.getElementById('cropQty').value.trim();
  const price    = document.getElementById('cropPrice').value.trim();
  const farmer   = document.getElementById('farmerName').value.trim();
  const contact  = document.getElementById('farmerContact').value.trim();
  const location = document.getElementById('farmerLocation').value.trim();

  const msgEl = document.getElementById('form-msg');

  // Validation
  if (!name || !qty || !price || !farmer || !contact) {
    showMsg(msgEl, '⚠️ Please fill all required (*) fields.', 'error');
    return;
  }
  if (!/^\d{10}$/.test(contact)) {
    showMsg(msgEl, '⚠️ Enter a valid 10-digit mobile number.', 'error');
    return;
  }
  if (Number(qty) <= 0 || Number(price) <= 0) {
    showMsg(msgEl, '⚠️ Quantity and Price must be greater than 0.', 'error');
    return;
  }

  const crop = {
    id:       Date.now(),
    name:     name,
    qty:      Number(qty),
    price:    Number(price),
    farmer:   farmer,
    contact:  contact,
    location: location || 'Not specified',
    addedOn:  new Date().toLocaleDateString('en-IN'),
    category: detectCategory(name),
  };

  crops.unshift(crop);            // newest first
  saveData();
  clearForm();
  renderFarmerListings();
  showMsg(msgEl, '✅ Crop listed successfully!', 'success');
  setTimeout(() => { msgEl.textContent = ''; }, 3000);
}

// --- DELETE CROP ---
function deleteCrop(id) {
  if (!confirm('Remove this listing?')) return;
  crops = crops.filter(c => c.id !== id);
  saveData();
  renderFarmerListings();
}

// --- RENDER: FARMER LISTINGS ---
function renderFarmerListings() {
  const container = document.getElementById('farmer-listings');
  const countEl   = document.getElementById('farmer-count');

  countEl.textContent = crops.length;

  if (crops.length === 0) {
    container.innerHTML = '<p class="empty-msg">No crops listed yet. Add your first crop above!</p>';
    return;
  }

  container.innerHTML = crops.map(c => `
    <div class="crop-card">
      <div class="crop-top">
        <span class="crop-name">${escHtml(c.name)}</span>
        <span class="crop-price">₹${c.price}/kg</span>
      </div>
      <div class="crop-meta">
        <span class="meta-pill">📦 ${c.qty} kg</span>
        <span class="meta-pill">📅 ${c.addedOn}</span>
        ${c.location !== 'Not specified' ? `<span class="meta-pill">📍 ${escHtml(c.location)}</span>` : ''}
      </div>
      <div class="crop-footer">
        <div class="farmer-info">
          <strong>${escHtml(c.farmer)}</strong><br/>
          ${escHtml(c.contact)}
        </div>
        <button class="delete-btn" onclick="deleteCrop(${c.id})">Remove</button>
      </div>
    </div>
  `).join('');
}

// --- RENDER: BUYER LISTINGS ---
function renderBuyerListings() {
  const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const container = document.getElementById('buyer-listings');
  const countEl   = document.getElementById('buyer-count');

  let filtered = crops;

  // Category filter
  if (activeFilter !== 'all') {
    filtered = filtered.filter(c => c.category === activeFilter);
  }

  // Search filter
  if (searchVal) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(searchVal)   ||
      c.farmer.toLowerCase().includes(searchVal) ||
      c.location.toLowerCase().includes(searchVal)
    );
  }

  countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = crops.length === 0
      ? '<p class="empty-msg">No crops available yet. Check back soon!</p>'
      : '<p class="empty-msg">No results found. Try a different search.</p>';
    return;
  }

  container.innerHTML = filtered.map(c => `
    <div class="crop-card">
      <div class="crop-top">
        <span class="crop-name">${escHtml(c.name)}</span>
        <span class="crop-price">₹${c.price}/kg</span>
      </div>
      <div class="crop-meta">
        <span class="meta-pill">📦 ${c.qty} kg available</span>
        ${c.location !== 'Not specified' ? `<span class="meta-pill">📍 ${escHtml(c.location)}</span>` : ''}
        <span class="meta-pill">📅 ${c.addedOn}</span>
      </div>
      <div class="crop-footer">
        <div class="farmer-info">
          <strong>${escHtml(c.farmer)}</strong>
        </div>
        <button class="contact-btn" onclick="openModal(${c.id})">📞 Contact</button>
      </div>
    </div>
  `).join('');
}

// --- SEARCH & FILTER ---
function filterCrops() {
  renderBuyerListings();
}

function setFilter(category, btn) {
  activeFilter = category;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderBuyerListings();
}

// --- CONTACT MODAL ---
function openModal(id) {
  const crop = crops.find(c => c.id === id);
  if (!crop) return;

  document.getElementById('modal-farmer-name').textContent = crop.farmer;
  document.getElementById('modal-crop-info').textContent =
    `${crop.name} · ₹${crop.price}/kg · ${crop.qty}kg available · ${crop.location}`;
  document.getElementById('modal-call-btn').href = `tel:${crop.contact}`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// --- HELPERS ---
function detectCategory(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'other';
}

function saveData() {
  localStorage.setItem('kb_crops', JSON.stringify(crops));
}

function clearForm() {
  ['cropName','cropQty','cropPrice','farmerName','farmerContact','farmerLocation']
    .forEach(id => { document.getElementById(id).value = ''; });
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'form-msg ' + type;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Close modal on back button (Android)
window.addEventListener('popstate', closeModal);
