// Buyer Dashboard Controller
const API_URL = window.API_URL || API_BASE_URL;
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user || user.role !== 'buyer') {
  window.location.href = 'login.html';
}

document.getElementById('buyerName').textContent = user.name;

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

// Initialize UI widgets
initNotificationSystem(token);
initAIAssistant();

const LOW_STOCK_THRESHOLD = 5;
let allCrops = [];
let selectedCategory = 'All';

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

    if (btn.dataset.tab === 'ordersTab') loadOrders();
    if (btn.dataset.tab === 'bidsTab') loadBuyerBids();
    if (btn.dataset.tab === 'groupBuyTab') loadBuyerGroupBuys();
    if (btn.dataset.tab === 'marketTab') loadCrops();
  });
});

// ============================================================================
// MARKETPLACE CROPS & ADVANCED SEARCH / FILTERING
// ============================================================================
const categoryChips = document.querySelectorAll('.category-chip');
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
    const res = await fetch(`${API_URL}/crops`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    allCrops = await res.json();
    applyFilters();
  } catch (err) {
    console.error('loadCrops error:', err);
  }
}

function applyFilters() {
  const query = (document.getElementById('searchBox').value || '').toLowerCase().trim();
  const min = parseFloat(document.getElementById('minPrice').value) || 0;
  const max = parseFloat(document.getElementById('maxPrice').value) || Infinity;
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
    // Newest default (by ID desc)
    filtered.sort((a, b) => b.id - a.id);
  }

  const countEl = document.getElementById('cropCountText');
  if (countEl) countEl.textContent = `${filtered.length} crop${filtered.length === 1 ? '' : 's'} available`;

  renderCrops(filtered);
}

function renderCrops(crops) {
  const cropList = document.getElementById('cropList');
  cropList.innerHTML = '';

  if (!crops || crops.length === 0) {
    cropList.innerHTML = '<div class="empty-state">No crops match your filters. Try resetting search or price range.</div>';
    return;
  }

  crops.forEach(crop => {
    const lowStock = Number(crop.quantity_available) < LOW_STOCK_THRESHOLD;
    const hasImage = crop.image && crop.image.startsWith('data:image/jpeg;base64,');

    const imageHtml = hasImage
      ? `<img src="${crop.image}" alt="${escapeHtml(crop.crop_name)}" class="crop-card-img" loading="lazy">`
      : `<div class="crop-card-img placeholder"><span class="placeholder-icon">🌱</span><span>Fresh harvest</span></div>`;

    const harvestHtml = crop.harvest_date
      ? `<div class="crop-harvest-date">Harvested: ${formatDate(crop.harvest_date)}</div>`
      : '';

    const biddingTag = crop.bidding_enabled
      ? `<span class="badge-negotiable">🤝 Price Negotiable</span>`
      : '';

    const originLink = crop.traceability_code
      ? `<a href="traceability.html?code=${crop.traceability_code}" target="_blank" class="trace-chip" title="Inspect verified farm harvest origin">🛡️ Verified Origin</a>`
      : '';

    cropList.innerHTML += `
      <div class="crop-card">
        ${imageHtml}
        <div class="crop-header-row">
          <strong>${escapeHtml(crop.crop_name)}</strong>
          <span class="category-badge">${escapeHtml(crop.category || 'Other')}</span>
        </div>
        ${biddingTag}
        ${lowStock ? '<span class="badge-low">Low stock</span>' : ''}
        <div class="crop-meta">₹${escapeHtml(crop.price_per_kg)}/kg · Farmer: <strong>${escapeHtml(crop.farmer_name)}</strong> (${escapeHtml(crop.location || 'India')})</div>
        ${harvestHtml}
        <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${stockPercent(crop.quantity_available)}%"></div></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:13px; color:var(--ink-soft);">${escapeHtml(crop.quantity_available)} kg available</span>
          ${originLink}
        </div>
        <p style="margin:0 0 12px; font-size:14px;">${escapeHtml(crop.description || '')}</p>

        <!-- Order actions -->
        <div class="order-row">
          <input type="number" id="qty-${crop.id}" placeholder="Qty (kg)" min="1" max="${crop.quantity_available}" value="1">
          <button onclick="placeOrder(${crop.id})">Order now</button>
        </div>

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

document.getElementById('searchBox').addEventListener('input', applyFilters);
document.getElementById('minPrice').addEventListener('input', applyFilters);
document.getElementById('maxPrice').addEventListener('input', applyFilters);
document.getElementById('sortSelect')?.addEventListener('change', applyFilters);
document.getElementById('negotiableOnlyFilter')?.addEventListener('change', applyFilters);

// Place direct order
async function placeOrder(cropId) {
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
      showToast('Order placed successfully! Track its status below.', 'success');
      loadCrops();
      loadOrders();
    } else {
      showToast(data.error || 'Failed to place order', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ============================================================================
// BUYER ORDERS & STATUS TIMELINE
// ============================================================================
async function loadOrders() {
  try {
    const res = await fetch(`${API_URL}/orders/buyer/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orders = await res.json();

    const orderList = document.getElementById('orderList');
    orderList.innerHTML = '';

    if (!orders || orders.length === 0) {
      orderList.innerHTML = '<div class="empty-state">No orders placed yet. Browse the marketplace and order directly from local farmers!</div>';
      return;
    }

    orders.forEach(order => {
      orderList.innerHTML += `
        <div class="crop-card" style="margin-bottom:16px;">
          <div class="crop-header-row">
            <strong>${escapeHtml(order.crop_name)}</strong>
            <span class="status-tag status-${escapeHtml(order.status)}">${escapeHtml(order.status)}</span>
          </div>
          <div class="crop-meta">${escapeHtml(order.quantity)} kg · Total: <strong>₹${escapeHtml(order.total_price)}</strong> · Farmer: ${escapeHtml(order.farmer_name)} (${escapeHtml(order.farmer_location || 'India')})</div>
          <div class="crop-meta" style="margin-top:-6px; font-size:12px;">Placed on: ${formatDate(order.created_at)}</div>

          <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
            <button class="btn-secondary btn-small" onclick="openBuyerTimeline(${order.id})">🕒 View Timeline</button>
            ${order.status === 'pending' ? `<button class="danger btn-small" onclick="cancelOrder(${order.id})">Cancel Order</button>` : ''}
            <button class="toggle-messages btn-small" onclick="toggleMessages(${order.id}, ${order.farmer_id})">💬 Message Farmer</button>
          </div>

          <div id="thread-${order.id}" style="display:none; margin-top:12px;">
            <div class="message-thread" id="messages-${order.id}"></div>
            <div class="message-row">
              <input type="text" id="msgInput-${order.id}" placeholder="Type message to farmer..." onkeypress="if(event.key === 'Enter') sendMessage(${order.id}, ${order.farmer_id})">
              <button onclick="sendMessage(${order.id}, ${order.farmer_id})">Send</button>
            </div>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error('loadOrders error:', err);
  }
}

async function cancelOrder(orderId) {
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
    } else {
      showToast(data.error || 'Failed to cancel order', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
}

// Buyer Timeline Modal
async function openBuyerTimeline(orderId) {
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
}

function closeBuyerTimelineModal() {
  document.getElementById('buyerTimelineModal').style.display = 'none';
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
// PRICE NEGOTIATION & BIDDING (BUYER)
// ============================================================================
function openBidModal(crop) {
  document.getElementById('bidCropId').value = crop.id;
  document.getElementById('bidModalCropInfo').innerHTML = `
    Listing: <strong>${escapeHtml(crop.name)}</strong> · Listed at: <strong>₹${crop.price}/kg</strong>
    <br>Stock available: ${crop.stock} kg · Farmer: ${escapeHtml(crop.farmer)}
  `;
  document.getElementById('bidQty').value = '1';
  document.getElementById('bidQty').max = crop.stock;
  document.getElementById('bidPrice').value = '';
  document.getElementById('bidNote').value = '';
  document.getElementById('bidModal').style.display = 'flex';
}

function closeBidModal() {
  document.getElementById('bidModal').style.display = 'none';
}

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
      showToast('Offer submitted to farmer! You will be notified on response.', 'success');
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
      container.innerHTML = '<div class="empty-state">No price negotiations opened yet. Look for crops with "🤝 Price Negotiable" in the marketplace!</div>';
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
            <br><small style="color:var(--ink-soft)">Original price: ₹${bid.original_price}/kg · Latest move by: ${bid.current_by.toUpperCase()}</small>
          </div>

          ${isFarmerTurn ? `
            <div style="background:var(--wheat); padding:10px 14px; border-radius:8px; margin: 10px 0; font-size:13px;">
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

async function acceptBuyerBid(bidId, cropName) {
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
    } else {
      showToast(data.error || 'Failed to accept offer', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
}

async function rejectBuyerBid(bidId) {
  if (!confirm('Reject this offer and end negotiation?')) return;
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
}

function openBuyerCounterModal(bidId, cropName, currentOffer, qty) {
  document.getElementById('buyerCounterBidId').value = bidId;
  document.getElementById('buyerCounterInfo').innerHTML = `Responding to farmer's offer for <strong>${cropName}</strong> (₹${currentOffer}/kg for ${qty} kg)`;
  document.getElementById('buyerCounterPrice').value = '';
  document.getElementById('buyerCounterNote').value = '';
  document.getElementById('buyerCounterModal').style.display = 'flex';
}

function closeBuyerCounterModal() {
  document.getElementById('buyerCounterModal').style.display = 'none';
}

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
  container.innerHTML = '<div class="notif-empty">Loading active group buys...</div>';

  try {
    const res = await fetch(`${API_URL}/group-buys`);
    const campaigns = await res.json();

    if (!campaigns || campaigns.length === 0) {
      container.innerHTML = '<div class="empty-state">No active community group buying campaigns right now. Farmers launch them regularly for bulk season harvests!</div>';
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
            Group Rate: <strong style="color:var(--leaf-dark); font-size:16px;">₹${gb.discount_price_per_kg}/kg</strong> 
            <small style="color:var(--ink-soft); text-decoration:line-through;">(Standard: ₹${gb.original_price}/kg)</small>
          </div>

          <!-- Target Progress Bar -->
          <div style="margin: 14px 0 8px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
              <span>Volume Target Progress</span>
              <span>${gb.committed_quantity} / ${gb.target_quantity} kg (${pct}%)</span>
            </div>
            <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${pct}%; background:var(--leaf);"></div></div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--ink-soft); margin-top:4px;">
              <span>${remainingKg} kg needed to complete target</span>
              <span>Deadline: ${formatDate(gb.end_date)}</span>
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

function openJoinGbModal(gb) {
  document.getElementById('joinGbId').value = gb.id;
  document.getElementById('joinGbRate').value = gb.discount_price_per_kg;
  document.getElementById('joinGbInfo').innerHTML = `
    Campaign: <strong>${escapeHtml(gb.title)}</strong> (${escapeHtml(gb.crop_name)})<br>
    Wholesale Rate: <strong>₹${gb.discount_price_per_kg}/kg</strong> · Target left: ${gb.target_quantity - gb.committed_quantity} kg
  `;
  document.getElementById('joinGbQty').value = '5';
  updateJoinGbCalculatedTotal();
  document.getElementById('joinGbModal').style.display = 'flex';
}

function closeJoinGbModal() {
  document.getElementById('joinGbModal').style.display = 'none';
}

function updateJoinGbCalculatedTotal() {
  const qty = parseFloat(document.getElementById('joinGbQty').value) || 0;
  const rate = parseFloat(document.getElementById('joinGbRate').value) || 0;
  const total = (qty * rate).toFixed(2);
  const totalEl = document.getElementById('joinGbCalculatedTotal');
  if (totalEl) totalEl.textContent = `Estimated Order Total: ₹${total}`;
}

document.getElementById('joinGbQty').addEventListener('input', updateJoinGbCalculatedTotal);

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
    } else {
      showToast(data.error || 'Failed to join group buy', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
});

// Initial boot
loadCrops();
loadOrders();
loadBuyerBids();