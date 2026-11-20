// ============================================================================
// FARM DIRECT — PLATFORM ADMINISTRATION DASHBOARD CONTROLLER
// ============================================================================

(function () {
  'use strict';

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // Verify Admin Authentication
  if (!token || !user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    alert('Access restricted. Please log in with an administrator account.');
    localStorage.clear();
    window.location.href = 'admin-login.html';
    return;
  }

  const BASE_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.API_URL || 'http://localhost:5000/api');

  // UI Setup
  const adminUserNameEl = document.getElementById('adminUserName');
  if (adminUserNameEl) adminUserNameEl.textContent = user.name || 'Admin';

  const adminRoleBadgeEl = document.getElementById('adminRoleBadge');
  if (adminRoleBadgeEl) {
    adminRoleBadgeEl.textContent = (user.role || 'ADMIN').toUpperCase();
    if (user.role === 'super_admin') {
      adminRoleBadgeEl.className = 'admin-pill badge-super';
    }
  }

  // Sidebar Mobile Toggle
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const appSidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (mobileBtn && appSidebar && backdrop) {
    mobileBtn.addEventListener('click', () => {
      appSidebar.classList.toggle('open');
      backdrop.classList.toggle('active');
    });
    backdrop.addEventListener('click', () => {
      appSidebar.classList.remove('open');
      backdrop.classList.remove('active');
    });
  }

  // Sidebar Collapse Button (Desktop)
  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const layout = document.querySelector('.dashboard-layout');
  if (collapseBtn && layout) {
    collapseBtn.addEventListener('click', () => {
      layout.classList.toggle('sidebar-collapsed');
    });
  }

  // Section Switcher
  window.showAdminSection = function (viewId, title, navId) {
    document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));

    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const targetNav = document.getElementById(navId);
    if (targetNav) targetNav.classList.add('active');

    const titleEl = document.getElementById('adminPageTitle');
    const breadcrumbEl = document.getElementById('adminBreadcrumb');
    if (titleEl) titleEl.textContent = title;
    if (breadcrumbEl) breadcrumbEl.textContent = title;

    if (appSidebar && backdrop) {
      appSidebar.classList.remove('open');
      backdrop.classList.remove('active');
    }

    // Trigger Section Loaders
    if (viewId === 'adminOverviewView') {
      loadAdminMetrics();
    } else if (viewId === 'adminUsersView') {
      loadAdminUsers();
    } else if (viewId === 'adminCropsView') {
      loadAdminCrops();
    } else if (viewId === 'adminOrdersView') {
      loadAdminOrders();
    } else if (viewId === 'adminLogisticsView') {
      loadAdminFleet();
    } else if (viewId === 'adminCertificatesView') {
      loadAdminCertificates();
    } else if (viewId === 'adminComplaintsView') {
      loadAdminComplaints();
    } else if (viewId === 'adminAuditLogsView') {
      loadAdminAuditLogs();
    } else if (viewId === 'adminSettingsView') {
      loadAdminSettings();
    }
  };

  window.handleAdminLogout = function () {
    if (confirm('Log out of platform administration?')) {
      localStorage.clear();
      window.location.href = 'admin-login.html';
    }
  };

  // Helper for Auth Fetch
  async function adminFetch(endpoint, options = {}) {
    const headers = options.headers || {};
    headers['Authorization'] = `Bearer ${token}`;
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  }

  // ============================================================================
  // 1. OVERVIEW METRICS
  // ============================================================================
  async function loadAdminMetrics() {
    try {
      const res = await adminFetch('/admin/metrics');
      if (!res.ok) throw new Error('Failed to load platform metrics');
      const data = await res.json();

      document.getElementById('metricTotalUsers').textContent = data.users.total || 0;
      document.getElementById('metricUserBreakdown').textContent = 
        `${data.users.farmers || 0} Farmers · ${data.users.buyers || 0} Buyers`;
      
      document.getElementById('metricTotalDrivers').textContent = data.users.delivery_partners || 0;
      document.getElementById('metricActiveCrops').textContent = data.crops.active || 0;
      document.getElementById('metricFlaggedCrops').textContent = `${data.crops.flagged || 0} Flagged`;

      document.getElementById('metricTotalOrders').textContent = data.orders.total || 0;
      document.getElementById('metricCompletedOrders').textContent = `${data.orders.delivered || 0} Delivered`;

      document.getElementById('metricOpenComplaints').textContent = data.complaints.open || 0;
      document.getElementById('metricTotalGMV').textContent = `₹${Number(data.orders.total_gmv || 0).toLocaleString('en-IN')}`;

      // Render recent audit logs preview
      const tbody = document.querySelector('#recentAuditTable tbody');
      if (tbody && data.recent_audit_logs) {
        if (data.recent_audit_logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px;">No audit events recorded yet.</td></tr>';
        } else {
          tbody.innerHTML = data.recent_audit_logs.map(log => `
            <tr>
              <td>${new Date(log.created_at).toLocaleString('en-IN')}</td>
              <td><span class="audit-code">${escapeHtml(log.action)}</span></td>
              <td>${escapeHtml(log.resource_type)} ${log.resource_id ? '#' + log.resource_id : ''}</td>
              <td>${escapeHtml(log.user_name || 'System')} (${escapeHtml(log.user_role || 'system')})</td>
              <td><code>${escapeHtml(log.ip_address || '—')}</code></td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Error loading admin metrics:', err);
      showToast('Could not load overview metrics', 'error');
    }
  }

  // ============================================================================
  // 2. USER MANAGEMENT
  // ============================================================================
  let searchDebounceTimer = null;
  window.debounceAdminUsers = function () {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(loadAdminUsers, 300);
  };

  async function loadAdminUsers() {
    const search = (document.getElementById('adminUserSearch')?.value || '').trim();
    const role = document.getElementById('adminUserRoleFilter')?.value || '';
    const status = document.getElementById('adminUserStatusFilter')?.value || '';

    const tbody = document.querySelector('#adminUsersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Fetching users...</td></tr>';

    try {
      const queryParams = new URLSearchParams({ search, role, status, limit: 50 });
      const res = await adminFetch(`/admin/users?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      const users = data.users || [];

      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No matching users found.</td></tr>';
        return;
      }

      tbody.innerHTML = users.map(u => {
        const isSuspended = u.status === 'suspended';
        const isFarmer = u.role === 'farmer';
        return `
          <tr>
            <td>#${u.id}</td>
            <td>
              <strong>${escapeHtml(u.name)}</strong><br>
              <span style="font-size:0.8rem; color:var(--ink-soft);">${escapeHtml(u.email)}</span>
            </td>
            <td><span class="status-badge status-${u.role}">${escapeHtml(u.role)}</span></td>
            <td>
              <span class="status-badge ${isSuspended ? 'status-cancelled' : 'status-delivered'}">
                ${escapeHtml(u.status || 'active')}
              </span>
            </td>
            <td>${escapeHtml(u.location || '—')}</td>
            <td>
              ${isFarmer ? (u.is_verified_farmer 
                ? '<span style="color:#15803D; font-weight:600;">✓ Verified</span>' 
                : '<span style="color:#B45309;">Unverified</span>') : '—'}
            </td>
            <td>${u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}</td>
            <td>
              <div style="display:flex; gap:6px;">
                ${isFarmer ? `
                  <button class="btn-secondary btn-small" onclick="toggleFarmerVerification(${u.id}, ${!!u.is_verified_farmer})">
                    ${u.is_verified_farmer ? 'Revoke Verif' : 'Verify'}
                  </button>
                ` : ''}
                <button class="btn-${isSuspended ? 'primary' : 'secondary'} btn-small" onclick="toggleUserStatus(${u.id}, '${u.status || 'active'}')">
                  ${isSuspended ? 'Activate' : 'Suspend'}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#DC2626; padding:20px;">Failed to load users.</td></tr>';
    }
  }

  window.toggleFarmerVerification = async function (userId, isCurrentlyVerified) {
    const action = isCurrentlyVerified ? 'revoke verification for' : 'verify';
    if (!confirm(`Are you sure you want to ${action} this farmer?`)) return;

    try {
      const res = await adminFetch(`/admin/users/${userId}/verify-farmer`, {
        method: 'PUT',
        body: JSON.stringify({ is_verified: !isCurrentlyVerified })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Farmer verification status updated', 'success');
        loadAdminUsers();
      } else {
        showToast(data.error || 'Failed to update farmer', 'error');
      }
    } catch (err) {
      showToast('Server connection error', 'error');
    }
  };

  window.toggleUserStatus = async function (userId, currentStatus) {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const reason = prompt(`Enter reason for marking user account ${nextStatus}:`);
    if (!reason) return;

    try {
      const res = await adminFetch(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus, reason })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'User status updated', 'success');
        loadAdminUsers();
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Server connection error', 'error');
    }
  };

  // ============================================================================
  // 3. CREATE DELIVERY PARTNER
  // ============================================================================
  const createDriverForm = document.getElementById('createDriverForm');
  if (createDriverForm) {
    createDriverForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnCreateDriver');
      setLoading(btn, true);

      const payload = {
        name: document.getElementById('driverName').value.trim(),
        email: document.getElementById('driverRegEmail').value.trim(),
        phone: document.getElementById('driverPhone').value.trim(),
        password: document.getElementById('driverRegPassword').value,
        vehicle_type: document.getElementById('driverVehicleType').value,
        vehicle_number: document.getElementById('driverVehicleNumber').value.trim(),
        driving_license_number: document.getElementById('driverLicenseNumber').value.trim(),
        service_city: document.getElementById('driverServiceCity').value.trim()
      };

      try {
        const res = await adminFetch('/admin/create-delivery-partner', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Delivery Partner account created successfully!', 'success');
          createDriverForm.reset();
          showAdminSection('adminLogisticsView', 'Delivery Fleet', 'navAdminLogistics');
        } else {
          showToast(data.error || 'Creation failed', 'error');
        }
      } catch (err) {
        showToast('Connection failed', 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // ============================================================================
  // 4. CROP MODERATION
  // ============================================================================
  async function loadAdminCrops() {
    const status = document.getElementById('adminCropStatusFilter')?.value || '';
    const tbody = document.querySelector('#adminCropsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Fetching crops...</td></tr>';

    try {
      const res = await adminFetch(`/admin/crops?status=${status}`);
      if (!res.ok) throw new Error('Failed to fetch crops');
      const data = await res.json();
      const crops = data.crops || [];

      if (crops.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No crops listed.</td></tr>';
        return;
      }

      tbody.innerHTML = crops.map(c => `
        <tr>
          <td>#${c.id}</td>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>${escapeHtml(c.farmer_name || 'Farmer #' + c.farmer_id)}</td>
          <td><span class="category-badge">${escapeHtml(c.category || 'Produce')}</span></td>
          <td>₹${c.price} / ${escapeHtml(c.unit || 'kg')}</td>
          <td>${c.quantity} ${escapeHtml(c.unit || 'kg')}</td>
          <td>
            <span class="status-badge ${c.moderation_status === 'suspended' ? 'status-cancelled' : c.moderation_status === 'flagged' ? 'status-pending' : 'status-delivered'}">
              ${escapeHtml(c.moderation_status || 'active')}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              ${c.moderation_status !== 'active' ? `
                <button class="btn-primary btn-small" onclick="updateCropModeration(${c.id}, 'active')">Approve</button>
              ` : ''}
              ${c.moderation_status !== 'flagged' ? `
                <button class="btn-secondary btn-small" onclick="updateCropModeration(${c.id}, 'flagged')">Flag</button>
              ` : ''}
              ${c.moderation_status !== 'suspended' ? `
                <button class="btn-secondary btn-small" style="color:#DC2626;" onclick="updateCropModeration(${c.id}, 'suspended')">Suspend</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#DC2626; padding:20px;">Failed to load crops.</td></tr>';
    }
  }

  window.updateCropModeration = async function (cropId, status) {
    const reason = prompt(`Enter reason for setting crop moderation status to ${status}:`, status === 'active' ? 'Reviewed and approved' : 'Inspection required');
    if (!reason) return;

    try {
      const res = await adminFetch(`/admin/crops/${cropId}/moderation`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Crop moderation updated', 'success');
        loadAdminCrops();
      } else {
        showToast(data.error || 'Failed to moderate crop', 'error');
      }
    } catch (err) {
      showToast('Connection failed', 'error');
    }
  };

  // ============================================================================
  // 5. ORDERS & OVERRIDE
  // ============================================================================
  async function loadAdminOrders() {
    const status = document.getElementById('adminOrderStatusFilter')?.value || '';
    const tbody = document.querySelector('#adminOrdersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Fetching orders...</td></tr>';

    try {
      const res = await adminFetch(`/admin/orders?status=${status}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      const orders = data.orders || [];

      if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No orders found.</td></tr>';
        return;
      }

      tbody.innerHTML = orders.map(o => `
        <tr>
          <td><strong>#ORD-${o.id}</strong></td>
          <td>${escapeHtml(o.buyer_name || 'Buyer #' + o.buyer_id)}</td>
          <td>${escapeHtml(o.farmer_name || 'Farmer #' + o.farmer_id)}</td>
          <td>${escapeHtml(o.crop_name || 'Crop')} (${o.quantity} kg)</td>
          <td><strong>₹${Number(o.total_price || 0).toLocaleString('en-IN')}</strong></td>
          <td><span class="status-badge status-${o.status}">${escapeHtml(o.status)}</span></td>
          <td>${o.delivery_partner_name ? escapeHtml(o.delivery_partner_name) : '<em style="color:#8A9A90;">Unassigned</em>'}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn-secondary btn-small" onclick="openOverrideModal(${o.id}, '${o.status}')">Override</button>
              ${!o.delivery_partner_name && o.status !== 'cancelled' && o.status !== 'delivered' ? `
                <button class="btn-primary btn-small" onclick="openAssignDriverModal(${o.id})">Assign Driver</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#DC2626; padding:20px;">Failed to load orders.</td></tr>';
    }
  }

  window.openOverrideModal = function (orderId, currentStatus) {
    document.getElementById('overrideOrderId').value = orderId;
    document.getElementById('overrideNewStatus').value = currentStatus;
    document.getElementById('overrideReason').value = '';
    const modal = document.getElementById('orderOverrideModal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeOverrideModal = function () {
    const modal = document.getElementById('orderOverrideModal');
    if (modal) modal.style.display = 'none';
  };

  window.submitOrderOverride = async function () {
    const orderId = document.getElementById('overrideOrderId').value;
    const newStatus = document.getElementById('overrideNewStatus').value;
    const reason = document.getElementById('overrideReason').value.trim();

    if (!reason) {
      alert('Administrative justification is required for order status overrides.');
      return;
    }

    const btn = document.getElementById('btnSubmitOverride');
    setLoading(btn, true);

    try {
      const res = await adminFetch(`/admin/orders/${orderId}/override`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, reason })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Order status overridden successfully and logged to audit trail.', 'success');
        closeOverrideModal();
        loadAdminOrders();
      } else {
        showToast(data.error || 'Override failed', 'error');
      }
    } catch (err) {
      showToast('Connection failed', 'error');
    } finally {
      setLoading(btn, false);
    }
  };

  // Driver Assignment
  window.openAssignDriverModal = async function (orderId) {
    document.getElementById('assignDriverOrderId').value = orderId;
    const select = document.getElementById('selectDeliveryPartner');
    select.innerHTML = '<option value="">Loading partners...</option>';
    const modal = document.getElementById('assignDriverModal');
    if (modal) modal.style.display = 'flex';

    try {
      const res = await adminFetch('/admin/users?role=delivery_partner&status=active');
      const data = await res.json();
      const partners = data.users || [];
      if (partners.length === 0) {
        select.innerHTML = '<option value="">No active delivery partners registered</option>';
      } else {
        select.innerHTML = '<option value="">Select a delivery partner</option>' + partners.map(p => `
          <option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.location || 'Fleet')})</option>
        `).join('');
      }
    } catch (err) {
      select.innerHTML = '<option value="">Failed to load partners</option>';
    }
  };

  window.closeAssignDriverModal = function () {
    const modal = document.getElementById('assignDriverModal');
    if (modal) modal.style.display = 'none';
  };

  window.submitDriverAssignment = async function () {
    const orderId = document.getElementById('assignDriverOrderId').value;
    const partnerId = document.getElementById('selectDeliveryPartner').value;
    if (!partnerId) {
      alert('Please choose a delivery partner.');
      return;
    }

    try {
      const res = await adminFetch('/delivery/assign', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, delivery_partner_id: partnerId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Delivery partner assigned to shipment!', 'success');
        closeAssignDriverModal();
        loadAdminOrders();
      } else {
        showToast(data.error || 'Assignment failed', 'error');
      }
    } catch (err) {
      showToast('Connection failed', 'error');
    }
  };

  // ============================================================================
  // 6. DELIVERY FLEET
  // ============================================================================
  async function loadAdminFleet() {
    const tbody = document.querySelector('#adminFleetTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Fetching fleet partners...</td></tr>';

    try {
      const res = await adminFetch('/admin/users?role=delivery_partner');
      const data = await res.json();
      const drivers = data.users || [];

      if (drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No delivery partners created yet. Click "+ Add Delivery Partner" above.</td></tr>';
        return;
      }

      tbody.innerHTML = drivers.map(d => `
        <tr>
          <td>#${d.id}</td>
          <td><strong>${escapeHtml(d.name)}</strong></td>
          <td>${escapeHtml(d.phone || '—')}</td>
          <td>${escapeHtml(d.vehicle_type || 'Vehicle')} (${escapeHtml(d.vehicle_number || '—')})</td>
          <td><code>${escapeHtml(d.driving_license_number || '—')}</code></td>
          <td>${escapeHtml(d.service_city || d.location || 'General')}</td>
          <td>
            <span class="status-badge ${d.is_sharing_location ? 'status-delivered' : 'status-pending'}">
              ${d.is_sharing_location ? '● Live Sharing' : 'Offline'}
            </span>
          </td>
          <td>${d.completed_deliveries || 0} Trips</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#DC2626; padding:20px;">Failed to load fleet.</td></tr>';
    }
  }

  // ============================================================================
  // 7. CERTIFICATES REVIEW
  // ============================================================================
  async function loadAdminCertificates() {
    const tbody = document.querySelector('#adminCertsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">Loading certificates...</td></tr>';

    try {
      const res = await adminFetch('/certificates/pending');
      const data = await res.json();
      const certs = data.certificates || [];

      if (certs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">No pending certificate submissions at this time.</td></tr>';
        return;
      }

      tbody.innerHTML = certs.map(c => `
        <tr>
          <td>#${c.id}</td>
          <td>${escapeHtml(c.farmer_name || 'Farmer #' + c.farmer_id)}</td>
          <td><strong>${escapeHtml(c.certificate_type)}</strong></td>
          <td>${escapeHtml(c.issuing_authority || '—')}</td>
          <td><code>${escapeHtml(c.certificate_number)}</code></td>
          <td>${c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-IN') : 'No Expiry'}</td>
          <td>
            ${c.document_url ? `<a href="${escapeHtml(c.document_url)}" target="_blank" class="nav-link">View Doc ↗</a>` : 'No doc'}
          </td>
          <td><span class="status-badge status-pending">${escapeHtml(c.verification_status)}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn-primary btn-small" onclick="reviewCertificate(${c.id}, 'approved')">Approve</button>
              <button class="btn-secondary btn-small" style="color:#DC2626;" onclick="reviewCertificate(${c.id}, 'rejected')">Reject</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#DC2626; padding:20px;">Failed to load certificates.</td></tr>';
    }
  }

  window.reviewCertificate = async function (certId, status) {
    const notes = prompt(`Provide administrative notes for ${status}:`, status === 'approved' ? 'Verified with issuing authority registry' : 'Unverifiable document');
    if (!notes) return;

    try {
      const res = await adminFetch(`/certificates/${certId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ status, verification_notes: notes })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Certificate ${status} successfully!`, 'success');
        loadAdminCertificates();
      } else {
        showToast(data.error || 'Failed to review certificate', 'error');
      }
    } catch (err) {
      showToast('Connection failed', 'error');
    }
  };

  // ============================================================================
  // 8. COMPLAINTS & DISPUTES
  // ============================================================================
  async function loadAdminComplaints() {
    const tbody = document.querySelector('#adminComplaintsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Loading dispute tickets...</td></tr>';

    try {
      const res = await adminFetch('/complaints/admin/all');
      const data = await res.json();
      const complaints = data.complaints || [];

      if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No open dispute tickets.</td></tr>';
        return;
      }

      tbody.innerHTML = complaints.map(c => `
        <tr>
          <td><strong>#TKT-${c.id}</strong></td>
          <td>${escapeHtml(c.user_name || 'User #' + c.user_id)}</td>
          <td>${c.order_id ? `#ORD-${c.order_id}` : 'General'}</td>
          <td><span class="category-badge">${escapeHtml(c.category)}</span></td>
          <td>
            <strong>${escapeHtml(c.subject)}</strong><br>
            <span style="font-size:0.85rem; color:var(--ink-soft);">${escapeHtml(c.description)}</span>
          </td>
          <td><span class="status-badge status-${c.status}">${escapeHtml(c.status)}</span></td>
          <td>${escapeHtml(c.resolution_notes || 'Pending investigation')}</td>
          <td>
            ${c.status !== 'resolved' && c.status !== 'dismissed' ? `
              <button class="btn-primary btn-small" onclick="openResolveModal(${c.id})">Resolve</button>
            ` : '<span style="color:#15803D; font-size:0.85rem;">Completed</span>'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#DC2626; padding:20px;">Failed to load complaints.</td></tr>';
    }
  }

  window.openResolveModal = function (ticketId) {
    document.getElementById('resolveTicketId').value = ticketId;
    document.getElementById('resolveNotes').value = '';
    const modal = document.getElementById('resolveComplaintModal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeResolveModal = function () {
    const modal = document.getElementById('resolveComplaintModal');
    if (modal) modal.style.display = 'none';
  };

  window.submitResolveComplaint = async function () {
    const ticketId = document.getElementById('resolveTicketId').value;
    const status = document.getElementById('resolveAction').value;
    const notes = document.getElementById('resolveNotes').value.trim();

    if (!notes) {
      alert('Please enter formal resolution notes.');
      return;
    }

    try {
      const res = await adminFetch(`/complaints/${ticketId}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ status, resolution_notes: notes })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Dispute ticket updated!', 'success');
        closeResolveModal();
        loadAdminComplaints();
      } else {
        showToast(data.error || 'Failed to resolve ticket', 'error');
      }
    } catch (err) {
      showToast('Connection failed', 'error');
    }
  };

  // ============================================================================
  // 9. AUDIT LOGS
  // ============================================================================
  async function loadAdminAuditLogs() {
    const tbody = document.querySelector('#fullAuditLogsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Loading complete audit trail...</td></tr>';

    try {
      const res = await adminFetch('/admin/audit-logs?limit=100');
      const data = await res.json();
      const logs = data.audit_logs || [];

      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No audit events recorded.</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td>#${l.id}</td>
          <td>${new Date(l.created_at).toLocaleString('en-IN')}</td>
          <td>${l.user_id ? `#${l.user_id}` : 'System'} (${escapeHtml(l.user_role || 'anon')})</td>
          <td><span class="audit-code">${escapeHtml(l.action)}</span></td>
          <td>${escapeHtml(l.resource_type)} ${l.resource_id ? '#' + l.resource_id : ''}</td>
          <td><code>${escapeHtml(l.ip_address || '—')}</code></td>
          <td style="font-size:0.8rem; font-family:monospace; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(l.metadata || '')}">
            ${escapeHtml(l.metadata || '—')}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#DC2626; padding:20px;">Failed to load audit logs.</td></tr>';
    }
  }

  // ============================================================================
  // 10. PLATFORM SETTINGS
  // ============================================================================
  async function loadAdminSettings() {
    try {
      const res = await adminFetch('/admin/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        if (s.platform_fee_percent != null) document.getElementById('settingCommission').value = s.platform_fee_percent;
        if (s.max_negotiation_discount_pct != null) document.getElementById('settingMaxDiscount').value = s.max_negotiation_discount_pct;
        if (s.maintenance_mode != null) document.getElementById('settingMaintenance').value = String(s.maintenance_mode);
      }
    } catch (err) {
      console.error('Settings load error:', err);
    }
  }

  const settingsForm = document.getElementById('adminSettingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveSettings');
      setLoading(btn, true);

      const payload = {
        platform_fee_percent: parseFloat(document.getElementById('settingCommission').value),
        max_negotiation_discount_pct: parseFloat(document.getElementById('settingMaxDiscount').value),
        maintenance_mode: document.getElementById('settingMaintenance').value === 'true'
      };

      try {
        const res = await adminFetch('/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Platform settings saved successfully!', 'success');
        } else {
          showToast(data.error || 'Failed to save settings', 'error');
        }
      } catch (err) {
        showToast('Connection failed', 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // Initial Load
  loadAdminMetrics();

})();
