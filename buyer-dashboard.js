// ============================================================================
// FARM DIRECT — BUYER DASHBOARD CONTROLLER
// ============================================================================

const API_URL = window.API_URL || API_BASE_URL;
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || user.role !== 'buyer') {
  window.location.href = 'login.html';
}

// Global State
const LOW_STOCK_THRESHOLD = 5;
let allCrops = [];
let allBuyerOrders = [];
let selectedCategory = 'All';
let currentBuyerActiveView = 'buyerOverviewView';
let buyerWishlistSet = new Set();
let buyerUserCoords = null;

// Initialize Dashboard Shell, Notification System, and AI Assistant
initDashboardShell(user, 'navBuyerOverview');
initNotificationSystem(token);
initAIAssistant();

// Preload platform price benchmarks
if (window.FD_FairPrice) {
  FD_FairPrice.fetchPlatformBenchmarks();
}

// React immediately to language change event
window.addEventListener('fd_language_changed', () => {
  if (currentBuyerActiveView === 'buyerOverviewView') {
    loadBuyerStatsAndOverview();
  } else if (currentBuyerActiveView === 'browseCropsView') {
    applyFilters();
  } else if (currentBuyerActiveView === 'priceComparisonView') {
    loadPriceComparison();
  }
});

// Update Welcome Name
const welcomeBuyerName = document.getElementById('welcomeBuyerName');
if (welcomeBuyerName) welcomeBuyerName.textContent = user.name;

// Global Logout Handler
window.handleBuyerLogout = function() {
  if (confirm('Are you sure you want to log out of Farm Direct?')) {
    localStorage.clear();
    window.location.href = 'login.html';
  }
};

// Global View Switcher
window.showBuyerSection = function(viewId, title, navId) {
  currentBuyerActiveView = viewId;
  switchDashboardView(viewId, title, navId);

  if (viewId === 'buyerOverviewView') {
    loadBuyerStatsAndOverview();
  } else if (viewId === 'browseCropsView') {
    loadCrops();
  } else if (viewId === 'myOrdersView') {
    loadOrders();
  } else if (viewId === 'trackOrdersView') {
    loadTrackOrdersView();
  } else if (viewId === 'buyerGroupBuyView') {
    loadBuyerGroupBuys();
  } else if (viewId === 'buyerBidsView') {
    loadBuyerBids();
  } else if (viewId === 'priceComparisonView') {
    loadPriceComparison();
  } else if (viewId === 'buyerMessagesView') {
    loadBuyerMessagesView();
  } else if (viewId === 'buyerNotificationsView') {
    loadBuyerDedicatedNotifications();
  } else if (viewId === 'buyerProfileView') {
    loadBuyerProfile();
  } else if (viewId === 'buyerSettingsView') {
    loadBuyerSettings();
  } else if (viewId === 'buyerWishlistView') {
    loadBuyerWishlist();
  } else if (viewId === 'buyerPriceAlertsView') {
    loadBuyerPriceAlerts();
  } else if (viewId === 'buyerMarketPricesView') {
    loadBuyerMandiPrices();
  } else if (viewId === 'nearbyFarmersView') {
    loadNearbyFarmers();
  }
};

// ============================================================================
// BREADCRUMB & HEADER QUICK SEARCH
// ============================================================================
const buyerHeaderSearch = document.getElementById('buyerQuickSearch');
if (buyerHeaderSearch) {
  buyerHeaderSearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
      searchBox.value = q;
      applyFilters();
    }
    if (currentBuyerActiveView !== 'browseCropsView' && q.length > 0) {
      showBuyerSection('browseCropsView', 'Browse Produce Marketplace', 'navBrowseCrops');
    }
  });
}

// ============================================================================
// BUYER OVERVIEW & STATS
// ============================================================================
async function loadBuyerStatsAndOverview() {
  try {
    const [ordersRes, cropsRes, bidsRes, gbRes] = await Promise.all([
      fetch(`${API_URL}/orders/buyer/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/crops`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/bids/buyer`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/group-buys`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const orders = await ordersRes.json();
    const crops = await cropsRes.json();
    const bids = await bidsRes.json();
    const groupBuys = await gbRes.json();

    allBuyerOrders = orders || [];
    allCrops = crops || [];

    // Calculate metrics
    const totalOrders = allBuyerOrders.length;
    const deliveredOrders = allBuyerOrders.filter(o => o.status === 'delivered').length;
    const activeOrders = allBuyerOrders.filter(o => ['pending', 'accepted', 'processing', 'shipped'].includes(o.status)).length;
    const totalSpent = allBuyerOrders
      .filter(o => o.status !== 'cancelled' && o.status !== 'rejected')
      .reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    const activeBids = (bids || []).filter(b => ['pending', 'countered'].includes(b.status)).length;

    // Render Stats
    const statsGrid = document.getElementById('buyerStatsGrid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon-wrap green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${activeOrders}</div>
            <div class="stat-label">Active Orders</div>
            <div class="stat-subtext">Currently in fulfillment</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${deliveredOrders}</div>
            <div class="stat-label">Delivered Purchases</div>
            <div class="stat-subtext">Verified farm deliveries</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap amber">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${activeBids}</div>
            <div class="stat-label">Active Negotiations</div>
            <div class="stat-subtext">Direct farmer counteroffers</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">₹${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div class="stat-label">Total Produce Value</div>
            <div class="stat-subtext">Direct to growers (0% broker fee)</div>
          </div>
        </div>
      `;
    }

    // 1. Featured Produce Preview
    const produceBox = document.getElementById('buyerOverviewProducePreview');
    if (produceBox) {
      if (!allCrops || allCrops.length === 0) {
        produceBox.innerHTML = '<div class="empty-state">No produce listed right now. Local farmers will publish harvests soon!</div>';
      } else {
        const previewCrops = allCrops.slice(0, 4);
        produceBox.innerHTML = previewCrops.map(crop => {
          const hasImage = crop.image && crop.image.startsWith('data:image/jpeg;base64,');
          const imageHtml = hasImage
            ? `<img src="${crop.image}" alt="${escapeHtml(crop.crop_name)}" class="crop-card-img" loading="lazy">`
            : `<div class="crop-card-img placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12A10 10 0 0 1 12 2z"/></svg><span>Fresh Produce</span></div>`;

          return `
            <div class="crop-card">
              ${imageHtml}
              <div class="crop-header-row">
                <strong>${escapeHtml(crop.crop_name)}</strong>
                <span class="category-badge">${escapeHtml(crop.category || 'Other')}</span>
              </div>
              <div class="crop-meta-row">
                <span class="crop-price-highlight">₹${crop.price_per_kg}</span>
                <span class="crop-unit-text">/ kg</span>
              </div>
              <div class="crop-farmer-meta">
                Farmer: <strong>${escapeHtml(crop.farmer_name)}</strong> (${escapeHtml(crop.location || 'India')})
              </div>
              <div style="margin-top:auto; padding-top:12px;">
                <button class="btn-primary btn-small" style="width:100%;" onclick="showBuyerSection('browseCropsView', 'Browse Produce', 'navBrowseCrops')">View & Order</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Recent Orders Preview
    const ordersBox = document.getElementById('buyerOverviewOrdersPreview');
    if (ordersBox) {
      if (!allBuyerOrders || allBuyerOrders.length === 0) {
        ordersBox.innerHTML = '<div class="empty-state">No orders placed yet. Browse the fresh marketplace to purchase directly from farmers!</div>';
      } else {
        const previewOrders = allBuyerOrders.slice(0, 4);
        ordersBox.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Produce</th>
                  <th>Farmer</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                ${previewOrders.map(o => `
                  <tr>
                    <td><strong>#${o.id}</strong></td>
                    <td><strong>${escapeHtml(o.crop_name)}</strong></td>
                    <td>${escapeHtml(o.farmer_name)} <small style="color:var(--ink-soft)">(${escapeHtml(o.farmer_location || 'India')})</small></td>
                    <td>${o.quantity} kg</td>
                    <td><strong>₹${Number(o.total_price).toFixed(2)}</strong></td>
                    <td><span class="status-tag status-${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
                    <td>
                      <button class="btn-secondary btn-small" onclick="openBuyerTimeline(${o.id})">Track</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('loadBuyerStatsAndOverview error:', err);
  }
}

// ============================================================================
// MARKETPLACE CROPS & ADVANCED SEARCH / FILTERING
// ============================================================================
const categoryChips = document.querySelectorAll('#categoryChips .category-chip');
categoryChips.forEach(chip => {
  chip.addEventListener('click', () => {
    categoryChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedCategory = chip.dataset.category || 'All';
    applyFilters();
  });
});

async function loadCrops() {
  try {
    const [cropsRes] = await Promise.all([
      fetch(`${API_URL}/crops`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      window.FD_FairPrice ? FD_FairPrice.fetchPlatformBenchmarks() : Promise.resolve()
    ]);
    allCrops = await cropsRes.json();
    applyFilters();
  } catch (err) {
    console.error('loadCrops error:', err);
  }
}

function applyFilters() {
  const query = (document.getElementById('searchBox')?.value || '').toLowerCase().trim();
  const min = parseFloat(document.getElementById('minPrice')?.value) || 0;
  const max = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
  const negotiableOnly = document.getElementById('negotiableOnlyFilter')?.checked || false;
  const sortBy = document.getElementById('sortSelect')?.value || 'newest';

  let filtered = allCrops.filter(crop => {
    const matchesName = (crop.crop_name || '').toLowerCase().includes(query) ||
                        (crop.farmer_name || '').toLowerCase().includes(query) ||
                        (crop.location || '').toLowerCase().includes(query);
    const price = Number(crop.price_per_kg) || 0;
    const matchesPrice = price >= min && price <= max;
    const cropCategory = crop.category || 'Other';
    const matchesCategory = selectedCategory === 'All' || cropCategory.toLowerCase() === selectedCategory.toLowerCase();
    const matchesNegotiable = !negotiableOnly || crop.bidding_enabled;

    return matchesName && matchesPrice && matchesCategory && crop.quantity_available > 0;
  });

  // Sorting
  if (sortBy === 'price_asc') {
    filtered.sort((a, b) => Number(a.price_per_kg) - Number(b.price_per_kg));
  } else if (sortBy === 'price_desc') {
    filtered.sort((a, b) => Number(b.price_per_kg) - Number(a.price_per_kg));
  } else if (sortBy === 'stock_desc') {
    filtered.sort((a, b) => Number(b.quantity_available) - Number(a.quantity_available));
  } else {
    filtered.sort((a, b) => b.id - a.id);
  }

  const countEl = document.getElementById('cropCountText');
  if (countEl) countEl.textContent = `${filtered.length} fresh produce item${filtered.length === 1 ? '' : 's'} available directly from farmers`;

  renderCrops(filtered);
}

function renderCrops(crops) {
  const cropList = document.getElementById('cropList');
  if (!cropList) return;
  cropList.innerHTML = '';

  if (!crops || crops.length === 0) {
    cropList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No produce matches your filters</h3>
        <p>Try resetting the search query or adjusting the price range filter.</p>
      </div>
    `;
    return;
  }

  crops.forEach(crop => {
    const lowStock = Number(crop.quantity_available) < LOW_STOCK_THRESHOLD;
    const hasImage = crop.image && crop.image.startsWith('data:image/');
    const isWishlisted = buyerWishlistSet.has(crop.id);

    const imageHtml = hasImage
      ? `<img src="${crop.image}" alt="${escapeHtml(crop.crop_name)}" class="crop-card-img" loading="lazy">`
      : `<div class="crop-card-img placeholder">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12A10 10 0 0 1 12 2z"/></svg>
           <span>Fresh Harvest</span>
         </div>`;

    const harvestHtml = crop.harvest_date
      ? `<div class="crop-harvest-date">📅 Harvested: ${formatDate(crop.harvest_date)}</div>`
      : '';

    const biddingTag = crop.bidding_enabled
      ? `<span class="badge-negotiable">🤝 Price Negotiable</span>`
      : '';

    const originLink = crop.traceability_code
      ? `<a href="traceability.html?code=${crop.traceability_code}" target="_blank" class="trace-chip" title="Inspect verified farm origin">🛡️ Verified Origin</a>`
      : '';

    const bulkBadge = crop.bulk_pricing && Array.isArray(crop.bulk_pricing) && crop.bulk_pricing.length > 0
      ? `<span class="badge-bulk">📦 Bulk from ₹${crop.bulk_pricing[0].price_per_kg}/kg</span>`
      : '';

    const distanceBadge = crop.distance_km != null
      ? `<span class="distance-badge">📍 ${crop.distance_km} km away</span>`
      : '';

    const verifiedBadge = crop.farmer_is_verified
      ? `<span class="badge-verified">✓ Verified</span>`
      : '';

    // Feature 1B: Real SQL Aggregated Fair Price Indicator Badge
    const priceBadgeHtml = window.FD_FairPrice ? FD_FairPrice.getBuyerBadgeHtml(crop) : '';

    cropList.innerHTML += `
      <div class="crop-card" style="position:relative;">
        <button class="wishlist-toggle-btn ${isWishlisted ? 'active' : ''}" onclick="toggleCropWishlist(event, ${crop.id})" style="position:absolute; top:12px; right:12px; z-index:2;" title="Save to wishlist">
          ${isWishlisted ? '❤️' : '🤍'}
        </button>

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

        <div class="crop-badge-row" style="margin-bottom:6px; display:flex; gap:6px; flex-wrap:wrap;">
          ${priceBadgeHtml}
          ${bulkBadge}
          ${distanceBadge}
        </div>

        <div class="crop-farmer-meta">
          Farmer: <strong style="cursor:pointer; color:var(--primary); text-decoration:underline;" onclick="openFarmerProfileModal(${crop.farmer_id})">${escapeHtml(crop.farmer_name)}</strong>
          ${verifiedBadge} (${escapeHtml(crop.location || 'India')})
        </div>

        ${biddingTag}
        ${harvestHtml}

        <div class="stock-bar-track">
          <div class="stock-bar-fill ${lowStock ? 'low' : ''}" style="width:${stockPercent(crop.quantity_available)}%"></div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:12.5px; color:var(--ink-soft);">${escapeHtml(crop.quantity_available)} kg available</span>
          ${originLink}
        </div>

        <p style="margin:0 0 12px; font-size:13px; line-height:1.4;">${crop.description ? escapeHtml(crop.description) : 'Direct-from-farm produce.'}</p>

        <!-- Order actions -->
        <div class="order-row">
          <input type="number" id="qty-${crop.id}" placeholder="Qty (kg)" min="1" max="${crop.quantity_available}" value="1" oninput="checkOrderTierDiscountPreview(${crop.id})">
          <button class="btn-primary" onclick="placeOrder(${crop.id})">Order Now</button>
        </div>
        <div id="tierDiscountPreview-${crop.id}" style="font-size:12px; color:var(--secondary); font-weight:700; margin-top:4px; display:none;"></div>

        ${crop.bidding_enabled ? `
          <div style="margin-top: 8px;">
            <button class="btn-secondary" style="width:100%; padding:8px;" onclick='openBidModal(${JSON.stringify({ id: crop.id, name: crop.crop_name, price: crop.price_per_kg, stock: crop.quantity_available, farmer: crop.farmer_name })})'>
              🤝 Negotiate Custom Price
            </button>
          </div>
        ` : ''}
      </div>
    `;
  });
}

// Filter listeners
document.getElementById('searchBox')?.addEventListener('input', applyFilters);
document.getElementById('minPrice')?.addEventListener('input', applyFilters);
document.getElementById('maxPrice')?.addEventListener('input', applyFilters);
document.getElementById('sortSelect')?.addEventListener('change', applyFilters);
document.getElementById('negotiableOnlyFilter')?.addEventListener('change', applyFilters);

// Place direct order
window.placeOrder = async function(cropId) {
  const quantityInput = document.getElementById(`qty-${cropId}`);
  const quantity_ordered = quantityInput.value;

  if (!quantity_ordered || quantity_ordered <= 0) {
    showToast('Please enter a valid positive quantity', 'error');
    return;
  }

  const btn = quantityInput.nextElementSibling;
  setLoading(btn, true);

  try {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ crop_id: cropId, quantity_ordered })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Order placed successfully! Track its status under My Orders.', 'success');
      loadCrops();
      loadOrders();
      loadBuyerStatsAndOverview();
    } else {
      showToast(data.error || 'Failed to place order', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  } finally {
    setLoading(btn, false);
  }
};

// ============================================================================
// BUYER ORDERS & STATUS TIMELINE
// ============================================================================
async function loadOrders() {
  try {
    const res = await fetch(`${API_URL}/orders/buyer/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    allBuyerOrders = await res.json();

    const orderList = document.getElementById('orderList');
    if (!orderList) return;
    orderList.innerHTML = '';

    if (!allBuyerOrders || allBuyerOrders.length === 0) {
      orderList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3>No purchase orders placed yet</h3>
          <p>Browse our verified direct-farm produce catalog and order directly from local farmers.</p>
          <button class="btn-primary" onclick="showBuyerSection('browseCropsView', 'Browse Crops', 'navBrowseCrops')">Go to Marketplace</button>
        </div>
      `;
      return;
    }

    allBuyerOrders.forEach(order => {
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
            Farmer: <strong>${escapeHtml(order.farmer_name)}</strong> (${escapeHtml(order.farmer_location || 'India')}) · Placed: ${formatDate(order.created_at)}
          </div>

          <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
            <button class="btn-secondary btn-small" onclick="openBuyerTimeline(${order.id})">🕒 View Fulfillment Timeline</button>
            ${order.status === 'delivered' ? `<button class="btn-primary btn-small" onclick="openLeaveReviewModal(${order.id}, '${escapeHtml(order.crop_name)}', '${escapeHtml(order.farmer_name)}')">⭐ Leave Review</button>` : ''}
            ${order.status === 'pending' ? `<button class="danger btn-small" onclick="cancelOrder(${order.id})">Cancel Order</button>` : ''}
            <button class="toggle-messages btn-small" onclick="toggleBuyerMessages(${order.id}, ${order.farmer_id})">💬 Message Farmer</button>
          </div>

          <div id="buyer-thread-${order.id}" style="display:none; margin-top:14px;">
            <div class="message-thread" id="buyer-messages-${order.id}"></div>
            <div class="message-row">
              <input type="text" id="buyer-msgInput-${order.id}" placeholder="Type message to farmer..." onkeypress="if(event.key === 'Enter') sendBuyerMessage(${order.id}, ${order.farmer_id})">
              <button onclick="sendBuyerMessage(${order.id}, ${order.farmer_id})">Send</button>
            </div>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error('loadOrders error:', err);
  }
}

window.cancelOrder = async function(orderId) {
  if (!confirm('Cancel this pending order? This will release reserved produce back to the marketplace.')) return;
  try {
    const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: 'cancelled' })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Order cancelled', 'success');
      loadOrders();
      loadCrops();
      loadBuyerStatsAndOverview();
    } else {
      showToast(data.error || 'Failed to cancel order', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
};

// Buyer Order Timeline Modal
window.openBuyerTimeline = async function(orderId) {
  const modal = document.getElementById('buyerTimelineModal');
  const infoEl = document.getElementById('buyerTimelineOrderInfo');
  const stepperEl = document.getElementById('buyerTimelineStepper');

  modal.style.display = 'flex';
  infoEl.textContent = 'Loading timeline...';
  stepperEl.innerHTML = '';

  try {
    const res = await fetch(`${API_URL}/orders/${orderId}/timeline`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (res.ok) {
      infoEl.innerHTML = `Order #${data.order.id} for <strong>${escapeHtml(data.order.crop_name)}</strong> (${data.order.quantity} kg) · Current Status: <span class="status-tag status-${data.order.status}">${data.order.status}</span>`;

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
    infoEl.textContent = 'Failed to load timeline.';
  }
};

window.closeBuyerTimelineModal = function() {
  document.getElementById('buyerTimelineModal').style.display = 'none';
};

// ============================================================================
// DEDICATED TRACK ORDERS VIEW
// ============================================================================
function loadTrackOrdersView() {
  const select = document.getElementById('trackOrderSelect');
  if (!select) return;

  select.innerHTML = '<option value="" disabled selected>Select an active purchase order to track...</option>';
  allBuyerOrders.forEach(o => {
    select.innerHTML += `<option value="${o.id}">Order #${o.id} — ${escapeHtml(o.crop_name)} (${o.quantity} kg) [${o.status.toUpperCase()}]</option>`;
  });
}

window.renderDedicatedTracking = async function(orderId) {
  const output = document.getElementById('dedicatedTrackingOutput');
  if (!output || !orderId) return;

  output.innerHTML = '<div class="notif-empty">Loading fulfillment stepper...</div>';

  try {
    const res = await fetch(`${API_URL}/orders/${orderId}/timeline`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (res.ok) {
      output.innerHTML = `
        <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px;">
          <h3 style="margin:0 0 6px;">Order #${data.order.id} — ${escapeHtml(data.order.crop_name)}</h3>
          <p style="margin:0; font-size:13.5px;">Quantity: ${data.order.quantity} kg · Total: ₹${Number(data.order.total_price).toFixed(2)} · Status: <span class="status-tag status-${data.order.status}">${data.order.status}</span></p>
        </div>
        <div class="timeline-stepper">
          ${data.timeline.map(step => `
            <div class="timeline-step">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-status">${escapeHtml(step.status.toUpperCase())} <small style="color:var(--ink-soft); font-weight:normal;">(${escapeHtml(step.actor_role)})</small></div>
                <div class="timeline-note">${escapeHtml(step.note || '')}</div>
                <div class="timeline-time">${formatDate(step.created_at)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  } catch (err) {
    output.innerHTML = '<div class="empty-state">Could not load tracking details.</div>';
  }
};

// ============================================================================
// MESSAGING (BUYER)
// ============================================================================
let buyerChatIntervals = {};

window.toggleBuyerMessages = async function(orderId) {
  const thread = document.getElementById(`buyer-thread-${orderId}`);
  const isHidden = thread.style.display === 'none';
  thread.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    await loadBuyerMessages(orderId);
    buyerChatIntervals[orderId] = setInterval(() => loadBuyerMessages(orderId), 2500);
  } else {
    clearInterval(buyerChatIntervals[orderId]);
    delete buyerChatIntervals[orderId];
  }
};

async function loadBuyerMessages(orderId) {
  const res = await fetch(`${API_URL}/messages/order/${orderId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const messages = await res.json();
  const box = document.getElementById(`buyer-messages-${orderId}`);
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

window.sendBuyerMessage = async function(orderId, receiverId) {
  const input = document.getElementById(`buyer-msgInput-${orderId}`);
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
      loadBuyerMessages(orderId);
    } else {
      showToast('Failed to send message', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
};

function loadBuyerMessagesView() {
  const container = document.getElementById('buyerActiveThreadsList');
  if (!container) return;

  if (allBuyerOrders.length === 0) {
    container.innerHTML = '<div class="empty-state">No orders placed yet. Chat with farmers becomes available once an order is created.</div>';
    return;
  }

  container.innerHTML = allBuyerOrders.map(o => `
    <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>Order #${o.id} — ${escapeHtml(o.crop_name)}</strong>
        <div style="font-size:12.5px; color:var(--ink-soft);">Farmer: ${escapeHtml(o.farmer_name)} (${escapeHtml(o.farmer_location || 'India')})</div>
      </div>
      <button class="btn-primary btn-small" onclick="showBuyerSection('myOrdersView', 'My Orders', 'navMyOrders'); toggleBuyerMessages(${o.id}, ${o.farmer_id});">Open Conversation</button>
    </div>
  `).join('');
}

// ============================================================================
// PRICE NEGOTIATION & BIDDING (BUYER)
// ============================================================================
window.openBidModal = function(crop) {
  document.getElementById('bidCropId').value = crop.id;
  document.getElementById('bidModalCropInfo').innerHTML = `
    <strong>${escapeHtml(crop.name)}</strong> · Listed Price: <strong>₹${crop.price}/kg</strong>
    <br>Available Stock: ${crop.stock} kg · Farmer: ${escapeHtml(crop.farmer)}
  `;
  document.getElementById('bidQty').value = '1';
  document.getElementById('bidQty').max = crop.stock;
  document.getElementById('bidPrice').value = '';
  document.getElementById('bidNote').value = '';
  document.getElementById('bidModal').style.display = 'flex';
};

window.closeBidModal = function() {
  document.getElementById('bidModal').style.display = 'none';
};

document.getElementById('bidForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const crop_id = document.getElementById('bidCropId').value;
  const quantity = document.getElementById('bidQty').value;
  const offered_price_per_kg = document.getElementById('bidPrice').value;
  const note = document.getElementById('bidNote').value.trim();

  try {
    const res = await fetch(`${API_URL}/bids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ crop_id, quantity, offered_price_per_kg, note })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Offer submitted to farmer! You will be notified upon review.', 'success');
      closeBidModal();
      loadBuyerBids();
    } else {
      showToast(data.error || 'Failed to submit offer', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
});

async function loadBuyerBids() {
  const container = document.getElementById('buyerBidList');
  if (!container) return;
  container.innerHTML = '<div class="notif-empty">Loading your negotiations...</div>';

  try {
    const res = await fetch(`${API_URL}/bids/buyer`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const bids = await res.json();

    const pendingCount = (bids || []).filter(b => ['pending', 'countered'].includes(b.status) && b.current_by === 'farmer').length;
    const badge = document.getElementById('buyerBidBadge');
    if (badge) badge.textContent = pendingCount;

    if (!bids || bids.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🤝</div>
          <h3>No price negotiations opened yet</h3>
          <p>Look for produce with the "🤝 Price Negotiable" tag in the marketplace to submit custom counteroffers!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = bids.map(bid => {
      const isFarmerTurn = ['pending', 'countered'].includes(bid.status) && bid.current_by === 'farmer';
      const totalOffer = (bid.quantity * bid.offered_price_per_kg).toFixed(2);

      return `
        <div class="crop-card" style="margin-bottom:16px;">
          <div class="crop-header-row">
            <strong>${escapeHtml(bid.crop_name)}</strong>
            <span class="status-tag status-${bid.status === 'converted_to_order' ? 'accepted' : escapeHtml(bid.status)}">${escapeHtml(bid.status)}</span>
          </div>
          <div class="crop-meta">Farmer: <strong>${escapeHtml(bid.farmer_name)}</strong> (${escapeHtml(bid.farmer_location || 'India')})</div>
          <div class="crop-meta" style="margin-top:-6px;">
            Active Offer: <strong>₹${bid.offered_price_per_kg}/kg</strong> for <strong>${bid.quantity} kg</strong> (Total: ₹${totalOffer})
            <br><small style="color:var(--ink-soft)">Original list price: ₹${bid.original_price}/kg · Turn: ${bid.current_by.toUpperCase()}</small>
          </div>

          ${isFarmerTurn ? `
            <div style="background:var(--accent-subtle); padding:10px 14px; border-radius:8px; margin: 10px 0; font-size:13px; color:var(--accent-hover);">
              💡 <strong>Farmer Counteroffer:</strong> The farmer proposed ₹${bid.offered_price_per_kg}/kg. You can accept this rate or counter back!
            </div>
            <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
              <button class="btn-primary btn-small" onclick="acceptBuyerBid(${bid.id}, '${escapeHtml(bid.crop_name)}')">✓ Accept & Confirm Order</button>
              <button class="btn-secondary btn-small" onclick="openBuyerCounterModal(${bid.id}, '${escapeHtml(bid.crop_name)}', ${bid.offered_price_per_kg}, ${bid.quantity})">💬 Counter Back</button>
              <button class="danger btn-small" onclick="rejectBuyerBid(${bid.id})">✕ Reject</button>
            </div>
          ` : `
            <div style="font-size:13px; color:var(--ink-soft); margin-top:8px;">
              ${bid.status === 'converted_to_order' ? '✅ Converted to Order #' + bid.order_id : 'Awaiting farmer response...'}
            </div>
          `}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Failed to load negotiations.</div>';
  }
}

window.acceptBuyerBid = async function(bidId, cropName) {
  if (!confirm(`Accept this negotiated price for ${cropName} and confirm your order?`)) return;

  try {
    const res = await fetch(`${API_URL}/bids/${bidId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Offer accepted! Order #${data.orderId} created.`, 'success');
      loadBuyerBids();
      loadOrders();
      loadBuyerStatsAndOverview();
    } else {
      showToast(data.error || 'Failed to accept offer', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
};

window.rejectBuyerBid = async function(bidId) {
  if (!confirm('Reject this offer and conclude negotiation?')) return;
  try {
    const res = await fetch(`${API_URL}/bids/${bidId}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      showToast('Offer rejected', 'success');
      loadBuyerBids();
    } else {
      showToast('Failed to reject offer', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
};

window.openBuyerCounterModal = function(bidId, cropName, currentOffer, qty) {
  document.getElementById('buyerCounterBidId').value = bidId;
  document.getElementById('buyerCounterInfo').innerHTML = `Responding to farmer's counteroffer for <strong>${cropName}</strong> (₹${currentOffer}/kg for ${qty} kg)`;
  document.getElementById('buyerCounterPrice').value = '';
  document.getElementById('buyerCounterNote').value = '';
  document.getElementById('buyerCounterModal').style.display = 'flex';
};

window.closeBuyerCounterModal = function() {
  document.getElementById('buyerCounterModal').style.display = 'none';
};

document.getElementById('buyerCounterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bidId = document.getElementById('buyerCounterBidId').value;
  const price_per_kg = document.getElementById('buyerCounterPrice').value;
  const note = document.getElementById('buyerCounterNote').value.trim();

  try {
    const res = await fetch(`${API_URL}/bids/${bidId}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ price_per_kg, note })
    });
    if (res.ok) {
      showToast('Counteroffer sent to farmer!', 'success');
      closeBuyerCounterModal();
      loadBuyerBids();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to send counteroffer', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
});

// ============================================================================
// COMMUNITY GROUP BUYING (BUYER)
// ============================================================================
async function loadBuyerGroupBuys() {
  const container = document.getElementById('buyerGroupBuyList');
  if (!container) return;
  container.innerHTML = '<div class="notif-empty">Loading active community group buys...</div>';

  try {
    const res = await fetch(`${API_URL}/group-buys`);
    const campaigns = await res.json();

    if (!campaigns || campaigns.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3>No active group buying campaigns right now</h3>
          <p>Local farmers launch bulk co-op campaigns regularly for wholesale seasonal harvests.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = campaigns.map(gb => {
      const pct = Math.min(100, Math.round((gb.committed_quantity / gb.target_quantity) * 100));
      const remainingKg = Math.max(0, gb.target_quantity - gb.committed_quantity);

      return `
        <div class="crop-card" style="margin-bottom:16px;">
          <div class="crop-header-row">
            <strong>${escapeHtml(gb.title)}</strong>
            <span class="status-tag status-${escapeHtml(gb.status)}">${escapeHtml(gb.status)}</span>
          </div>
          <div class="crop-meta">Produce: <strong>${escapeHtml(gb.crop_name)}</strong> · Farmer: ${escapeHtml(gb.farmer_name)} (${escapeHtml(gb.farmer_location || 'India')})</div>
          <div class="crop-meta" style="margin-top:-6px;">
            Group Wholesale Rate: <strong style="color:var(--primary); font-size:18px;">₹${gb.discount_price_per_kg}/kg</strong> 
            <small style="color:var(--ink-soft); text-decoration:line-through; margin-left:6px;">Standard: ₹${gb.original_price}/kg</small>
          </div>

          <!-- Progress Bar -->
          <div style="margin: 14px 0 8px;">
            <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:600; margin-bottom:4px;">
              <span>Volume Target Progress</span>
              <span>${gb.committed_quantity} / ${gb.target_quantity} kg (${pct}%)</span>
            </div>
            <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${pct}%;"></div></div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--ink-soft); margin-top:4px;">
              <span>${remainingKg} kg needed to unlock rate</span>
              <span>Cutoff: ${formatDate(gb.end_date)}</span>
            </div>
          </div>

          <div style="margin-top: 14px;">
            <button class="btn-primary" style="width:100%;" onclick='openJoinGbModal(${JSON.stringify(gb)})'>
              👥 Join Group Buy at ₹${gb.discount_price_per_kg}/kg
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Failed to load group buying campaigns.</div>';
  }
}

window.openJoinGbModal = function(gb) {
  document.getElementById('joinGbId').value = gb.id;
  document.getElementById('joinGbRate').value = gb.discount_price_per_kg;
  document.getElementById('joinGbInfo').innerHTML = `
    Campaign: <strong>${escapeHtml(gb.title)}</strong> (${escapeHtml(gb.crop_name)})<br>
    Wholesale Rate: <strong>₹${gb.discount_price_per_kg}/kg</strong> · Remaining to target: ${gb.target_quantity - gb.committed_quantity} kg
  `;
  document.getElementById('joinGbQty').value = '5';
  updateJoinGbCalculatedTotal();
  document.getElementById('joinGbModal').style.display = 'flex';
};

window.closeJoinGbModal = function() {
  document.getElementById('joinGbModal').style.display = 'none';
};

function updateJoinGbCalculatedTotal() {
  const qty = parseFloat(document.getElementById('joinGbQty')?.value) || 0;
  const rate = parseFloat(document.getElementById('joinGbRate')?.value) || 0;
  const total = (qty * rate).toFixed(2);
  const totalEl = document.getElementById('joinGbCalculatedTotal');
  if (totalEl) totalEl.textContent = `Estimated Order Total: ₹${total}`;
}

const joinGbQtyInput = document.getElementById('joinGbQty');
if (joinGbQtyInput) {
  joinGbQtyInput.addEventListener('input', updateJoinGbCalculatedTotal);
}

document.getElementById('joinGbForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const gbId = document.getElementById('joinGbId').value;
  const quantity = document.getElementById('joinGbQty').value;

  try {
    const res = await fetch(`${API_URL}/group-buys/${gbId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ quantity })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Joined group buy successfully!', 'success');
      closeJoinGbModal();
      loadBuyerGroupBuys();
      loadOrders();
      loadBuyerStatsAndOverview();
    } else {
      showToast(data.error || 'Failed to join group buy', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
});

// ============================================================================
// PRICE COMPARISON BENCHMARKING (FEATURE 1B: Real SQL Aggregation)
// ============================================================================
async function loadPriceComparison() {
  const container = document.getElementById('priceComparisonContent');
  if (!container) return;

  container.innerHTML = '<div class="notif-empty"><span class="pulse-dot"></span> Calculating live platform price benchmarks from active database listings...</div>';

  try {
    const [insightsRes, cropsRes] = await Promise.all([
      fetch(`${API_URL}/crops/price-insights?all=true`),
      fetch(`${API_URL}/crops`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const insightsData = await insightsRes.json();
    const crops = await cropsRes.json();
    const benchmarks = insightsData.benchmarks || [];

    if (!crops || crops.length === 0) {
      container.innerHTML = '<div class="empty-state">No produce listed to compare prices.</div>';
      return;
    }

    // Group crops by category
    const categoryStats = {};
    crops.forEach(c => {
      const cat = c.category || 'Other';
      if (!categoryStats[cat]) categoryStats[cat] = { count: 0, sum: 0, min: Infinity, max: -Infinity, items: [] };
      const price = Number(c.price_per_kg);
      categoryStats[cat].count++;
      categoryStats[cat].sum += price;
      if (price < categoryStats[cat].min) categoryStats[cat].min = price;
      if (price > categoryStats[cat].max) categoryStats[cat].max = price;
      categoryStats[cat].items.push(c);
    });

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <!-- Quick search within benchmarks -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
          <div>
            <h3 style="margin:0 0 4px; font-size:18px;">Produce Price Benchmarks</h3>
            <p style="margin:0; font-size:13px; color:var(--ink-soft);">Real-time aggregated benchmarks calculated directly from active Farm Direct producer listings.</p>
          </div>
          <input type="text" id="benchmarkTableFilter" placeholder="Filter benchmarks by crop or category..." style="max-width:300px; padding:8px 14px; border:1px solid var(--border); border-radius:8px; font-size:13px;">
        </div>

        <!-- Individual Crop Benchmarks Table -->
        <div class="table-responsive" style="margin-bottom:28px;">
          <table class="data-table" id="cropBenchmarkTable">
            <thead>
              <tr>
                <th>Crop Listing</th>
                <th>Category</th>
                <th>Active Listings</th>
                <th>Lowest Listed</th>
                <th>Platform Benchmark (Avg)</th>
                <th>Highest Listed</th>
                <th>Pricing Status</th>
              </tr>
            </thead>
            <tbody>
              ${benchmarks.map(b => {
                const hasBenchmark = b.status === 'ok' && b.comparison_average != null;
                return `
                  <tr class="benchmark-row" data-crop="${escapeHtml(b.crop_name.toLowerCase())}" data-cat="${escapeHtml(b.category.toLowerCase())}">
                    <td><strong>${escapeHtml(b.crop_name)}</strong></td>
                    <td><span class="category-badge">${escapeHtml(b.category)}</span></td>
                    <td>${b.listing_count} available</td>
                    <td>${b.min_price != null ? `₹${b.min_price}/kg` : 'N/A'}</td>
                    <td><strong style="color:var(--primary); font-size:15px;">${hasBenchmark ? `₹${b.comparison_average}/kg` : '<span style="font-size:12px; color:var(--ink-muted);">Building data</span>'}</strong></td>
                    <td>${b.max_price != null ? `₹${b.max_price}/kg` : 'N/A'}</td>
                    <td>
                      ${hasBenchmark 
                        ? `<span class="badge-price-deal">Active Benchmark</span>` 
                        : `<span class="badge-price-neutral" title="Need at least 2 active listings">Insufficient data</span>`}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <h3 style="margin:0 0 12px; font-size:17px;">Produce Category Overview</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Produce Category</th>
                <th>Available Listings</th>
                <th>Lowest Price</th>
                <th>Average Price</th>
                <th>Highest Price</th>
                <th>Direct Trade Advantage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(categoryStats).map(cat => {
                const s = categoryStats[cat];
                const avg = (s.sum / s.count).toFixed(1);
                return `
                  <tr>
                    <td><strong>${escapeHtml(cat)}</strong></td>
                    <td>${s.count} available</td>
                    <td style="color:var(--secondary); font-weight:700;">₹${s.min}/kg</td>
                    <td><strong>₹${avg}/kg</strong></td>
                    <td>₹${s.max}/kg</td>
                    <td><span class="status-tag status-active">Direct Grower Pricing</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Disclaimer Box -->
        <div class="calc-disclaimer-box" style="margin-top:20px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="8"></line>
          </svg>
          <p>Methodology Note: Benchmarks are computed using SQL aggregates (AVG, MIN, MAX) over currently active, eligible listings on the Farm Direct platform. This benchmark is not an official government APMC mandi price or verified national wholesale rate.</p>
        </div>
      </div>
    `;

    // Filter listener
    const filterInput = document.getElementById('benchmarkTableFilter');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#cropBenchmarkTable .benchmark-row').forEach(row => {
          const crop = row.getAttribute('data-crop') || '';
          const cat = row.getAttribute('data-cat') || '';
          row.style.display = (crop.includes(query) || cat.includes(query)) ? '' : 'none';
        });
      });
    }
  } catch (err) {
    console.error('loadPriceComparison error:', err);
    container.innerHTML = '<div class="empty-state">Failed to calculate price comparisons.</div>';
  }
}

// ============================================================================
// DEDICATED AI CHAT FORM WIRING
// ============================================================================
const dedicatedAiForm = document.getElementById('dedicatedAiForm');
const dedicatedAiInput = document.getElementById('dedicatedAiInput');
if (dedicatedAiForm && dedicatedAiInput) {
  dedicatedAiForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = dedicatedAiInput.value.trim();
    if (!query) return;
    dedicatedAiInput.value = '';
    await handleAssistantQuery(query, 'dedicatedAiStream');
  });
}

// ============================================================================
// TRACEABILITY CODE LOOKUP
// ============================================================================
window.lookupTraceabilityCode = async function() {
  const code = (document.getElementById('traceabilityCodeInput')?.value || '').trim();
  const resultBox = document.getElementById('buyerTraceResult');
  if (!code || !resultBox) return;

  resultBox.innerHTML = '<div class="notif-empty">Verifying digital origin...</div>';

  try {
    const res = await fetch(`${API_URL}/traceability/code/${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();

    resultBox.innerHTML = `
      <div class="card-box" style="background:var(--bg-app); border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:18px;">${escapeHtml(data.crop_name)}</h3>
          <span class="status-tag status-active">🛡️ VERIFIED HARVEST ORIGIN</span>
        </div>
        <div class="trace-grid-stats" style="margin-bottom:12px;">
          <div class="trace-stat-box">
            <span class="trace-stat-label">Farmer / Producer</span>
            <strong class="trace-stat-val">${escapeHtml(data.farmer_name)}</strong>
          </div>
          <div class="trace-stat-box">
            <span class="trace-stat-label">Harvest Location</span>
            <strong class="trace-stat-val">${escapeHtml(data.farmer_location || 'India')}</strong>
          </div>
          <div class="trace-stat-box">
            <span class="trace-stat-label">Harvest Date</span>
            <strong class="trace-stat-val">${formatDate(data.harvest_date)}</strong>
          </div>
          <div class="trace-stat-box">
            <span class="trace-stat-label">Listing Rate</span>
            <strong class="trace-stat-val">₹${data.price_per_kg}/kg</strong>
          </div>
        </div>
        <a href="traceability.html?code=${data.traceability_code}" target="_blank" class="btn-primary btn-small">Open Full Digital Certificate →</a>
      </div>
    `;
  } catch (err) {
    resultBox.innerHTML = `
      <div class="empty-state" style="color:var(--danger);">
        <strong>Certificate Not Found</strong>
        <p>No verified crop listing matches the code "${escapeHtml(code)}". Please check the spelling.</p>
      </div>
    `;
  }
};

// ============================================================================
// DEDICATED NOTIFICATIONS VIEW (BUYER)
// ============================================================================
async function loadBuyerDedicatedNotifications() {
  const container = document.getElementById('buyerDedicatedNotifList');
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
// BUYER PROFILE & SETTINGS
// ============================================================================
function loadBuyerProfile() {
  const nameEl = document.getElementById('buyerProfileName');
  const emailEl = document.getElementById('buyerProfileEmail');
  const locEl = document.getElementById('buyerProfileLocation');
  const avatarEl = document.getElementById('buyerProfileLargeAvatar');

  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email || 'buyer@farmdirect.in';
  if (locEl) locEl.textContent = user.location || 'Pune, India';
  if (avatarEl) avatarEl.textContent = getInitials(user.name);
}

function loadBuyerSettings() {
  const apiEl = document.getElementById('buyerSettingsApiUrl');
  if (apiEl) {
    apiEl.textContent = window.IS_LOCAL ? 'Localhost (Development)' : 'Render Production Cloud API';
  }
}

// Initial Boot
loadBuyerStatsAndOverview();
loadCrops();
loadOrders();
loadBuyerBids();


// ============================================================================
// FARM DIRECT V3 — BUYER WISHLIST, PRICE ALERTS, NEARBY & REVIEWS
// ============================================================================

// Fetch wishlist IDs to mark hearts on initial load
async function fetchBuyerWishlistIds() {
  try {
    const res = await fetch(`${API_URL}/wishlist`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const items = await res.json();
    buyerWishlistSet = new Set(items.map(i => i.id));
  } catch (e) {
    console.warn('fetchBuyerWishlistIds error:', e.message);
  }
}
fetchBuyerWishlistIds();

// 1. WISHLIST MANAGEMENT
window.toggleCropWishlist = async function(e, cropId) {
  if (e && e.stopPropagation) e.stopPropagation();
  const btn = e.currentTarget || e.target;
  const isCurrentlyIn = buyerWishlistSet.has(cropId);

  try {
    if (isCurrentlyIn) {
      const res = await fetch(`${API_URL}/wishlist/${cropId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        buyerWishlistSet.delete(cropId);
        btn.innerHTML = '🤍';
        btn.classList.remove('active');
        showToast('Removed from wishlist', 'info');
        if (currentBuyerActiveView === 'buyerWishlistView') loadBuyerWishlist();
      }
    } else {
      const res = await fetch(`${API_URL}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ crop_id: cropId })
      });
      if (res.ok) {
        buyerWishlistSet.add(cropId);
        btn.innerHTML = '❤️';
        btn.classList.add('active');
        showToast('Added to wishlist!', 'success');
      }
    }
  } catch (err) {
    showToast('Failed to update wishlist', 'error');
  }
};

window.loadBuyerWishlist = async function() {
  const grid = document.getElementById('buyerWishlistGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px;"><span class="pulse-dot"></span> Loading wishlist...</div>';

  try {
    const res = await fetch(`${API_URL}/wishlist`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const items = await res.json();

    if (!items || items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">❤️</div>
          <h3>Your wishlist is empty</h3>
          <p>Browse fresh farm produce and tap the heart icon to save items here for fast ordering.</p>
          <button class="btn-primary" onclick="showBuyerSection('browseCropsView', 'Browse Crops', 'navBrowseCrops')">Explore Marketplace</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(c => {
      const hasImage = c.image && c.image.startsWith('data:image/');
      const imageHtml = hasImage
        ? `<img src="${c.image}" alt="${escapeHtml(c.crop_name)}" class="crop-card-img" loading="lazy">`
        : `<div class="crop-card-img placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12A10 10 0 0 1 12 2z"/></svg><span>Fresh Produce</span></div>`;

      return `
        <div class="crop-card" style="position:relative;">
          <button class="wishlist-toggle-btn active" onclick="toggleCropWishlist(event, ${c.id})" style="position:absolute; top:12px; right:12px; z-index:2;" title="Remove from wishlist">
            ❤️
          </button>
          ${imageHtml}
          <div class="crop-header-row">
            <strong>${escapeHtml(c.crop_name)}</strong>
            <span class="category-badge">${escapeHtml(c.category || 'Other')}</span>
          </div>
          <div class="crop-meta-row">
            <span class="crop-price-highlight">₹${escapeHtml(c.price_per_kg)}</span>
            <span class="crop-unit-text">/ kg</span>
            <span class="status-tag status-active" style="font-size:11px;">In Stock (${c.quantity_available} kg)</span>
          </div>
          <div class="crop-farmer-meta">
            Farmer: <strong style="cursor:pointer; color:var(--primary); text-decoration:underline;" onclick="openFarmerProfileModal(${c.farmer_id})">${escapeHtml(c.farmer_name)}</strong>
            ${c.farmer_is_verified ? '<span class="badge-verified" style="margin-left:4px;">✓ Verified</span>' : ''}
          </div>
          <div class="order-row" style="margin-top:auto; padding-top:12px;">
            <input type="number" id="qty-${c.id}" value="1" min="1" max="${c.quantity_available}" style="width:70px;">
            <button class="btn-primary btn-small" onclick="placeOrder(${c.id})">Order Now</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Could not load wishlist.</div>';
  }
};

// 2. LIVE BULK TIER DISCOUNT PREVIEW DURING QUANTITY ENTRY
window.checkOrderTierDiscountPreview = function(cropId) {
  const crop = allCrops.find(c => c.id === cropId);
  const qtyInput = document.getElementById(`qty-${cropId}`);
  const previewEl = document.getElementById(`tierDiscountPreview-${cropId}`);
  if (!crop || !qtyInput || !previewEl) return;

  const qty = parseInt(qtyInput.value, 10);
  if (isNaN(qty) || qty <= 0 || !crop.bulk_pricing || !Array.isArray(crop.bulk_pricing)) {
    previewEl.style.display = 'none';
    return;
  }

  const basePrice = parseFloat(crop.price_per_kg);
  const matchingTier = crop.bulk_pricing
    .filter(t => qty >= Number(t.min_qty) && (t.max_qty == null || qty <= Number(t.max_qty)))
    .sort((a, b) => Number(a.price_per_kg) - Number(b.price_per_kg))[0];

  if (matchingTier && Number(matchingTier.price_per_kg) < basePrice) {
    const savings = Number(((basePrice - Number(matchingTier.price_per_kg)) * qty).toFixed(2));
    previewEl.style.display = 'block';
    previewEl.innerHTML = `🎉 Bulk Tier Unlocked: ₹${matchingTier.price_per_kg}/kg (You save ₹${savings}!)`;
  } else {
    previewEl.style.display = 'none';
  }
};

// 3. PRICE ALERTS
window.handleCreatePriceAlert = async function(e) {
  e.preventDefault();
  const crop_name = document.getElementById('alertCropName').value.trim();
  const target_price = document.getElementById('alertTargetPrice').value;
  const district = document.getElementById('alertDistrict').value.trim();

  try {
    const res = await fetch(`${API_URL}/price-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ crop_name, target_price, district })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Price alert registered!', 'success');
      e.target.reset();
      loadBuyerPriceAlerts();
    } else {
      showToast(data.error || 'Failed to create alert', 'error');
    }
  } catch (err) {
    showToast('Network error setting alert', 'error');
  }
};

window.loadBuyerPriceAlerts = async function() {
  const tbody = document.getElementById('priceAlertsTableBody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_URL}/price-alerts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const alerts = await res.json();

    if (!alerts || alerts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px;">No active price alerts set yet. Use the form above to get notified on price drops.</td></tr>';
      return;
    }

    tbody.innerHTML = alerts.map(a => `
      <tr>
        <td><strong>${escapeHtml(a.crop_name)}</strong></td>
        <td><strong style="color:var(--primary);">₹${a.target_price}/kg</strong> or lower</td>
        <td>${escapeHtml(a.district || 'Any District')}</td>
        <td>
          <span class="status-tag status-active">Active</span>
          ${a.is_triggered ? '<span class="badge-price-deal" style="margin-left:4px;">🎯 Triggered</span>' : ''}
        </td>
        <td>${formatDate(a.created_at)}</td>
        <td>
          <button class="danger btn-small" onclick="deletePriceAlert(${a.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color:var(--danger);">Error loading price alerts.</td></tr>';
  }
};

window.deletePriceAlert = async function(id) {
  if (!confirm('Delete this price alert?')) return;
  try {
    const res = await fetch(`${API_URL}/price-alerts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      showToast('Price alert removed', 'success');
      loadBuyerPriceAlerts();
    }
  } catch (e) {
    showToast('Failed to delete alert', 'error');
  }
};

// 4. BUYER APMC MANDI PRICES VIEW
let allBuyerMandiData = [];

window.loadBuyerMandiPrices = async function() {
  const grid = document.getElementById('buyerMandiGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px;"><span class="pulse-dot"></span> Loading live APMC market data...</div>';

  try {
    const res = await fetch(`${API_URL}/market-prices`);
    allBuyerMandiData = await res.json();
    renderBuyerMandiCards(allBuyerMandiData);
  } catch (err) {
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--ink-soft);">Could not retrieve live APMC rates.</div>';
  }
};

function renderBuyerMandiCards(prices) {
  const grid = document.getElementById('buyerMandiGrid');
  if (!grid) return;

  if (prices.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--ink-soft);">No mandis match your filter.</div>';
    return;
  }

  grid.innerHTML = prices.map(p => `
    <div class="card-box" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <span class="mandi-badge" style="font-size:11px; background:var(--bg-app); padding:2px 8px; border-radius:999px;">📍 ${p.market_name}</span>
          <span style="font-size:11.5px; color:var(--ink-muted);">${p.district}, ${p.state}</span>
        </div>
        <h3 style="margin:4px 0 2px; font-size:1.15rem;">${p.commodity}</h3>
        <span style="font-size:12px; color:var(--ink-soft);">${p.variety || 'FAQ'} (${p.grade || 'FAQ'})</span>

        <div style="background:var(--bg-app); border-radius:var(--radius-md); padding:10px 14px; margin:12px 0; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-size:10px; text-transform:uppercase; color:var(--ink-muted); font-weight:700; display:block;">Mandi Modal Price</span>
            <strong style="font-size:1.3rem; color:var(--primary);">₹${p.modal_price_per_kg}/kg</strong>
          </div>
          <div style="text-align:right;">
            <span style="font-size:11px; color:var(--ink-muted);">Wholesale Rate</span>
            <div style="font-weight:700; font-size:13px;">₹${p.modal_price}/Qtl</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--ink-soft);">
          <span>Min: ₹${(p.min_price / 100).toFixed(1)}/kg</span>
          <span>Max: ₹${(p.max_price / 100).toFixed(1)}/kg</span>
          <span>Arrival: ${p.arrival_qty || 0} Qtl</span>
        </div>
      </div>
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border-light); font-size:11px; color:var(--ink-muted); display:flex; justify-content:space-between;">
        <span>Arrival: ${p.arrival_date || 'Today'}</span>
        <span style="color:var(--secondary); font-weight:600;">Govt Agmarknet</span>
      </div>
    </div>
  `).join('');
}

window.filterBuyerMandiPrices = function() {
  const comm = document.getElementById('buyerMandiCommodity').value.toLowerCase();
  const dist = document.getElementById('buyerMandiDistrict').value.toLowerCase().trim();

  const filtered = allBuyerMandiData.filter(p => {
    const matchComm = !comm || (p.commodity && p.commodity.toLowerCase() === comm);
    const matchDist = !dist || (p.district && p.district.toLowerCase().includes(dist));
    return matchComm && matchDist;
  });

  renderBuyerMandiCards(filtered);
};

// 5. NEARBY FARMERS & GEOLOCATION
window.detectBuyerLocation = function() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }
  showToast('Detecting your GPS location...', 'info');
  navigator.geolocation.getCurrentPosition(
    pos => {
      buyerUserCoords = {
        lat: Number(pos.coords.latitude.toFixed(4)),
        lon: Number(pos.coords.longitude.toFixed(4))
      };
      const textEl = document.getElementById('buyerLocationCoordsText');
      if (textEl) textEl.textContent = `GPS: Lat ${buyerUserCoords.lat}°, Lon ${buyerUserCoords.lon}° (Active)`;
      showToast('Location updated! Finding closest farmers...', 'success');
      loadNearbyFarmers();
    },
    err => {
      showToast('Could not acquire GPS: using default Pune/Baramati location', 'info');
      buyerUserCoords = { lat: 18.5204, lon: 73.8567 };
      loadNearbyFarmers();
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
};

window.loadNearbyFarmers = async function() {
  const grid = document.getElementById('nearbyFarmersGrid');
  const radiusSelect = document.getElementById('nearbyRadiusSelect');
  if (!grid) return;

  const radius = radiusSelect ? radiusSelect.value : '50';
  const coords = buyerUserCoords || { lat: 18.5204, lon: 73.8567 };

  grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px;"><span class="pulse-dot"></span> Calculating distances to verified farms...</div>';

  try {
    let url = `${API_URL}/crops?lat=${coords.lat}&lng=${coords.lon}&sort=distance`;
    if (radius !== 'all') url += `&radius=${radius}`;

    const res = await fetch(url);
    const crops = await res.json();

    if (!crops || crops.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">🚜</div>
          <h3>No farms found within selected radius</h3>
          <p>Try widening the distance filter (e.g. 100 km or All Distances) to explore regional growers.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = crops.map(c => `
      <div class="crop-card">
        <div class="crop-header-row">
          <strong>${escapeHtml(c.crop_name)}</strong>
          <span class="distance-badge">📍 ${c.distance_km != null ? c.distance_km + ' km' : 'Local'}</span>
        </div>
        <div class="crop-meta-row">
          <span class="crop-price-highlight">₹${c.price_per_kg}</span>
          <span class="crop-unit-text">/ kg</span>
        </div>
        <div class="crop-farmer-meta" style="margin:6px 0;">
          Farmer: <strong style="cursor:pointer; color:var(--primary); text-decoration:underline;" onclick="openFarmerProfileModal(${c.farmer_id})">${escapeHtml(c.farmer_name)}</strong>
          ${c.farmer_is_verified ? '<span class="badge-verified" style="margin-left:4px;">✓ Verified</span>' : ''}
          <div style="font-size:12px; color:var(--ink-soft); margin-top:2px;">Location: ${escapeHtml(c.farmer_district || c.location || 'Maharashtra')}</div>
        </div>
        <p style="font-size:12.5px; color:var(--ink-soft); margin:0 0 14px;">${c.description ? escapeHtml(c.description) : 'Direct harvest produce.'}</p>
        <div class="order-row" style="margin-top:auto;">
          <input type="number" id="qty-${c.id}" value="1" min="1" max="${c.quantity_available}">
          <button class="btn-primary" onclick="placeOrder(${c.id})">Order Now</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Failed to load nearby farms.</div>';
  }
};

// 6. ORDER REVIEWS (RATING & FEEDBACK)
let currentReviewRating = 5;

window.openLeaveReviewModal = function(orderId, cropName, farmerName) {
  const modal = document.getElementById('leaveReviewModal');
  const summaryEl = document.getElementById('reviewOrderSummary');
  const orderIdInput = document.getElementById('reviewOrderId');

  if (orderIdInput) orderIdInput.value = orderId;
  if (summaryEl) {
    summaryEl.innerHTML = `Order #${orderId} — <strong>${escapeHtml(cropName)}</strong> from <strong>${escapeHtml(farmerName)}</strong>`;
  }

  setRatingStar(5);
  modal.style.display = 'flex';
};

window.closeReviewModal = function() {
  const modal = document.getElementById('leaveReviewModal');
  if (modal) modal.style.display = 'none';
};

window.setRatingStar = function(val) {
  currentReviewRating = val;
  const ratingValInput = document.getElementById('reviewRatingVal');
  if (ratingValInput) ratingValInput.value = val;

  const starSpans = document.querySelectorAll('#starRatingSelect span');
  starSpans.forEach(s => {
    const starVal = parseInt(s.dataset.val, 10);
    if (starVal <= val) {
      s.classList.add('selected');
    } else {
      s.classList.remove('selected');
    }
  });
};

window.handleSubmitReview = async function(e) {
  e.preventDefault();
  const order_id = document.getElementById('reviewOrderId').value;
  const rating = currentReviewRating;
  const review_text = document.getElementById('reviewTextInput').value.trim();

  try {
    const res = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ order_id, rating, review_text })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Review submitted successfully! Thank you for supporting the farmer.', 'success');
      closeReviewModal();
      loadOrders();
    } else {
      showToast(data.error || 'Failed to submit review', 'error');
    }
  } catch (err) {
    showToast('Network error submitting review', 'error');
  }
};

// 7. FARMER PUBLIC PROFILE MODAL
window.openFarmerProfileModal = async function(farmerId) {
  const modal = document.getElementById('farmerProfileModal');
  const nameEl = document.getElementById('modalFarmerName');
  const locEl = document.getElementById('modalFarmerLocation');
  const avatarEl = document.getElementById('modalFarmerAvatar');
  const ratingEl = document.getElementById('modalFarmerRating');
  const ordersEl = document.getElementById('modalFarmerOrders');
  const expEl = document.getElementById('modalFarmerExp');
  const bioEl = document.getElementById('modalFarmerBio');
  const reviewsList = document.getElementById('modalFarmerReviewsList');

  modal.style.display = 'flex';
  reviewsList.innerHTML = '<div style="color:var(--ink-soft); font-size:12.5px;">Loading credentials & feedback...</div>';

  try {
    const res = await fetch(`${API_URL}/profile/farmer/${farmerId}`);
    if (!res.ok) throw new Error('Failed to load profile');
    const data = await res.json();
    const f = data.farmer;

    nameEl.textContent = f.name;
    locEl.textContent = `${f.district || f.location || 'Region'}, ${f.state || 'India'}`;
    avatarEl.textContent = getInitials(f.name);
    ratingEl.textContent = `⭐ ${f.average_rating || '5.0'} (${f.total_reviews} reviews)`;
    ordersEl.textContent = `${f.completed_orders || 0} Delivered`;
    expEl.textContent = `${f.experience_years || 5}+ Yrs Exp`;
    bioEl.textContent = f.farming_bio || 'Dedicated local agricultural grower committed to high quality produce.';

    if (data.reviews && data.reviews.length > 0) {
      reviewsList.innerHTML = data.reviews.map(r => `
        <div style="background:var(--bg-app); border:1px solid var(--border-light); border-radius:var(--radius-md); padding:10px 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="font-size:12.5px; color:var(--ink);">${escapeHtml(r.buyer_name)} <small style="color:var(--ink-muted);">(${escapeHtml(r.crop_name)})</small></strong>
            <span style="color:#F59E0B; font-size:12px;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          </div>
          <p style="margin:0; font-size:12px; color:var(--ink-soft); line-height:1.4;">${r.review_text ? escapeHtml(r.review_text) : 'Verified purchase rating.'}</p>
          <span style="font-size:10.5px; color:var(--ink-muted); display:block; margin-top:4px;">${formatDate(r.created_at)}</span>
        </div>
      `).join('');
    } else {
      reviewsList.innerHTML = '<div style="color:var(--ink-soft); font-size:12.5px; padding:10px;">No public reviews posted yet for this farmer.</div>';
    }
  } catch (err) {
    reviewsList.innerHTML = '<div style="color:var(--danger); font-size:12.5px;">Could not load profile.</div>';
  }
};

window.closeFarmerProfileModal = function() {
  const modal = document.getElementById('farmerProfileModal');
  if (modal) modal.style.display = 'none';
};

// Hash-based deep linking (e.g. #buyerWishlistView or #buyerMarketPricesView)
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(hash)) {
    const navBtn = document.querySelector(`[onclick*="${hash}"]`);
    const navId = navBtn ? navBtn.id : null;
    showSection(hash, hash, navId);
  }
});
