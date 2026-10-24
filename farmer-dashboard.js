// Farmer Dashboard Controller
const API_URL = window.API_URL || API_BASE_URL;
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || user.role !== 'farmer') {
  window.location.href = 'login.html';
}

document.getElementById('farmerName').textContent = user.name;

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

// Initialize UI widgets
initNotificationSystem(token);
initAIAssistant();

const LOW_STOCK_THRESHOLD = 5;
let farmerCropsMap = {};
let allFarmerOrders = [];
let activeOrderFilter = 'all';
let currentAddImage = null;
let editImageState = { changed: false, value: null };

// ============================================================================
// TAB NAVIGATION
// ============================================================================
const tabButtons = document.querySelectorAll('.dashboard-tabs .tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    btn.classList.add('active');
    const targetPane = document.getElementById(btn.dataset.tab);
    if (targetPane) {
      targetPane.classList.add('active');
      targetPane.style.display = 'block';
    }

    if (btn.dataset.tab === 'bidsTab') loadFarmerBids();
    if (btn.dataset.tab === 'groupBuyTab') loadFarmerGroupBuys();
    if (btn.dataset.tab === 'ordersTab') loadOrders();
  });
});

// Bidding checkbox toggle in Add Crop form
const biddingEnabledCheckbox = document.getElementById('biddingEnabled');
const minPriceRow = document.getElementById('minPriceRow');
if (biddingEnabledCheckbox && minPriceRow) {
  biddingEnabledCheckbox.addEventListener('change', () => {
    minPriceRow.style.display = biddingEnabledCheckbox.checked ? 'block' : 'none';
  });
}

// Bidding checkbox toggle in Edit Crop form
const editBiddingEnabledCheckbox = document.getElementById('editBiddingEnabled');
const editMinPriceRow = document.getElementById('editMinPriceRow');
if (editBiddingEnabledCheckbox && editMinPriceRow) {
  editBiddingEnabledCheckbox.addEventListener('change', () => {
    editMinPriceRow.style.display = editBiddingEnabledCheckbox.checked ? 'block' : 'none';
  });
}

// ============================================================================
// STATS SUMMARY
// ============================================================================
async function loadStats() {
  try {
    const [cropStatsRes, orderStatsRes] = await Promise.all([
      fetch(`${API_URL}/crops/stats/farmer/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/orders/stats/farmer/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    const cropStats = await cropStatsRes.json();
    const orderStats = await orderStatsRes.json();

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${cropStats.totalCrops || 0}</div>
        <div class="stat-label">Crops Listed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${orderStats.totalOrders || 0}</div>
        <div class="stat-label">Total Orders (${orderStats.pendingOrders || 0} pending)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${orderStats.totalKgSold || 0} kg</div>
        <div class="stat-label">Volume Sold</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">₹${Number(orderStats.revenue || 0).toFixed(0)}</div>
        <div class="stat-label">Delivered Revenue</div>
      </div>
    `;
  } catch (err) {
    console.error('loadStats error:', err);
  }
}

// ============================================================================
// CROP LISTINGS MANAGEMENT & IMAGE UPLOAD
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

// Edit Crop Image Controls
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
      cropList.innerHTML = '<div class="empty-state">No crops listed yet. Add your first harvest listing above!</div>';
      return;
    }

    crops.forEach(crop => {
      farmerCropsMap[crop.id] = crop;
      const lowStock = Number(crop.quantity_available) < LOW_STOCK_THRESHOLD;
      const hasImage = crop.image && crop.image.startsWith('data:image/jpeg;base64,');

      const imageHtml = hasImage
        ? `<img src="${crop.image}" alt="${escapeHtml(crop.crop_name)}" class="crop-card-img" loading="lazy">`
        : `<div class="crop-card-img placeholder"><span class="placeholder-icon">🌱</span><span>No photo</span></div>`;

      const harvestHtml = crop.harvest_date
        ? `<div class="crop-harvest-date">Harvested: ${formatDate(crop.harvest_date)}</div>`
        : '';

      const biddingBadge = crop.bidding_enabled
        ? `<span class="badge-negotiable" title="Minimum reserve: ₹${crop.min_bidding_price || crop.price_per_kg}">🤝 Bidding Active</span>`
        : '';

      cropList.innerHTML += `
        <div class="crop-card" id="cropCard-${crop.id}">
          ${imageHtml}
          <div class="crop-header-row">
            <strong>${escapeHtml(crop.crop_name)}</strong>
            <span class="category-badge">${escapeHtml(crop.category || 'Other')}</span>
          </div>
          ${lowStock ? '<span class="badge-low">Low stock</span>' : ''}
          ${biddingBadge}
          <div class="crop-meta">₹${escapeHtml(crop.price_per_kg)}/kg</div>
          ${harvestHtml}
          <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${stockPercent(crop.quantity_available)}%"></div></div>
          <p style="margin:0">${escapeHtml(crop.quantity_available)} kg in stock${crop.description ? ' · ' + escapeHtml(crop.description) : ''}</p>
          <div class="crop-actions">
            <button onclick="openEditModalById(${crop.id})">Edit</button>
            <button class="btn-secondary" onclick="openQrModal(${crop.id})">QR Code</button>
            <button class="danger" onclick="deleteCrop(${crop.id})">Delete</button>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error('loadCrops error:', err);
  }
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
      loadCrops();
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
function openEditModalById(cropId) {
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
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

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

async function deleteCrop(id) {
  if (!confirm('Are you sure you want to delete this crop listing? This action cannot be undone.')) return;
  try {
    const res = await fetch(`${API_URL}/crops/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Crop deleted', 'success');
      loadCrops();
      loadStats();
    } else {
      showToast(data.error || 'Failed to delete crop', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
}

// Search filter for farmer's own crops
const farmerSearchBox = document.getElementById('farmerSearchBox');
if (farmerSearchBox) {
  farmerSearchBox.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    Object.values(farmerCropsMap).forEach(crop => {
      const card = document.getElementById(`cropCard-${crop.id}`);
      if (card) {
        const matches = crop.crop_name.toLowerCase().includes(q) || (crop.category || '').toLowerCase().includes(q);
        card.style.display = matches ? 'flex' : 'none';
      }
    });
  });
}

// ============================================================================
// QR CODE TRACEABILITY MODAL
// ============================================================================
async function openQrModal(cropId) {
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
}

function closeQrModal() {
  document.getElementById('qrModal').style.display = 'none';
}

// ============================================================================
// ORDERS & FULFILLMENT
// ============================================================================
// Filter pills
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
    orderList.innerHTML = '<div class="empty-state">No orders matching this filter.</div>';
    return;
  }

  filtered.forEach(order => {
    orderList.innerHTML += `
      <div class="crop-card">
        <div class="crop-header-row">
          <strong>${escapeHtml(order.crop_name)}</strong>
          <span class="status-tag status-${escapeHtml(order.status)}">${escapeHtml(order.status)}</span>
        </div>
        <div class="crop-meta">${escapeHtml(order.quantity)} kg · Total: ₹${escapeHtml(order.total_price)}</div>
        <div class="crop-meta" style="margin-top: -6px;">Buyer: ${escapeHtml(order.buyer_name)} (${escapeHtml(order.buyer_location || 'India')})</div>

        <!-- Order Fulfillment Status Control -->
        <div style="margin: 10px 0;">
          <label style="font-size: 12px; font-weight:600; color:var(--ink-soft); display:block; margin-bottom:4px;">Update Fulfillment:</label>
          <select onchange="updateStatus(${order.id}, this.value)" ${['delivered', 'cancelled', 'rejected'].includes(order.status) ? 'disabled' : ''}>
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="accepted" ${order.status === 'accepted' ? 'selected' : ''}>Accepted</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped / In Transit</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            <option value="rejected" ${order.status === 'rejected' ? 'selected' : ''}>Reject Order</option>
          </select>
        </div>

        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn-secondary btn-small" onclick="openOrderTimeline(${order.id})">🕒 View Timeline</button>
          <button class="toggle-messages btn-small" onclick="toggleMessages(${order.id}, ${order.buyer_id})">💬 Message Buyer</button>
        </div>

        <div id="thread-${order.id}" style="display:none; margin-top: 12px;">
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

async function updateStatus(orderId, status) {
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
}

// Order Timeline
async function openOrderTimeline(orderId) {
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

      stepperEl.innerHTML = data.timeline.map((step, idx) => `
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
}

function closeTimelineModal() {
  document.getElementById('orderTimelineModal').style.display = 'none';
}

// Messaging
let chatIntervals = {};

async function toggleMessages(orderId) {
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
}

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

async function sendMessage(orderId, receiverId) {
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
      container.innerHTML = '<div class="empty-state">No price negotiations received yet. Make sure "Enable Buyer Price Negotiation" is checked on your crop listings!</div>';
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
          <div class="crop-meta">Buyer: <strong>${escapeHtml(bid.buyer_name)}</strong> (${escapeHtml(bid.buyer_location || 'India')})</div>
          <div class="crop-meta" style="margin-top:-6px;">
            Proposed Rate: <strong>₹${bid.offered_price_per_kg}/kg</strong> for <strong>${bid.quantity} kg</strong> (Total: ₹${totalOffer})
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

async function acceptBid(bidId, cropName) {
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
}

async function rejectBid(bidId) {
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
}

function openCounterModal(bidId, cropName, currentOffer, qty) {
  document.getElementById('counterBidId').value = bidId;
  document.getElementById('counterModalInfo').innerHTML = `Responding to offer for <strong>${cropName}</strong> (Buyer offered ₹${currentOffer}/kg for ${qty} kg)`;
  document.getElementById('counterPrice').value = '';
  document.getElementById('counterNote').value = '';
  document.getElementById('counterModal').style.display = 'flex';
}

function closeCounterModal() {
  document.getElementById('counterModal').style.display = 'none';
}

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
    select.innerHTML = '<option value="" disabled selected>Select an eligible crop listing</option>';
    Object.values(farmerCropsMap).forEach(crop => {
      select.innerHTML += `<option value="${crop.id}">${escapeHtml(crop.crop_name)} (${crop.quantity_available} kg in stock - Base ₹${crop.price_per_kg}/kg)</option>`;
    });
    document.getElementById('createGroupBuyModal').style.display = 'flex';
  });
}

function closeCreateGroupBuyModal() {
  document.getElementById('createGroupBuyModal').style.display = 'none';
}

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
      container.innerHTML = '<div class="empty-state">No group buying campaigns created yet. Click "+ Launch New Campaign" above to offer bulk co-op discounts!</div>';
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
          <div class="crop-meta">Crop: <strong>${escapeHtml(gb.crop_name)}</strong> · Discount Rate: <strong>₹${gb.discount_price_per_kg}/kg</strong> (Original: ₹${gb.original_price}/kg)</div>
          <div class="crop-meta" style="margin-top:-6px;">Cutoff Date: ${formatDate(gb.end_date)} · Participants: ${gb.participant_count || 0} buyers</div>

          <div style="margin: 12px 0 6px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; margin-bottom:4px;">
              <span>Volume Target Progress</span>
              <span>${gb.committed_quantity} / ${gb.target_quantity} kg (${pct}%)</span>
            </div>
            <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${pct}%; background:var(--leaf);"></div></div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Failed to load campaigns.</div>';
  }
}

// Initial Boot
loadStats();
loadCrops();
loadOrders();