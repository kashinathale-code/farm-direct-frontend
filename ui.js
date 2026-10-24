// Shared UI helpers: toasts + button loading states + notifications + AI assistant
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function setLoading(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  button.classList.toggle('loading', isLoading);
}

function stockPercent(available, cap = 20) {
  const pct = Math.min(100, (available / cap) * 100);
  return Math.max(6, pct); // never fully invisible
}

// Security: Escapes user text to prevent XSS attacks when inserting into innerHTML
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Client-side image compression: resizes photo to max width 640px and returns JPEG data URL (quality 0.7)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 640;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

// Format date helper (YYYY-MM-DD)
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

// ============================================================================
// PERSISTENT NOTIFICATION SYSTEM
// ============================================================================
let notificationInterval = null;

async function initNotificationSystem(token) {
  if (!token) return;

  const userMenu = document.querySelector('.user-menu');
  if (!userMenu) return;

  // Create notification bell and dropdown container if not present
  if (!document.getElementById('notificationContainer')) {
    const notifWrap = document.createElement('div');
    notifWrap.id = 'notificationContainer';
    notifWrap.className = 'notif-container';
    notifWrap.innerHTML = `
      <button id="notifBellBtn" class="notif-bell-btn" title="Notifications" aria-label="Notifications">
        🔔<span id="notifBadge" class="notif-badge" style="display:none">0</span>
      </button>
      <div id="notifDropdown" class="notif-dropdown" style="display:none">
        <div class="notif-header">
          <strong>Notifications</strong>
          <button id="notifMarkAllReadBtn" class="btn-text">Mark all read</button>
        </div>
        <div id="notifList" class="notif-list">
          <div class="notif-empty">Loading notifications...</div>
        </div>
      </div>
    `;
    userMenu.insertBefore(notifWrap, userMenu.firstChild);

    // Event listeners
    const bellBtn = document.getElementById('notifBellBtn');
    const dropdown = document.getElementById('notifDropdown');
    const markAllBtn = document.getElementById('notifMarkAllReadBtn');

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) loadNotificationsList(token);
    });

    document.addEventListener('click', (e) => {
      if (!notifWrap.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    markAllBtn.addEventListener('click', async () => {
      try {
        await fetch(`${window.API_URL || API_BASE_URL}/notifications/read-all`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        loadUnreadCount(token);
        loadNotificationsList(token);
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Load initial unread count
  loadUnreadCount(token);

  // Poll for updates every 25 seconds
  if (notificationInterval) clearInterval(notificationInterval);
  notificationInterval = setInterval(() => loadUnreadCount(token), 25000);
}

async function loadUnreadCount(token) {
  try {
    const res = await fetch(`${window.API_URL || API_BASE_URL}/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById('notifBadge');
    if (badge) {
      if (data.count > 0) {
        badge.textContent = data.count > 99 ? '99+' : data.count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    // Silent fail on polling errors
  }
}

async function loadNotificationsList(token) {
  const listEl = document.getElementById('notifList');
  if (!listEl) return;

  try {
    const res = await fetch(`${window.API_URL || API_BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const notifications = await res.json();

    if (!notifications || notifications.length === 0) {
      listEl.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
      return;
    }

    listEl.innerHTML = notifications.map(n => `
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
    listEl.innerHTML = '<div class="notif-empty">Error loading notifications.</div>';
  }
}

async function markNotifRead(id, link, token) {
  try {
    await fetch(`${window.API_URL || API_BASE_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadUnreadCount(token);
    if (link) window.location.href = link;
  } catch (err) {
    console.error(err);
  }
}

// ============================================================================
// AI-POWERED MARKETPLACE ASSISTANT WIDGET
// ============================================================================
function initAIAssistant() {
  if (document.getElementById('aiAssistantWidget')) return;

  const assistantWrap = document.createElement('div');
  assistantWrap.id = 'aiAssistantWidget';
  assistantWrap.className = 'ai-assistant-wrap';
  assistantWrap.innerHTML = `
    <!-- Floating toggle button -->
    <button id="aiToggleBtn" class="ai-toggle-btn" aria-label="Open Farm Direct AI Assistant">
      <span class="ai-toggle-icon">🌱</span>
      <span class="ai-toggle-text">Ask AI</span>
    </button>

    <!-- Chat Modal Window -->
    <div id="aiChatWindow" class="ai-chat-window" style="display:none">
      <div class="ai-chat-header">
        <div class="ai-header-title">
          <span class="ai-avatar">🚜</span>
          <div>
            <strong>Farm Direct Assistant</strong>
            <span class="ai-status"><span class="pulse-dot"></span> Live Market Intelligence</span>
          </div>
        </div>
        <button id="aiCloseBtn" class="ai-close-btn" aria-label="Close Assistant">✕</button>
      </div>

      <!-- Quick prompts -->
      <div class="ai-quick-prompts">
        <button class="ai-chip" onclick="sendQuickPrompt('Which crops fit a budget under ₹60/kg?')">Under ₹60/kg</button>
        <button class="ai-chip" onclick="sendQuickPrompt('Compare current vegetable prices')">Compare Vegetables</button>
        <button class="ai-chip" onclick="sendQuickPrompt('How does community group buying work?')">Group Buying</button>
        <button class="ai-chip" onclick="sendQuickPrompt('What is the status of my order?')">My Orders</button>
      </div>

      <!-- Message stream -->
      <div id="aiMessageStream" class="ai-msg-stream">
        <div class="ai-bubble assistant">
          Hello! I am your Farm Direct Assistant. I can help you find fresh crops by budget or category, compare farmer prices, explain direct trading, and track your orders. What can I help you find today?
        </div>
      </div>

      <!-- Input area -->
      <form id="aiChatForm" class="ai-chat-form">
        <input type="text" id="aiInput" placeholder="Ask about crops, prices, or orders..." maxlength="400" required autocomplete="off">
        <button type="submit" id="aiSendBtn" aria-label="Send Message">Send</button>
      </form>
    </div>
  `;

  document.body.appendChild(assistantWrap);

  const toggleBtn = document.getElementById('aiToggleBtn');
  const chatWindow = document.getElementById('aiChatWindow');
  const closeBtn = document.getElementById('aiCloseBtn');
  const chatForm = document.getElementById('aiChatForm');
  const inputEl = document.getElementById('aiInput');

  toggleBtn.addEventListener('click', () => {
    const isVisible = chatWindow.style.display === 'flex';
    chatWindow.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) inputEl.focus();
  });

  closeBtn.addEventListener('click', () => {
    chatWindow.style.display = 'none';
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = inputEl.value.trim();
    if (!query) return;
    inputEl.value = '';
    await handleAssistantQuery(query);
  });
}

window.sendQuickPrompt = function(promptText) {
  const inputEl = document.getElementById('aiInput');
  if (inputEl) {
    inputEl.value = promptText;
    document.getElementById('aiChatForm').dispatchEvent(new Event('submit'));
  }
};

async function handleAssistantQuery(query) {
  const stream = document.getElementById('aiMessageStream');
  const token = localStorage.getItem('token');

  // Add user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'ai-bubble user';
  userBubble.textContent = query;
  stream.appendChild(userBubble);

  // Add loading bubble
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'ai-bubble assistant loading';
  loadingBubble.innerHTML = '<span class="ai-typing"><span></span><span></span><span></span></span> Consulting live marketplace...';
  stream.appendChild(loadingBubble);
  stream.scrollTop = stream.scrollHeight;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${window.API_URL || API_BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: query })
    });

    const data = await res.json();
    loadingBubble.remove();

    const assistantBubble = document.createElement('div');
    assistantBubble.className = 'ai-bubble assistant';
    // Format bold and bullet points cleanly
    const formattedReply = (data.reply || 'No response available.')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/• /g, '<br>• ');

    assistantBubble.innerHTML = formattedReply;
    stream.appendChild(assistantBubble);
  } catch (err) {
    loadingBubble.remove();
    const errorBubble = document.createElement('div');
    errorBubble.className = 'ai-bubble assistant';
    errorBubble.textContent = 'Could not connect to the assistant server. Please check your network connection and try again.';
    stream.appendChild(errorBubble);
  }

  stream.scrollTop = stream.scrollHeight;
}