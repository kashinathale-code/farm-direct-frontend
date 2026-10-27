// ============================================================================
// FARM DIRECT — FARMER DASHBOARD CONTROLLER
// ============================================================================

const API_URL = window.API_URL || API_BASE_URL;
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || user.role !== 'farmer') {
  window.location.href = 'login.html';
}

// Global Farmer State
const LOW_STOCK_THRESHOLD = 5;
let farmerCropsMap = {};
let allFarmerOrders = [];
let activeOrderFilter = 'all';
let currentAddImage = null;
let editImageState = { changed: false, value: null };
let currentActiveView = 'overviewView';

// Initialize Shell, Notification System, and AI Assistant
initDashboardShell(user, 'navOverview');
initNotificationSystem(token);
initAIAssistant();

// Pre-fetch platform benchmarks & initialize overview weather forecast
if (window.FD_FairPrice) {
  FD_FairPrice.fetchPlatformBenchmarks();
}
if (window.FD_Weather) {
  FD_Weather.renderOverviewWeatherCard('overviewWeatherCard');
}

// React immediately to language change event
window.addEventListener('fd_language_changed', () => {
  if (currentActiveView === 'overviewView') {
    loadStats();
    loadOverviewPreview();
    if (window.FD_Weather) FD_Weather.renderOverviewWeatherCard('overviewWeatherCard');
  } else if (currentActiveView === 'cropsView') {
    loadCrops();
  } else if (currentActiveView === 'fairPriceView') {
    loadFarmerFairPriceSection();
  } else if (currentActiveView === 'weatherView') {
    if (window.FD_Weather) FD_Weather.renderExtendedWeatherView('dedicatedWeatherContainer');
  }
});

// Update Welcome Farmer Name
const welcomeNameEl = document.getElementById('welcomeFarmerName');
if (welcomeNameEl) welcomeNameEl.textContent = user.name;

// Global Logout Handler
window.handleLogout = function() {
  if (confirm('Are you sure you want to log out of Farm Direct?')) {
    localStorage.clear();
    window.location.href = 'login.html';
  }
};

// Global View Switcher
window.showSection = function(viewId, title, navId) {
  currentActiveView = viewId;
  switchDashboardView(viewId, title, navId);

  if (viewId === 'overviewView') {
    loadStats();
    loadOverviewPreview();
    if (window.FD_Weather) FD_Weather.renderOverviewWeatherCard('overviewWeatherCard');
  } else if (viewId === 'cropsView') {
    loadCrops();
  } else if (viewId === 'ordersView') {
    loadOrders();
  } else if (viewId === 'bidsView') {
    loadFarmerBids();
  } else if (viewId === 'groupBuyView') {
    loadFarmerGroupBuys();
  } else if (viewId === 'messagesView') {
    loadFarmerMessagesView();
  } else if (viewId === 'notificationsView') {
    loadDedicatedNotifications();
  } else if (viewId === 'analyticsView') {
    loadAnalytics();
  } else if (viewId === 'traceabilityView') {
    loadTraceabilityCrops();
  } else if (viewId === 'fairPriceView') {
    loadFarmerFairPriceSection();
  } else if (viewId === 'weatherView') {
    if (window.FD_Weather) FD_Weather.renderExtendedWeatherView('dedicatedWeatherContainer');
  } else if (viewId === 'profileView') {
    loadFarmerProfile();
  } else if (viewId === 'settingsView') {
    loadFarmerSettings();
  }
};

// ============================================================================
// BREADCRUMB & HEADER QUICK SEARCH
// ============================================================================
const headerSearch = document.getElementById('farmerQuickSearch');
if (headerSearch) {
  headerSearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (currentActiveView === 'cropsView' || currentActiveView === 'overviewView') {
      filterCropsByQuery(q);
    } else if (currentActiveView === 'ordersView') {
      filterOrdersByQuery(q);
    }
  });
}

function filterCropsByQuery(query) {
  Object.values(farmerCropsMap).forEach(crop => {
    const card = document.getElementById(`cropCard-${crop.id}`);
    if (card) {
      const match = crop.crop_name.toLowerCase().includes(query) || (crop.category || '').toLowerCase().includes(query);
      card.style.display = match ? 'flex' : 'none';
    }
  });
}

function filterOrdersByQuery(query) {
  const cards = document.querySelectorAll('#orderList .crop-card, #orderList table tr');
  cards.forEach(el => {
    const text = el.textContent.toLowerCase();
    el.style.display = text.includes(query) ? '' : 'none';
  });
}

// ============================================================================
// STATS SUMMARY (OVERVIEW & ANALYTICS)
// ============================================================================
async function loadStats() {
  try {
    const [cropStatsRes, orderStatsRes] = await Promise.all([
      fetch(`${API_URL}/crops/stats/farmer/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/orders/stats/farmer/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    const cropStats = await cropStatsRes.json();
    const orderStats = await orderStatsRes.json();

    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon-wrap green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${cropStats.totalCrops || 0}</div>
            <div class="stat-label">Active Crop Listings</div>
            <div class="stat-subtext">Live on marketplace</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${orderStats.totalOrders || 0}</div>
            <div class="stat-label">Total Purchase Orders</div>
            <div class="stat-subtext" style="color:var(--accent); font-weight:600;">${orderStats.pendingOrders || 0} pending fulfillment</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap amber">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${orderStats.totalKgSold || 0} kg</div>
            <div class="stat-label">Total Volume Sold</div>
            <div class="stat-subtext">Dispatched to buyers</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">₹${Number(orderStats.revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div class="stat-label">Delivered Revenue</div>
            <div class="stat-subtext">Completed trade value</div>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error('loadStats error:', err);
  }
}

// ============================================================================
// OVERVIEW PREVIEWS (RECENT ORDERS & STOCK INVENTORY)
// ============================================================================
async function loadOverviewPreview() {
  try {
    const [ordersRes, cropsRes] = await Promise.all([
      fetch(`${API_URL}/orders/farmer/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/crops/farmer/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    const orders = await ordersRes.json();
    const crops = await cropsRes.json();

    // 1. Orders preview
    const ordersBox = document.getElementById('overviewOrdersPreview');
    if (ordersBox) {
      if (!orders || orders.length === 0) {
        ordersBox.innerHTML = '<div class="empty-state">No buyer orders received yet. Keep listing fresh produce!</div>';
      } else {
        const recentOrders = orders.slice(0, 5);
        ordersBox.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Crop</th>
                  <th>Buyer</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recentOrders.map(o => `
                  <tr>
                    <td><strong>#${o.id}</strong></td>
                    <td><strong>${escapeHtml(o.crop_name)}</strong></td>
                    <td>${escapeHtml(o.buyer_name)} <small style="color:var(--ink-soft)">(${escapeHtml(o.buyer_location || 'India')})</small></td>
                    <td>${escapeHtml(o.quantity)} kg</td>
                    <td><strong>₹${Number(o.total_price).toFixed(2)}</strong></td>
                    <td><span class="status-tag status-${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
                    <td>
                      <button class="btn-secondary btn-small" onclick="showSection('ordersView', 'Orders', 'navOrders')">Manage</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    // 2. Stock preview
    const stockBox = document.getElementById('overviewStockPreview');
    if (stockBox) {
      if (!crops || crops.length === 0) {
        stockBox.innerHTML = '<div class="empty-state">No crops currently in inventory. Add your first harvest!</div>';
      } else {
        stockBox.innerHTML = `
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
            ${crops.slice(0, 4).map(c => {
              const isLow = Number(c.quantity_available) < LOW_STOCK_THRESHOLD;
              return `
                <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${escapeHtml(c.crop_name)}</strong>
                    <span class="category-badge">${escapeHtml(c.category || 'Other')}</span>
                  </div>
                  <div style="font-size:18px; font-weight:700; color:var(--primary); margin: 6px 0;">₹${c.price_per_kg}/kg</div>
                  <div class="stock-bar-track">
                    <div class="stock-bar-fill ${isLow ? 'low' : ''}" style="width:${stockPercent(c.quantity_available)}%"></div>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--ink-soft);">
                    <span>${c.quantity_available} kg available</span>
                    ${isLow ? '<span style="color:var(--danger); font-weight:700;">Low Stock</span>' : '<span style="color:var(--secondary); font-weight:600;">In Stock</span>'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('loadOverviewPreview error:', err);
  }
}

// ============================================================================
// CROPS LISTING & MANAGEMENT
// ============================================================================
const cropImageInput = document.getElementById('cropImageInput');
const cropImagePreview = document.getElementById('cropImagePreview');
const cropPreviewImg = document.getElementById('cropPreviewImg');
const removeCropImageBtn = document.getElementById('removeCropImageBtn');

if (cropImageInput) {
  cropImageInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      e.target.value = '';
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file);
      currentAddImage = compressedDataUrl;
      cropPreviewImg.src = compressedDataUrl;
      cropImagePreview.style.display = 'flex';
    } catch (err) {
      showToast(err.message || 'Error processing image', 'error');
      e.target.value = '';
    }
  });
}

if (removeCropImageBtn) {
  removeCropImageBtn.addEventListener('click', () => {
    currentAddImage = null;
    cropImageInput.value = '';
    cropPreviewImg.src = '';
    cropImagePreview.style.display = 'none';
  });
}

// Edit Crop Photo Controls
const editCropImageInput = document.getElementById('editCropImageInput');
const editCropImagePreview = document.getElementById('editCropImagePreview');
const editCropPreviewImg = document.getElementById('editCropPreviewImg');
const removeEditCropImageBtn = document.getElementById('removeEditCropImageBtn');

if (editCropImageInput) {
  editCropImageInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      e.target.value = '';
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file);
      editImageState = { changed: true, value: compressedDataUrl };
      editCropPreviewImg.src = compressedDataUrl;
      editCropImagePreview.style.display = 'flex';
    } catch (err) {
      showToast(err.message || 'Error processing image', 'error');
      e.target.value = '';
    }
  });
}

if (removeEditCropImageBtn) {
  removeEditCropImageBtn.addEventListener('click', () => {
    editImageState = { changed: true, value: null };
    editCropImageInput.value = '';
    editCropPreviewImg.src = '';
    editCropImagePreview.style.display = 'none';
  });
}

// Bidding toggle in Add Crop form
const biddingEnabledCheckbox = document.getElementById('biddingEnabled');
const minPriceRow = document.getElementById('minPriceRow');
if (biddingEnabledCheckbox && minPriceRow) {
  biddingEnabledCheckbox.addEventListener('change', () => {
    minPriceRow.style.display = biddingEnabledCheckbox.checked ? 'block' : 'none';
  });
}

// Bidding toggle in Edit Crop form
const editBiddingEnabledCheckbox = document.getElementById('editBiddingEnabled');
const editMinPriceRow = document.getElementById('editMinPriceRow');
if (editBiddingEnabledCheckbox && editMinPriceRow) {
  editBiddingEnabledCheckbox.addEventListener('change', () => {
    editMinPriceRow.style.display = editBiddingEnabledCheckbox.checked ? 'block' : 'none';
  });
}

async function loadCrops() {
  try {
    const res = await fetch(`${API_URL}/crops/farmer/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const crops = await res.json();

    const cropList = document.getElementById('cropList');
    cropList.innerHTML = '';
    farmerCropsMap = {};

    if (!crops || crops.length === 0) {
      cropList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌾</div>
          <h3>No crops listed yet</h3>
          <p>Add your first fresh harvest listing to start receiving buyer purchase orders.</p>
          <button class="btn-primary" onclick="showSection('addCropView', 'Add New Crop', 'navAddCrop')">+ Add First Harvest</button>
        </div>
      `;
      return;
    }

    crops.forEach(crop => {
      farmerCropsMap[crop.id] = crop;
      const lowStock = Number(crop.quantity_available) < LOW_STOCK_THRESHOLD;
      const hasImage = crop.image && crop.image.startsWith('data:image/jpeg;base64,');

      const imageHtml = hasImage
        ? `<img src="${crop.image}" alt="${escapeHtml(crop.crop_name)}" class="crop-card-img" loading="lazy">`
        : `<div class="crop-card-img placeholder">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12A10 10 0 0 1 12 2z"/></svg>
             <span>Fresh Harvest</span>
           </div>`;

      const harvestHtml = crop.harvest_date
        ? `<div class="crop-harvest-date">📅 Harvested: ${formatDate(crop.harvest_date)}</div>`
        : '';

      const biddingBadge = crop.bidding_enabled
        ? `<div class="badge-negotiable">🤝 Price Negotiation Enabled</div>`
        : '';

      cropList.innerHTML += `
        <div class="crop-card" id="cropCard-${crop.id}">
          ${imageHtml}
          <div class="crop-header-row">
            <strong>${escapeHtml(crop.crop_name)}</strong>
            <span class="category-badge">${escapeHtml(crop.category || 'Other')}</span>
          </div>
          
          <div class="crop-meta-row">
            <span class="crop-price-highlight">₹${escapeHtml(crop.price_per_kg)}</span>
            <span class="crop-unit-text">/ kg</span>
            ${lowStock ? '<span class="badge-low">Low stock</span>' : ''}
          </div>

          <!-- Feature 1: Fair Price Benchmark Badge -->
          <div id="cropBenchmarkBadge-${crop.id}" class="crop-benchmark-container" style="margin-bottom:6px;">
            <span class="badge-price-neutral" style="cursor:pointer;" onclick="openMeterForCrop(${crop.id})">⚖️ Calculating benchmark...</span>
          </div>

          ${biddingBadge}
          ${harvestHtml}

          <div class="stock-bar-track">
            <div class="stock-bar-fill ${lowStock ? 'low' : ''}" style="width:${stockPercent(crop.quantity_available)}%"></div>
          </div>
          
          <div style="display:flex; justify-content:space-between; font-size:12.5px; color:var(--ink-soft); margin-bottom:12px;">
            <span>${escapeHtml(crop.quantity_available)} kg available</span>
            <span>Origin: Verified</span>
          </div>

          <p style="margin:0 0 14px; font-size:13px; line-height:1.4;">${crop.description ? escapeHtml(crop.description) : 'Direct farm harvest.'}</p>

          <div class="crop-actions">
            <button class="btn-secondary" onclick="openMeterForCrop(${crop.id})" title="Check Fair Price Benchmark">⚖️ Fair Price</button>
            <button class="btn-secondary" onclick="openEditModalById(${crop.id})">Edit</button>
            <button class="btn-secondary" onclick="openQrModal(${crop.id})">QR Code</button>
            <button class="danger" onclick="deleteCrop(${crop.id})">Delete</button>
          </div>
        </div>
      `;
    });

    // Populate async benchmark badges on crop cards
    populateFarmerCropChips(crops);
  } catch (err) {
    console.error('loadCrops error:', err);
  }
}

// Asynchronously load benchmark indicators for farmer crop cards
async function populateFarmerCropChips(crops) {
  if (!crops || !window.FD_FairPrice) return;
  const benchmarks = await FD_FairPrice.fetchPlatformBenchmarks();

  crops.forEach(crop => {
    const badgeEl = document.getElementById(`cropBenchmarkBadge-${crop.id}`);
    if (!badgeEl) return;

    const norm = (crop.crop_name || '').trim().toLowerCase();
    const b = benchmarks[norm];

    if (!b || b.status === 'insufficient_data' || !b.comparison_average) {
      badgeEl.innerHTML = `
        <span class="badge-price-neutral" onclick="openMeterForCrop(${crop.id})" title="At least 2 active listings required">
          ⚖️ New listing benchmark
        </span>
      `;
      return;
    }

    const price = Number(crop.price_per_kg);
    const avg = Number(b.comparison_average);
    const pctDiff = Number((((price - avg) / avg) * 100).toFixed(1));

    if (pctDiff <= -5.0) {
      badgeEl.innerHTML = `
        <span class="badge-price-deal" style="cursor:pointer;" onclick="openMeterForCrop(${crop.id})" title="${Math.abs(pctDiff)}% below platform average (₹${avg}/kg)">
          ✨ ${Math.abs(pctDiff)}% below avg (₹${avg}/kg)
        </span>
      `;
    } else if (pctDiff >= 5.0) {
      badgeEl.innerHTML = `
        <span class="badge-price-above" style="cursor:pointer;" onclick="openMeterForCrop(${crop.id})" title="${pctDiff}% above platform average (₹${avg}/kg)">
          🏷️ ${pctDiff}% above avg (₹${avg}/kg)
        </span>
      `;
    } else {
      badgeEl.innerHTML = `
        <span class="badge-price-fair" style="cursor:pointer;" onclick="openMeterForCrop(${crop.id})" title="Within 5% of platform average (₹${avg}/kg)">
          ⚖️ Around avg (₹${avg}/kg)
        </span>
      `;
    }
  });
}

// Open Fair Price & Savings section with a specific crop selected
window.openMeterForCrop = function(cropId) {
  const title = window.t ? window.t('nav.fair_price', {}, 'Fair Price & Savings') : 'Fair Price & Savings';
  showSection('fairPriceView', title, 'navFairPrice');
  loadFarmerFairPriceSection(cropId);
};

// FEATURE 1: Load Fair Price & Savings Section (Meter + Middleman Calculator)
window.loadFarmerFairPriceSection = async function(preselectedCropId = null) {
  const selector = document.getElementById('meterCropSelector');
  const meterDisplay = document.getElementById('fairPriceMeterDisplay');
  if (!selector || !meterDisplay) return;

  meterDisplay.innerHTML = `<div class="notif-empty"><span class="pulse-dot"></span> Calculating live platform price benchmark...</div>`;

  try {
    // 1. Fetch farmer's crops if not yet in map
    let crops = Object.values(farmerCropsMap);
    if (!crops || crops.length === 0) {
      const res = await fetch(`${API_URL}/crops/farmer/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      crops = await res.json();
      if (Array.isArray(crops)) {
        crops.forEach(c => { farmerCropsMap[c.id] = c; });
      }
    }

    // 2. Initialize Middleman Savings Calculator
    if (window.FD_FairPrice) {
      FD_FairPrice.initSavingsCalculator('savingsCalcContainer', crops);
    }

    if (!crops || crops.length === 0) {
      selector.innerHTML = `<option value="">No crops listed yet</option>`;
      meterDisplay.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌾</div>
          <h3>No crop listings to benchmark</h3>
          <p>Add your first harvest listing to compare your prices against the Farm Direct platform.</p>
          <button class="btn-primary" onclick="showSection('addCropView', 'Add New Crop', 'navAddCrop')">+ Add Crop Listing</button>
        </div>
      `;
      return;
    }

    // 3. Populate selector dropdown
    selector.innerHTML = crops.map(c => `
      <option value="${c.id}" ${preselectedCropId == c.id ? 'selected' : ''}>
        ${escapeHtml(c.crop_name)} — Listed at ₹${c.price_per_kg}/kg (${c.quantity_available} kg)
      </option>
    `).join('');

    let targetCropId = preselectedCropId || selector.value || crops[0].id;
    selector.value = targetCropId;

    async function updateMeter(cropId) {
      meterDisplay.innerHTML = `<div class="notif-empty"><span class="pulse-dot"></span> Calculating live platform price benchmark...</div>`;
      if (window.FD_FairPrice) {
        const benchmark = await FD_FairPrice.fetchListingBenchmark(cropId);
        FD_FairPrice.renderFairPriceMeter(meterDisplay, benchmark);
      }
    }

    selector.onchange = () => {
      updateMeter(selector.value);
    };

    // Load initial benchmark
    await updateMeter(targetCropId);
  } catch (err) {
    console.error('loadFarmerFairPriceSection error:', err);
    meterDisplay.innerHTML = `<div class="empty-state">Could not load benchmark data. Please try again.</div>`;
  }
};

// Farmer Crop Category Filters
const farmerCatChips = document.querySelectorAll('#farmerCategoryChips .category-chip');
farmerCatChips.forEach(chip => {
  chip.addEventListener('click', () => {
    farmerCatChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const cat = chip.dataset.cat;
    Object.values(farmerCropsMap).forEach(crop => {
      const card = document.getElementById(`cropCard-${crop.id}`);
      if (card) {
        const matches = (cat === 'All') || (crop.category || '').toLowerCase() === cat.toLowerCase();
        card.style.display = matches ? 'flex' : 'none';
      }
    });
  });
});

// Search filter for farmer's own crops
const farmerSearchBox = document.getElementById('farmerSearchBox');
if (farmerSearchBox) {
  farmerSearchBox.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    filterCropsByQuery(q);
  });
}

// Add Crop Form Submit
document.getElementById('cropForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const crop_name = document.getElementById('cropName').value.trim();
  const category = document.getElementById('cropCategory').value;
  const price_per_kg = document.getElementById('price').value;
  const quantity_available = document.getElementById('quantity').value;
  const harvest_date = document.getElementById('harvestDate').value || null;
  const bidding_enabled = document.getElementById('biddingEnabled').checked;
  const min_bidding_price = bidding_enabled ? document.getElementById('minBiddingPrice').value : null;
  const description = document.getElementById('description').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  setLoading(btn, true);
  try {
    const res = await fetch(`${API_URL}/crops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        crop_name, 
        price_per_kg, 
        quantity_available, 
        description,
        category,
        harvest_date,
        bidding_enabled,
        min_bidding_price,
        image: currentAddImage
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Crop listing published successfully!', 'success');
      e.target.reset();
      currentAddImage = null;
      if (cropPreviewImg) cropPreviewImg.src = '';
      if (cropImagePreview) cropImagePreview.style.display = 'none';
      if (minPriceRow) minPriceRow.style.display = 'none';
      showSection('cropsView', 'My Crops', 'navCrops');
      loadStats();
    } else {
      showToast(data.error || 'Failed to add crop', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  } finally {
    setLoading(btn, false);
  }
});

// Edit Crop Modal
window.openEditModalById = function(cropId) {
  const crop = farmerCropsMap[cropId];
  if (!crop) return;

  document.getElementById('editCropId').value = crop.id;
  document.getElementById('editCropName').value = crop.crop_name || '';
  document.getElementById('editCropCategory').value = crop.category || 'Other';
  document.getElementById('editPrice').value = crop.price_per_kg || '';
  document.getElementById('editQuantity').value = crop.quantity_available || '';
  document.getElementById('editHarvestDate').value = crop.harvest_date ? crop.harvest_date.split('T')[0] : '';
  document.getElementById('editDescription').value = crop.description || '';

  const editBiddingCb = document.getElementById('editBiddingEnabled');
  const editMinRow = document.getElementById('editMinPriceRow');
  const editMinInput = document.getElementById('editMinBiddingPrice');

  editBiddingCb.checked = Boolean(crop.bidding_enabled);
  editMinRow.style.display = crop.bidding_enabled ? 'block' : 'none';
  editMinInput.value = crop.min_bidding_price || '';

  if (crop.image && crop.image.startsWith('data:image/jpeg;base64,')) {
    editImageState = { changed: false, value: crop.image };
    editCropPreviewImg.src = crop.image;
    editCropImagePreview.style.display = 'flex';
  } else {
    editImageState = { changed: false, value: null };
    editCropPreviewImg.src = '';
    editCropImagePreview.style.display = 'none';
  }
  editCropImageInput.value = '';

  document.getElementById('editModal').style.display = 'flex';
};

window.closeEditModal = function() {
  document.getElementById('editModal').style.display = 'none';
};

document.getElementById('editCropForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editCropId').value;
  const crop_name = document.getElementById('editCropName').value.trim();
  const category = document.getElementById('editCropCategory').value;
  const price_per_kg = document.getElementById('editPrice').value;
  const quantity_available = document.getElementById('editQuantity').value;
  const harvest_date = document.getElementById('editHarvestDate').value || null;
  const bidding_enabled = document.getElementById('editBiddingEnabled').checked;
  const min_bidding_price = bidding_enabled ? document.getElementById('editMinBiddingPrice').value : null;
  const description = document.getElementById('editDescription').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  const payload = {
    crop_name,
    price_per_kg,
    quantity_available,
    description,
    category,
    harvest_date,
    bidding_enabled,
    min_bidding_price
  };

  if (editImageState.changed) {
    payload.image = editImageState.value;
  }

  setLoading(btn, true);
  try {
    const res = await fetch(`${API_URL}/crops/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Crop listing updated!', 'success');
      closeEditModal();
      loadCrops();
      loadStats();
    } else {
      showToast(data.error || 'Failed to update crop', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  } finally {
    setLoading(btn, false);
  }
});

window.deleteCrop = async function(id) {
  if (!confirm('Are you sure you want to delete this crop listing? This action cannot be undone.')) return;
  try {
    const res = await fetch(`${API_URL}/crops/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Crop listing removed', 'success');
      loadCrops();
      loadStats();
    } else {
      showToast(data.error || 'Failed to delete crop', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
};

// ============================================================================
// QR CODE TRACEABILITY MODAL & VIEW
// ============================================================================
window.openQrModal = async function(cropId) {
  const modal = document.getElementById('qrModal');
  const modalImg = document.getElementById('qrModalImg');
  const codeEl = document.getElementById('qrModalCode');
  const publicLink = document.getElementById('qrPublicPageLink');
  const downloadBtn = document.getElementById('qrDownloadBtn');
  const titleEl = document.getElementById('qrModalTitle');

  modal.style.display = 'flex';
  codeEl.textContent = 'Generating unique QR...';
  modalImg.style.opacity = '0.3';

  try {
    const res = await fetch(`${API_URL}/traceability/crop/${cropId}/qr`);
    const data = await res.json();

    if (res.ok) {
      titleEl.textContent = `QR Traceability: ${data.crop_name}`;
      modalImg.src = data.qr_image;
      modalImg.style.opacity = '1';
      codeEl.textContent = `Code: ${data.traceability_code}`;
      publicLink.href = data.traceability_url;
      downloadBtn.href = data.qr_image;
      downloadBtn.download = `${data.crop_name.toLowerCase()}-traceability-qr.png`;
    } else {
      codeEl.textContent = 'Failed to generate QR code';
    }
  } catch (err) {
    codeEl.textContent = 'Network error generating QR';
  }
};

window.closeQrModal = function() {
  document.getElementById('qrModal').style.display = 'none';
};

async function loadTraceabilityCrops() {
  const container = document.getElementById('farmerTraceabilityList');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/crops/farmer/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const crops = await res.json();

    if (!crops || crops.length === 0) {
      container.innerHTML = '<div class="empty-state">No crops listed to generate traceability records for.</div>';
      return;
    }

    container.innerHTML = crops.map(c => `
      <div class="crop-card">
        <div class="crop-header-row">
          <strong>${escapeHtml(c.crop_name)}</strong>
          <span class="category-badge">${escapeHtml(c.category || 'Other')}</span>
        </div>
        <div style="font-size:12.5px; color:var(--ink-soft); margin: 6px 0;">
          Code: <span style="font-family:monospace; font-weight:700; color:var(--primary);">${c.traceability_code || 'Pending'}</span>
        </div>
        <div style="display:flex; gap:8px; margin-top:14px;">
          <button class="btn-primary btn-small" onclick="openQrModal(${c.id})">🔍 Inspect & Print QR</button>
          ${c.traceability_code ? `<a href="traceability.html?code=${c.traceability_code}" target="_blank" class="btn-secondary btn-small">Public Page</a>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Failed to load traceability items.</div>';
  }
}

// ============================================================================
// ORDERS & FULFILLMENT
// ============================================================================
const filterPills = document.querySelectorAll('#orderFilterPills .pill');
filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    filterPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeOrderFilter = pill.dataset.filter;
    renderFilteredOrders();
  });
});

async function loadOrders() {
  try {
    const res = await fetch(`${API_URL}/orders/farmer/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    allFarmerOrders = await res.json();
    renderFilteredOrders();
  } catch (err) {
    console.error('loadOrders error:', err);
  }
}

function renderFilteredOrders() {
  const orderList = document.getElementById('orderList');
  orderList.innerHTML = '';

  const filtered = allFarmerOrders.filter(o => 
    activeOrderFilter === 'all' || o.status === activeOrderFilter
  );

  if (filtered.length === 0) {
    orderList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3>No orders matching "${activeOrderFilter}"</h3>
        <p>Buyer orders will appear here as purchases are finalized.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(order => {
    orderList.innerHTML += `
      <div class="crop-card" style="margin-bottom:16px;">
        <div class="crop-header-row">
          <div>
            <strong>${escapeHtml(order.crop_name)}</strong>
            <span style="font-size:12px; color:var(--ink-muted); margin-left:8px;">Order #${order.id}</span>
          </div>
          <span class="status-tag status-${escapeHtml(order.status)}">${escapeHtml(order.status)}</span>
        </div>
        
        <div class="crop-meta-row" style="margin: 4px 0 8px;">
          <span style="font-size:14.5px; font-weight:600; color:var(--ink);">Quantity: ${escapeHtml(order.quantity)} kg</span>
          <span style="color:var(--border);">·</span>
          <span style="font-size:16px; font-weight:800; color:var(--primary);">Total: ₹${Number(order.total_price).toFixed(2)}</span>
        </div>

        <div class="crop-farmer-meta">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Buyer: <strong>${escapeHtml(order.buyer_name)}</strong> (${escapeHtml(order.buyer_location || 'India')})
        </div>

        <!-- Fulfillment Status Update Selector -->
        <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px; margin: 10px 0;">
          <label style="font-size: 11.5px; font-weight:700; color:var(--ink-soft); display:block; margin-bottom:4px; text-transform:uppercase;">Update Dispatch / Fulfillment:</label>
          <select onchange="updateStatus(${order.id}, this.value)" ${['delivered', 'cancelled', 'rejected'].includes(order.status) ? 'disabled' : ''}>
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending Review</option>
            <option value="accepted" ${order.status === 'accepted' ? 'selected' : ''}>Accept Order</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing / Packing</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped / In Transit</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered & Closed</option>
            <option value="rejected" ${order.status === 'rejected' ? 'selected' : ''}>Reject Order</option>
          </select>
        </div>

        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn-secondary btn-small" onclick="openOrderTimeline(${order.id})">🕒 View Timeline</button>
          <button class="toggle-messages btn-small" onclick="toggleMessages(${order.id}, ${order.buyer_id})">💬 Message Buyer</button>
        </div>

        <div id="thread-${order.id}" style="display:none; margin-top: 14px;">
          <div class="message-thread" id="messages-${order.id}"></div>
          <div class="message-row">
            <input type="text" id="msgInput-${order.id}" placeholder="Type a message to buyer..." onkeypress="if(event.key === 'Enter') sendMessage(${order.id}, ${order.buyer_id})">
            <button onclick="sendMessage(${order.id}, ${order.buyer_id})">Send</button>
          </div>
        </div>
      </div>
    `;
  });
}

window.updateStatus = async function(orderId, status) {
  try {
    const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Order status updated to ${status}!`, 'success');
      loadOrders();
      loadStats();
    } else {
      showToast(data.error || 'Failed to update status', 'error');
      loadOrders();
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
};

// Order Timeline
window.openOrderTimeline = async function(orderId) {
  const modal = document.getElementById('orderTimelineModal');
  const infoEl = document.getElementById('timelineOrderInfo');
  const stepperEl = document.getElementById('timelineStepper');

  modal.style.display = 'flex';
  infoEl.textContent = 'Loading timeline...';
  stepperEl.innerHTML = '';

  try {
    const res = await fetch(`${API_URL}/orders/${orderId}/timeline`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (res.ok) {
      infoEl.innerHTML = `Order #${data.order.id} for <strong>${escapeHtml(data.order.crop_name)}</strong> (${data.order.quantity} kg) · Current: <span class="status-tag status-${data.order.status}">${data.order.status}</span>`;

      if (!data.timeline || data.timeline.length === 0) {
        stepperEl.innerHTML = '<div class="notif-empty">No status transitions logged yet.</div>';
        return;
      }

      stepperEl.innerHTML = data.timeline.map(step => `
        <div class="timeline-step">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-status">${escapeHtml(step.status.toUpperCase())} <small style="color:var(--ink-soft); font-weight:normal;">by ${escapeHtml(step.actor_role)}</small></div>
            <div class="timeline-note">${escapeHtml(step.note || '')}</div>
            <div class="timeline-time">${formatDate(step.created_at)}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    infoEl.textContent = 'Failed to load order history.';
  }
};

window.closeTimelineModal = function() {
  document.getElementById('orderTimelineModal').style.display = 'none';
};

// Messaging
let chatIntervals = {};

window.toggleMessages = async function(orderId) {
  const thread = document.getElementById(`thread-${orderId}`);
  const isHidden = thread.style.display === 'none';
  thread.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    await loadMessages(orderId);
    chatIntervals[orderId] = setInterval(() => loadMessages(orderId), 2500);
  } else {
    clearInterval(chatIntervals[orderId]);
    delete chatIntervals[orderId];
  }
};

async function loadMessages(orderId) {
  const res = await fetch(`${API_URL}/messages/order/${orderId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const messages = await res.json();
  const box = document.getElementById(`messages-${orderId}`);
  if (!box) return;

  if (box.dataset.msgCount == messages.length) return;
  box.dataset.msgCount = messages.length;

  box.innerHTML = (!messages || messages.length === 0)
    ? '<p style="font-size:13px;color:var(--ink-soft);margin:0">No messages yet.</p>'
    : messages.map(m => `
        <div class="message-bubble ${m.sender_id === user.id ? 'mine' : ''}">
          <div class="sender">${escapeHtml(m.sender_name)}</div>
          ${escapeHtml(m.message_text)}
        </div>
      `).join('');
  box.scrollTop = box.scrollHeight;
}

window.sendMessage = async function(orderId, receiverId) {
  const input = document.getElementById(`msgInput-${orderId}`);
  const message_text = input.value.trim();
  if (!message_text) return;

  try {
    const res = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ order_id: orderId, receiver_id: receiverId, message_text })
    });
    if (res.ok) {
      input.value = '';
      loadMessages(orderId);
    } else {
      showToast('Failed to send message', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
};

function loadFarmerMessagesView() {
  const container = document.getElementById('activeThreadsList');
  if (!container) return;

  if (allFarmerOrders.length === 0) {
    container.innerHTML = '<div class="empty-state">No orders available to open chats for. Once you receive orders, conversations will show here.</div>';
    return;
  }

  container.innerHTML = allFarmerOrders.map(o => `
    <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>Order #${o.id} — ${escapeHtml(o.crop_name)}</strong>
        <div style="font-size:12.5px; color:var(--ink-soft);">Buyer: ${escapeHtml(o.buyer_name)} (${escapeHtml(o.buyer_location || 'India')})</div>
      </div>
      <button class="btn-primary btn-small" onclick="showSection('ordersView', 'Orders', 'navOrders'); toggleMessages(${o.id}, ${o.buyer_id});">Open Chat</button>
    </div>
  `).join('');
}

// ============================================================================
// PRICE NEGOTIATION & BIDDING (FARMER)
// ============================================================================
async function loadFarmerBids() {
  const container = document.getElementById('farmerBidList');
  container.innerHTML = '<div class="notif-empty">Loading negotiations...</div>';

  try {
    const res = await fetch(`${API_URL}/bids/farmer`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const bids = await res.json();

    const pendingCount = (bids || []).filter(b => ['pending', 'countered'].includes(b.status) && b.current_by === 'buyer').length;
    const badge = document.getElementById('bidCountBadge');
    if (badge) badge.textContent = pendingCount;

    if (!bids || bids.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🤝</div>
          <h3>No price negotiations received yet</h3>
          <p>Make sure "Enable Buyer Price Negotiation" is checked on your crop listings!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = bids.map(bid => {
      const isActionable = ['pending', 'countered'].includes(bid.status) && bid.current_by === 'buyer';
      const totalOffer = (bid.quantity * bid.offered_price_per_kg).toFixed(2);

      return `
        <div class="crop-card" style="margin-bottom: 16px;">
          <div class="crop-header-row">
            <strong>${escapeHtml(bid.crop_name)}</strong>
            <span class="status-tag status-${bid.status === 'converted_to_order' ? 'accepted' : escapeHtml(bid.status)}">${escapeHtml(bid.status)}</span>
          </div>
          <div class="crop-meta" style="margin-top:2px;">Buyer: <strong>${escapeHtml(bid.buyer_name)}</strong> (${escapeHtml(bid.buyer_location || 'India')})</div>
          <div class="crop-meta" style="margin-top:-4px;">
            Proposed Rate: <strong style="color:var(--primary); font-size:16px;">₹${bid.offered_price_per_kg}/kg</strong> for <strong>${bid.quantity} kg</strong> (Total: ₹${totalOffer})
            <br><small style="color:var(--ink-soft)">Your original listing price: ₹${bid.original_price}/kg · Current stock: ${bid.stock_left} kg</small>
          </div>

          ${isActionable ? `
            <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
              <button class="btn-primary btn-small" onclick="acceptBid(${bid.id}, '${escapeHtml(bid.crop_name)}')">✓ Accept & Create Order</button>
              <button class="btn-secondary btn-small" onclick="openCounterModal(${bid.id}, '${escapeHtml(bid.crop_name)}', ${bid.offered_price_per_kg}, ${bid.quantity})">💬 Counteroffer</button>
              <button class="danger btn-small" onclick="rejectBid(${bid.id})">✕ Reject</button>
            </div>
          ` : `
            <div style="font-size:13px; color:var(--ink-soft); margin-top:8px;">
              ${bid.status === 'converted_to_order' ? '✅ Accepted! Created Order #' + bid.order_id : 'Awaiting buyer response or concluded.'}
            </div>
          `}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Failed to load price negotiations.</div>';
  }
}

window.acceptBid = async function(bidId, cropName) {
  if (!confirm(`Accept this negotiated offer for ${cropName}? This will lock the crop inventory and instantly create a confirmed order.`)) return;

  try {
    const res = await fetch(`${API_URL}/bids/${bidId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Offer accepted! Order #${data.orderId} created.`, 'success');
      loadFarmerBids();
      loadCrops();
      loadStats();
    } else {
      showToast(data.error || 'Failed to accept offer', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
};

window.rejectBid = async function(bidId) {
  if (!confirm('Reject this price offer?')) return;
  try {
    const res = await fetch(`${API_URL}/bids/${bidId}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      showToast('Offer rejected', 'success');
      loadFarmerBids();
    } else {
      showToast('Failed to reject offer', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
};

window.openCounterModal = function(bidId, cropName, currentOffer, qty) {
  document.getElementById('counterBidId').value = bidId;
  document.getElementById('counterModalInfo').innerHTML = `Responding to offer for <strong>${cropName}</strong> (Buyer offered ₹${currentOffer}/kg for ${qty} kg)`;
  document.getElementById('counterPrice').value = '';
  document.getElementById('counterNote').value = '';
  document.getElementById('counterModal').style.display = 'flex';
};

window.closeCounterModal = function() {
  document.getElementById('counterModal').style.display = 'none';
};

document.getElementById('counterOfferForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bidId = document.getElementById('counterBidId').value;
  const price_per_kg = document.getElementById('counterPrice').value;
  const note = document.getElementById('counterNote').value.trim();

  try {
    const res = await fetch(`${API_URL}/bids/${bidId}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ price_per_kg, note })
    });
    if (res.ok) {
      showToast('Counteroffer sent to buyer!', 'success');
      closeCounterModal();
      loadFarmerBids();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to send counteroffer', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
});

// ============================================================================
// GROUP BUYING CAMPAIGNS (FARMER)
// ============================================================================
const openCreateGroupBuyBtn = document.getElementById('openCreateGroupBuyBtn');
if (openCreateGroupBuyBtn) {
  openCreateGroupBuyBtn.addEventListener('click', () => {
    const select = document.getElementById('gbCropSelect');
    select.innerHTML = '<option value="" disabled selected>Select an eligible harvest listing</option>';
    Object.values(farmerCropsMap).forEach(crop => {
      select.innerHTML += `<option value="${crop.id}">${escapeHtml(crop.crop_name)} (${crop.quantity_available} kg in stock - Base ₹${crop.price_per_kg}/kg)</option>`;
    });
    document.getElementById('createGroupBuyModal').style.display = 'flex';
  });
}

window.closeCreateGroupBuyModal = function() {
  document.getElementById('createGroupBuyModal').style.display = 'none';
};

document.getElementById('createGroupBuyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const crop_id = document.getElementById('gbCropSelect').value;
  const title = document.getElementById('gbTitle').value.trim();
  const target_quantity = document.getElementById('gbTargetQty').value;
  const discount_price_per_kg = document.getElementById('gbDiscountPrice').value;
  const end_date = document.getElementById('gbEndDate').value;

  try {
    const res = await fetch(`${API_URL}/group-buys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ crop_id, title, target_quantity, discount_price_per_kg, end_date })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Group buying campaign launched!', 'success');
      closeCreateGroupBuyModal();
      loadFarmerGroupBuys();
    } else {
      showToast(data.error || 'Failed to launch campaign', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
});

async function loadFarmerGroupBuys() {
  const container = document.getElementById('farmerGroupBuyList');
  container.innerHTML = '<div class="notif-empty">Loading your campaigns...</div>';

  try {
    const res = await fetch(`${API_URL}/group-buys/farmer/mine`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const campaigns = await res.json();

    if (!campaigns || campaigns.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3>No group buying campaigns yet</h3>
          <p>Launch co-op campaigns to attract bulk buyer orders and clear harvest volume quickly.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = campaigns.map(gb => {
      const pct = Math.min(100, Math.round((gb.committed_quantity / gb.target_quantity) * 100));
      return `
        <div class="crop-card" style="margin-bottom:16px;">
          <div class="crop-header-row">
            <strong>${escapeHtml(gb.title)}</strong>
            <span class="status-tag status-${escapeHtml(gb.status)}">${escapeHtml(gb.status)}</span>
          </div>
          <div class="crop-meta">Produce: <strong>${escapeHtml(gb.crop_name)}</strong> · Wholesale Rate: <strong>₹${gb.discount_price_per_kg}/kg</strong> (Standard: ₹${gb.original_price}/kg)</div>
          <div class="crop-meta" style="margin-top:-6px;">Cutoff Date: ${formatDate(gb.end_date)} · Participants: ${gb.participant_count || 0} buyers</div>

          <div style="margin: 12px 0 6px;">
            <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:600; margin-bottom:4px;">
              <span>Volume Target Progress</span>
              <span>${gb.committed_quantity} / ${gb.target_quantity} kg (${pct}%)</span>
            </div>
            <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${pct}%;"></div></div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Failed to load campaigns.</div>';
  }
}

// ============================================================================
// DEDICATED NOTIFICATIONS VIEW
// ============================================================================
async function loadDedicatedNotifications() {
  const container = document.getElementById('dedicatedNotifList');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const notifications = await res.json();

    if (!notifications || notifications.length === 0) {
      container.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
      return;
    }

    container.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead(${n.id}, '${escapeHtml(n.link || '')}', '${token}')">
        <div class="notif-item-header">
          <span class="notif-type-tag notif-type-${escapeHtml(n.type)}">${escapeHtml(n.type)}</span>
          <span class="notif-time">${formatDate(n.created_at)}</span>
        </div>
        <div class="notif-item-title">${escapeHtml(n.title)}</div>
        <div class="notif-item-msg">${escapeHtml(n.message)}</div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="notif-empty">Could not load notifications.</div>';
  }
}

// ============================================================================
// SALES ANALYTICS VIEW
// ============================================================================
async function loadAnalytics() {
  const analyticsGrid = document.getElementById('analyticsStatsGrid');
  const breakdownEl = document.getElementById('analyticsFulfillmentBreakdown');
  if (!analyticsGrid) return;

  try {
    const res = await fetch(`${API_URL}/orders/stats/farmer/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await res.json();

    analyticsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-value">₹${Number(stats.revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div class="stat-label">Delivered Revenue</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-value">${stats.totalKgSold || 0} kg</div>
          <div class="stat-label">Produce Dispatched</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-value">${stats.totalOrders || 0}</div>
          <div class="stat-label">Total Transactions</div>
        </div>
      </div>
    `;

    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
              <span>Pending Orders</span>
              <span>${stats.pendingOrders || 0}</span>
            </div>
            <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${Math.min(100, (stats.pendingOrders || 0) * 20)}%; background:var(--accent);"></div></div>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
              <span>Delivered & Completed</span>
              <span>${stats.deliveredOrders || 0}</span>
            </div>
            <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${Math.min(100, (stats.deliveredOrders || 0) * 20)}%; background:var(--secondary);"></div></div>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error('loadAnalytics error:', err);
  }
}

// ============================================================================
// PROFILE & SETTINGS
// ============================================================================
function loadFarmerProfile() {
  const profileName = document.getElementById('profileFarmerName');
  const profileEmail = document.getElementById('profileEmail');
  const profileLocation = document.getElementById('profileLocation');
  const profileAvatar = document.getElementById('profileLargeAvatar');

  if (profileName) profileName.textContent = user.name;
  if (profileEmail) profileEmail.textContent = user.email || 'farmer@farmdirect.in';
  if (profileLocation) profileLocation.textContent = user.location || 'Maharashtra, India';
  if (profileAvatar) profileAvatar.textContent = getInitials(user.name);
}

function loadFarmerSettings() {
  const settingsApiUrl = document.getElementById('settingsApiUrl');
  if (settingsApiUrl) {
    settingsApiUrl.textContent = window.IS_LOCAL ? 'Localhost (Development)' : 'Render Production Cloud API';
  }
}

// Initial Boot: Load Stats, Overview Preview, and Crops
loadStats();
loadOverviewPreview();
loadCrops();
loadOrders();