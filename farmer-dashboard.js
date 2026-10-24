// TODO: Replace this URL with your live Render URL once deployed!
const API_URL = 'https://farm-direct-backend-p7zu.onrender.com/api';
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

const LOW_STOCK_THRESHOLD = 5;

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
        <div class="stat-label">Crops listed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${orderStats.totalOrders || 0}</div>
        <div class="stat-label">Total orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">₹${Number(orderStats.revenue || 0).toFixed(0)}</div>
        <div class="stat-label">Revenue (delivered)</div>
      </div>
    `;
  } catch (err) {
    console.error(err);
  }
}

let farmerCropsMap = {}; // Crop lookup by ID to avoid passing large data in inline HTML
let currentAddImage = null; // Base64 data URL for Add Crop form
let editImageState = { changed: false, value: null }; // State for Edit Crop modal

// Set up image input and preview for Add Crop form
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
      // Compress to max 640px wide JPEG at 0.7 quality
      const compressedDataUrl = await compressImage(file);
      currentAddImage = compressedDataUrl;
      cropPreviewImg.src = compressedDataUrl;
      cropImagePreview.style.display = 'flex';
    } catch (err) {
      console.error(err);
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

// Set up image input and preview for Edit Crop modal
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
      console.error(err);
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
  const res = await fetch(`${API_URL}/crops/farmer/${user.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const crops = await res.json();

  const cropList = document.getElementById('cropList');
  cropList.innerHTML = '';
  farmerCropsMap = {};

  if (!crops || crops.length === 0) {
    cropList.innerHTML = '<div class="empty-state">No crops listed yet. Add your first one above.</div>';
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
      ? `<div class="crop-harvest-date">Harvested: ${escapeHtml(crop.harvest_date.split('T')[0])}</div>`
      : '';

    cropList.innerHTML += `
      <div class="crop-card">
        ${imageHtml}
        <div class="crop-header-row">
          <strong>${escapeHtml(crop.crop_name)}</strong>
          <span class="category-badge">${escapeHtml(crop.category || 'Other')}</span>
        </div>
        ${lowStock ? '<span class="badge-low">Low stock</span>' : ''}
        <div class="crop-meta">₹${escapeHtml(crop.price_per_kg)}/kg</div>
        ${harvestHtml}
        <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${stockPercent(crop.quantity_available)}%"></div></div>
        <p style="margin:0">${escapeHtml(crop.quantity_available)} kg available${crop.description ? ' · ' + escapeHtml(crop.description) : ''}</p>
        <div class="crop-actions">
          <button onclick="openEditModalById(${crop.id})">Edit</button>
          <button class="danger" onclick="deleteCrop(${crop.id})">Delete</button>
        </div>
      </div>
    `;
  });
}

document.getElementById('cropForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const crop_name = document.getElementById('cropName').value.trim();
  const category = document.getElementById('cropCategory').value;
  const price_per_kg = document.getElementById('price').value;
  const quantity_available = document.getElementById('quantity').value;
  const harvest_date = document.getElementById('harvestDate').value || null;
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
        image: currentAddImage
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Crop added!', 'success');
      e.target.reset();
      currentAddImage = null;
      if (cropPreviewImg) cropPreviewImg.src = '';
      if (cropImagePreview) cropImagePreview.style.display = 'none';
      loadCrops();
      loadStats();
    } else {
      showToast(data.error || 'Failed to add crop', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Could not connect to server', 'error');
  } finally {
    setLoading(btn, false);
  }
});

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

  // Initialize edit image state
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

// Fallback for legacy callers
function openEditModal(crop) {
  if (crop && crop.id) openEditModalById(crop.id);
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
  const description = document.getElementById('editDescription').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  // Payload with basic fields
  const payload = {
    crop_name,
    price_per_kg,
    quantity_available,
    description,
    category,
    harvest_date
  };

  // Only include image if it was explicitly updated or removed
  if (editImageState.changed) {
    payload.image = editImageState.value; // new data URL or null to clear
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
      showToast('Crop updated!', 'success');
      closeEditModal();
      loadCrops();
      loadStats();
    } else {
      showToast(data.error || 'Failed to update crop', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Could not connect to server', 'error');
  } finally {
    setLoading(btn, false);
  }
});

async function deleteCrop(id) {
  if (!confirm('Delete this crop listing? This cannot be undone.')) return;
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
    console.error(err);
    showToast('Could not connect to server', 'error');
  }
}

async function loadOrders() {
  const res = await fetch(`${API_URL}/orders/farmer/${user.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const orders = await res.json();

  const orderList = document.getElementById('orderList');
  orderList.innerHTML = '';

  if (orders.length === 0) {
    orderList.innerHTML = '<div class="empty-state">No orders yet.</div>';
    return;
  }

  orders.forEach(order => {
    orderList.innerHTML += `
      <div class="crop-card">
        <strong>${escapeHtml(order.crop_name)}</strong>
        <!-- FIXED: Using order.quantity instead of order.quantity_ordered -->
        <div class="crop-meta">${escapeHtml(order.quantity)} kg · Buyer: ${escapeHtml(order.buyer_name)}</div>
        <span class="status-tag status-${escapeHtml(order.status)}">${escapeHtml(order.status)}</span>
        <select onchange="updateStatus(${order.id}, this.value)" ${order.status === 'cancelled' ? 'disabled' : ''}>
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="accepted" ${order.status === 'accepted' ? 'selected' : ''}>Accepted</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
        </select>
        <button class="toggle-messages" onclick="toggleMessages(${order.id}, ${order.buyer_id})">Message buyer</button>
        <div id="thread-${order.id}" style="display:none">
          <div class="message-thread" id="messages-${order.id}"></div>
          <div class="message-row">
            <input type="text" id="msgInput-${order.id}" placeholder="Type a message..." onkeypress="if(event.key === 'Enter') sendMessage(${order.id}, ${order.buyer_id})">
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
      showToast('Status updated!', 'success');
      loadOrders();
      loadStats();
    } else {
      showToast(data.error || 'Failed to update status', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Could not connect to server', 'error');
  }
}

let chatIntervals = {};

async function toggleMessages(orderId) {
  const thread = document.getElementById(`thread-${orderId}`);
  const isHidden = thread.style.display === 'none';
  thread.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    await loadMessages(orderId);
    chatIntervals[orderId] = setInterval(() => loadMessages(orderId), 2000);
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

  if (box.dataset.msgCount == messages.length) return;
  box.dataset.msgCount = messages.length;

  box.innerHTML = messages.length === 0
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
      body: JSON.stringify({ receiver_id: receiverId, order_id: orderId, message_text })
    });
    if (res.ok) {
      input.value = '';
      loadMessages(orderId);
    } else {
      showToast('Failed to send message', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Could not connect to server', 'error');
  }
}

loadStats();
loadCrops();
loadOrders();