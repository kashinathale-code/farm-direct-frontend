const API_URL = 'https://rare-encouragement-production-a351.up.railway.app/api';
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

const LOW_STOCK_THRESHOLD = 5;
let allCrops = [];

async function loadCrops() {
  const res = await fetch(`${API_URL}/crops`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  allCrops = await res.json();
  applyFilters();
}

function applyFilters() {
  const query = document.getElementById('searchBox').value.toLowerCase();
  const min = parseFloat(document.getElementById('minPrice').value) || 0;
  const max = parseFloat(document.getElementById('maxPrice').value) || Infinity;

  const filtered = allCrops.filter(crop =>
    crop.crop_name.toLowerCase().includes(query) &&
    Number(crop.price_per_kg) >= min &&
    Number(crop.price_per_kg) <= max
  );
  renderCrops(filtered);
}

function renderCrops(crops) {
  const cropList = document.getElementById('cropList');
  cropList.innerHTML = '';

  if (crops.length === 0) {
    cropList.innerHTML = '<div class="empty-state">No crops match your filters.</div>';
    return;
  }

  crops.forEach(crop => {
    const lowStock = Number(crop.quantity_available) < LOW_STOCK_THRESHOLD;
    cropList.innerHTML += `
      <div class="crop-card">
        <strong>${crop.crop_name}</strong>${lowStock ? '<span class="badge-low">Low stock</span>' : ''}
        <div class="crop-meta">₹${crop.price_per_kg}/kg · Farmer: ${crop.farmer_name} (${crop.location || 'Location not set'})</div>
        <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${stockPercent(crop.quantity_available)}%"></div></div>
        <p style="margin:0 0 10px">${crop.description || ''}</p>
        <div class="order-row">
          <input type="number" id="qty-${crop.id}" placeholder="Qty (kg)" min="1">
          <button onclick="placeOrder(${crop.id})">Order now</button>
        </div>
      </div>
    `;
  });
}

document.getElementById('searchBox').addEventListener('input', applyFilters);
document.getElementById('minPrice').addEventListener('input', applyFilters);
document.getElementById('maxPrice').addEventListener('input', applyFilters);

async function placeOrder(cropId) {
  const quantityInput = document.getElementById(`qty-${cropId}`);
  const quantity_ordered = quantityInput.value;

  if (!quantity_ordered || quantity_ordered <= 0) {
    showToast('Please enter a valid quantity', 'error');
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
      showToast('Order placed successfully!', 'success');
      quantityInput.value = '';
      loadOrders();
    } else {
      showToast(data.error || 'Failed to place order', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Could not connect to server', 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function loadOrders() {
  const res = await fetch(`${API_URL}/orders/buyer/${user.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const orders = await res.json();

  const orderList = document.getElementById('orderList');
  orderList.innerHTML = '';

  if (orders.length === 0) {
    orderList.innerHTML = '<div class="empty-state">No orders placed yet.</div>';
    return;
  }

  orders.forEach(order => {
    orderList.innerHTML += `
      <div class="crop-card">
        <strong>${order.crop_name}</strong>
        <div class="crop-meta">${order.quantity_ordered} kg · ₹${order.price_per_kg}/kg · Farmer: ${order.farmer_name}</div>
        <span class="status-tag status-${order.status}">${order.status}</span>
        ${order.status === 'pending' ? `<button class="danger" style="width:auto;padding:6px 14px;font-size:13px;margin-left:8px" onclick="cancelOrder(${order.id})">Cancel</button>` : ''}
        <button class="toggle-messages" onclick="toggleMessages(${order.id})">Message farmer</button>
        <div id="thread-${order.id}" style="display:none">
          <div class="message-thread" id="messages-${order.id}"></div>
          <div class="message-row">
            <input type="text" id="msgInput-${order.id}" placeholder="Type a message..." onkeypress="if(event.key === 'Enter') sendMessage(${order.id}, ${order.farmer_id})">
            <button onclick="sendMessage(${order.id}, ${order.farmer_id})">Send</button>
          </div>
        </div>
      </div>
    `;
  });
}

async function cancelOrder(orderId) {
  if (!confirm('Cancel this order?')) return;
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
    } else {
      showToast(data.error || 'Failed to cancel order', 'error');
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

loadCrops();
loadOrders();