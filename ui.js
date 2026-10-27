// ============================================================================
// FARM DIRECT — SHARED UI UTILITIES & INTERACTION HELPERS
// ============================================================================

// 1. Toast Notification System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Icon based on type
  const icon = type === 'success' 
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// 2. Button Loading State
function setLoading(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  button.classList.toggle('loading', isLoading);
}

// 3. Stock Percentage Helper
function stockPercent(available, cap = 20) {
  const pct = Math.min(100, (available / cap) * 100);
  return Math.max(6, pct); // never fully invisible
}

// 4. Security: Safe HTML escaping for user-supplied data
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 5. Client-side image compression (max width 640px, JPEG quality 0.7)
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

// 6. Date formatting helper (Indian Locale / International Standard)
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

// 7. Get Initials from name
function getInitials(name) {
  if (!name) return 'FD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================================
// SIDEBAR & TOP HEADER CONTROLLER
// ============================================================================
function initDashboardShell(user, activeNavId = 'navOverview') {
  const layout = document.querySelector('.dashboard-layout');
  const sidebar = document.getElementById('appSidebar');
  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const backdrop = document.getElementById('sidebarBackdrop');
  
  if (!layout || !sidebar) return;

  // Restore collapsed state from localStorage (desktop only)
  const isCollapsed = localStorage.getItem('fd_sidebar_collapsed') === 'true';
  if (isCollapsed && window.innerWidth > 1024) {
    layout.classList.add('sidebar-collapsed');
  }

  // Toggle Collapse on Desktop
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      layout.classList.toggle('sidebar-collapsed');
      const collapsedNow = layout.classList.contains('sidebar-collapsed');
      localStorage.setItem('fd_sidebar_collapsed', collapsedNow ? 'true' : 'false');
    });
  }

  // Mobile Drawer Toggle
  if (mobileMenuBtn && backdrop) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('drawer-open');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    const closeDrawer = () => {
      sidebar.classList.remove('drawer-open');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    };

    backdrop.addEventListener('click', closeDrawer);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('drawer-open')) {
        closeDrawer();
      }
    });

    // Close drawer when any nav item is clicked on mobile
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          closeDrawer();
        }
      });
    });
  }

  // Initialize User Profile in Header and Sidebar
  if (user) {
    const initials = getInitials(user.name);
    
    // Header
    const headerAvatar = document.getElementById('headerUserAvatar');
    const headerName = document.getElementById('headerUserName');
    const headerRole = document.getElementById('headerUserRole');
    if (headerAvatar) {
      headerAvatar.textContent = initials;
      headerAvatar.className = `user-avatar ${user.role || 'farmer'}`;
    }
    if (headerName) headerName.textContent = user.name;
    if (headerRole) headerRole.textContent = user.role;

    // Sidebar Footer
    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarRole = document.getElementById('sidebarUserRole');
    if (sidebarAvatar) {
      sidebarAvatar.textContent = initials;
      sidebarAvatar.className = `user-avatar ${user.role || 'farmer'}`;
    }
    if (sidebarName) sidebarName.textContent = user.name;
    if (sidebarRole) sidebarRole.textContent = user.role;

    // Dropdown details
    const dropdownFullName = document.getElementById('dropdownFullName');
    const dropdownEmail = document.getElementById('dropdownEmail');
    const dropdownRoleBadge = document.getElementById('dropdownRoleBadge');
    if (dropdownFullName) dropdownFullName.textContent = user.name;
    if (dropdownEmail) dropdownEmail.textContent = user.email || `${user.role}@farmdirect.in`;
    if (dropdownRoleBadge) dropdownRoleBadge.textContent = user.role.toUpperCase();
  }

  // Header User Dropdown Menu
  const userProfileBtn = document.getElementById('userProfileBtn');
  const userDropdown = document.getElementById('userProfileDropdown');
  if (userProfileBtn && userDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = userProfileBtn.getAttribute('aria-expanded') === 'true';
      userProfileBtn.setAttribute('aria-expanded', !isExpanded);
      userDropdown.classList.toggle('show', !isExpanded);
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target) && !userProfileBtn.contains(e.target)) {
        userDropdown.classList.remove('show');
        userProfileBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && userDropdown.classList.contains('show')) {
        userDropdown.classList.remove('show');
        userProfileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Set active nav item
  if (activeNavId) {
    const activeEl = document.getElementById(activeNavId);
    if (activeEl) {
      document.querySelectorAll('.app-sidebar .nav-item').forEach(i => i.classList.remove('active'));
      activeEl.classList.add('active');
    }
  }
}

// Helper to switch view tabs in dashboard
function switchDashboardView(viewId, breadcrumbTitle, activeNavBtnId) {
  // Hide all views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });

  // Show target view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update breadcrumb
  const breadcrumbEl = document.getElementById('headerPageTitle');
  if (breadcrumbEl && breadcrumbTitle) {
    breadcrumbEl.textContent = breadcrumbTitle;
  }

  // Update active sidebar state
  if (activeNavBtnId) {
    document.querySelectorAll('.app-sidebar .nav-item').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(activeNavBtnId);
    if (activeBtn) activeBtn.classList.add('active');
  }

  // Scroll main content to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// PERSISTENT NOTIFICATION SYSTEM
// ============================================================================
let notificationInterval = null;

async function initNotificationSystem(token) {
  if (!token) return;

  const bellBtn = document.getElementById('notifBellBtn');
  const dropdown = document.getElementById('notifDropdown');
  const markAllBtn = document.getElementById('notifMarkAllReadBtn');
  const notifContainer = document.getElementById('notificationContainer');

  if (bellBtn && dropdown) {
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.classList.contains('show');
      dropdown.classList.toggle('show', !isVisible);
      if (!isVisible) loadNotificationsList(token);
    });

    document.addEventListener('click', (e) => {
      if (notifContainer && !notifContainer.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });

    if (markAllBtn) {
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
    const unreadPill = document.getElementById('notifUnreadPill');
    
    if (badge) {
      if (data.count > 0) {
        badge.textContent = data.count > 99 ? '99+' : data.count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (unreadPill) {
      unreadPill.textContent = `${data.count} new`;
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12A10 10 0 0 1 12 2z"/>
        <path d="M7 13c3 0 7-2 9-8-2 6-4 9-9 9z"/>
        <path d="M12 22V12"/>
      </svg>
      <span>Ask AI</span>
    </button>

    <!-- Chat Modal Window -->
    <div id="aiChatWindow" class="ai-chat-window" style="display:none">
      <div class="ai-chat-header">
        <div class="ai-header-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12A10 10 0 0 1 12 2z"/>
            <path d="M7 13c3 0 7-2 9-8-2 6-4 9-9 9z"/>
            <path d="M12 22V12"/>
          </svg>
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
        <button class="ai-chip" onclick="sendQuickPrompt('Compare current vegetable prices')">Compare Produce</button>
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
    await handleAssistantQuery(query, 'aiMessageStream');
  });
}

window.sendQuickPrompt = function(promptText) {
  const inputEl = document.getElementById('aiInput') || document.getElementById('dedicatedAiInput');
  const formEl = document.getElementById('aiChatForm') || document.getElementById('dedicatedAiForm');
  if (inputEl && formEl) {
    inputEl.value = promptText;
    formEl.dispatchEvent(new Event('submit'));
  }
};

async function handleAssistantQuery(query, streamElementId = 'aiMessageStream') {
  const stream = document.getElementById(streamElementId);
  if (!stream) return;
  const token = localStorage.getItem('token');

  // Add user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'ai-bubble user';
  userBubble.textContent = query;
  stream.appendChild(userBubble);

  // Add loading bubble
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'ai-bubble assistant loading';
  loadingBubble.innerHTML = '<span class="pulse-dot"></span> Consulting live marketplace...';
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
    const formattedReply = (data.reply || 'No response available.')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/• /g, '<br>• ');

    assistantBubble.innerHTML = formattedReply;
    stream.appendChild(assistantBubble);
  } catch (err) {
    loadingBubble.remove();
    const errorBubble = document.createElement('div');
    errorBubble.className = 'ai-bubble assistant';
    errorBubble.textContent = 'Could not connect to the assistant server. Please check your connection and try again.';
    stream.appendChild(errorBubble);
  }

  stream.scrollTop = stream.scrollHeight;
}