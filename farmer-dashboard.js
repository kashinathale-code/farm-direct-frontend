const API_URL = 'https://rare-encouragement-production-a351.up.railway.app/api';
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

async function loadCrops() {
  const res = await fetch(`${API_URL}/crops/farmer/${user.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const crops = await res.json();

  const cropList = document.getElementById('cropList');
  cropList.innerHTML = '';

  if (crops.length === 0) {
    cropList.innerHTML = '<div class="empty-state">No crops listed yet. Add your first one above.</div>';
    return;
  }

  crops.forEach(crop => {
    const lowStock = Number(crop.quantity_available) < LOW_STOCK_THRESHOLD;
    cropList.innerHTML += `
      <div class="crop-card">
        <strong>${crop.crop_name}</strong>${lowStock ? '<span class="badge-low">Low stock</span>' : ''}
        <div class="crop-meta">₹${crop.price_per_kg}/kg</div>
        <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${stockPercent(crop.quantity_available)}%"></div></div>
        <p style="margin:0">${crop.quantity_available} kg available${crop.description ? ' · ' + crop.description : ''}</p>
        <div class="crop-actions">
          <button onclick='openEditModal(${JSON.stringify(crop)})'>Edit</button>
          <button class="danger" onclick="deleteCrop(${crop.id})">Delete</button>
        </div>
      </div>
    `;
  });
}

document.getElementById('cropForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const crop_name = document.getElementById('cropName').value;
  const price_per_kg = document.getElementById('price').value;
  const quantity_available = document.getElementById('quantity').value;
  const description = document.getElementById('description').value;
  const btn = e.target.querySelector('button');

  setLoading(btn, true);
  try {
    const res = await fetch(`${API_URL}/crops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ crop_name, price_per_kg, quantity_available, description })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Crop added!', 'success');
      e.target.reset();
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

function openEditModal(crop) {
  document.getElementById('editCropId').value = crop.id;
  document.getElementById('editCropName').value = crop.crop_name;
  document.getElementById('editPrice').value = crop.price_per_kg;
  document.getElementById('editQuantity').value = crop.quantity_available;
  document.getElementById('editDescription').value = crop.description || '';
  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

document.getElementById('editCropForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editCropId').value;
  const crop_name = document.getElementById('editCropName').value;
  const price_per_kg = document.getElementById('editPrice').value;
  const quantity_available = document.getElementById('editQuantity').value;
  const description = document.getElementById('editDescription').value;
  const btn = e.target.querySelector('button[type="submit"]');

  setLoading(btn, true);
  try {
    const res = await fetch(`${API_URL}/crops/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ crop_name, price_per_kg, quantity_available, description })
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
        <strong>${order.crop_name}</strong>
        <div class="crop-meta">${order.quantity_ordered} kg · Buyer: ${order.buyer_name}</div>
        <span class="status-tag status-${order.status}">${order.status}</span>
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
          <div class="sender">${m.sender_name}</div>
          ${m.message_text}
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