// ============================================================================
// FARM DIRECT — DELIVERY PARTNER DASHBOARD CONTROLLER
// ============================================================================

(function () {
  'use strict';

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // Verify Delivery Partner Authentication
  if (!token || !user || (user.role !== 'delivery_partner' && user.role !== 'admin' && user.role !== 'super_admin')) {
    alert('Access restricted to registered delivery partners.');
    localStorage.clear();
    window.location.href = 'delivery-login.html';
    return;
  }

  const BASE_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.API_URL || 'http://localhost:5000/api');

  // UI Setup
  const partnerNameEl = document.getElementById('driverPartnerName');
  if (partnerNameEl) partnerNameEl.textContent = user.name || 'Partner Driver';

  // Responsive Sidebar Handling
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

  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const layout = document.querySelector('.dashboard-layout');
  if (collapseBtn && layout) {
    collapseBtn.addEventListener('click', () => {
      layout.classList.toggle('sidebar-collapsed');
    });
  }

  // Section Switcher
  window.showDriverSection = function (viewId, title, navId) {
    document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));

    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const targetNav = document.getElementById(navId);
    if (targetNav) targetNav.classList.add('active');

    const titleEl = document.getElementById('driverPageTitle');
    const breadcrumbEl = document.getElementById('driverBreadcrumb');
    if (titleEl) titleEl.textContent = title;
    if (breadcrumbEl) breadcrumbEl.textContent = title;

    if (appSidebar && backdrop) {
      appSidebar.classList.remove('open');
      backdrop.classList.remove('active');
    }

    if (viewId === 'driverActiveView') {
      loadDriverActiveDeliveries();
      setTimeout(initDeliveryMap, 200);
    } else if (viewId === 'driverAvailableView') {
      loadDriverAvailableOrders();
    } else if (viewId === 'driverCompletedView') {
      loadDriverCompletedTrips();
    }
  };

  window.handleDriverLogout = function () {
    if (confirm('Are you sure you want to log out of the delivery portal?')) {
      if (isTrackingActive) stopGpsBroadcast();
      localStorage.clear();
      window.location.href = 'delivery-login.html';
    }
  };

  // Helper for Authenticated Fetch
  async function driverFetch(endpoint, options = {}) {
    const headers = options.headers || {};
    headers['Authorization'] = `Bearer ${token}`;
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  }

  // ============================================================================
  // GPS LIVE LOCATION TRACKING MODULE
  // ============================================================================
  let isTrackingActive = false;
  let geoWatchId = null;
  let currentLat = 18.5204;
  let currentLng = 73.8567; // Default Pune region
  let mapInstance = null;
  let driverMarker = null;

  window.toggleGpsTracking = function () {
    if (isTrackingActive) {
      stopGpsBroadcast();
    } else {
      startGpsBroadcast();
    }
  };

  function startGpsBroadcast() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser or device.');
      return;
    }

    const btn = document.getElementById('btnToggleGps');
    const badge = document.getElementById('gpsStatusBadge');
    const coordsEl = document.getElementById('gpsCoordsText');

    isTrackingActive = true;
    if (btn) {
      btn.textContent = 'Stop Sharing Location';
      btn.style.background = '#DC2626';
      btn.style.borderColor = '#B91C1C';
    }
    if (badge) {
      badge.className = 'driver-badge-live active';
      badge.innerHTML = '<span class="pulse-dot"></span> ● Live Sharing';
    }

    // Inform backend tracking toggle
    driverFetch('/delivery/toggle-live-tracking', {
      method: 'POST',
      body: JSON.stringify({ is_sharing: true })
    }).catch(err => console.error(err));

    showToast('GPS tracking activated. Transmitting location every 20 seconds.', 'success');

    // Acquire watch
    geoWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        currentLat = pos.coords.latitude;
        currentLng = pos.coords.longitude;
        const speed = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : 0;
        const accuracy = Math.round(pos.coords.accuracy || 10);

        if (coordsEl) {
          coordsEl.textContent = `Lat: ${currentLat.toFixed(5)}, Lng: ${currentLng.toFixed(5)} (±${accuracy}m) · Speed: ${speed} km/h`;
        }

        // Post to backend
        driverFetch('/delivery/location', {
          method: 'POST',
          body: JSON.stringify({
            latitude: currentLat,
            longitude: currentLng,
            speed_kmh: parseFloat(speed) || 0,
            accuracy_meters: accuracy
          })
        }).catch(e => console.warn('GPS log failed:', e));

        // Update map marker
        updateDriverMarker(currentLat, currentLng);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (coordsEl) coordsEl.textContent = `GPS Sensor Alert: ${err.message}. Using estimated location.`;
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 25000
      }
    );
  }

  function stopGpsBroadcast() {
    if (geoWatchId) {
      navigator.geolocation.clearWatch(geoWatchId);
      geoWatchId = null;
    }
    isTrackingActive = false;

    const btn = document.getElementById('btnToggleGps');
    const badge = document.getElementById('gpsStatusBadge');
    const coordsEl = document.getElementById('gpsCoordsText');

    if (btn) {
      btn.textContent = 'Start Sharing Live GPS';
      btn.style.background = '#D97706';
      btn.style.borderColor = '#B45309';
    }
    if (badge) {
      badge.className = 'driver-badge-live inactive';
      badge.innerHTML = '<span class="pulse-dot" style="background:#94A3B8;"></span> Offline';
    }
    if (coordsEl) coordsEl.textContent = 'GPS: Standby';

    driverFetch('/delivery/toggle-live-tracking', {
      method: 'POST',
      body: JSON.stringify({ is_sharing: false })
    }).catch(err => console.error(err));

    showToast('GPS location sharing turned off', 'info');
  }

  // ============================================================================
  // LEAFLET ROUTE MAP
  // ============================================================================
  function initDeliveryMap() {
    const mapEl = document.getElementById('deliveryMap');
    if (!mapEl || typeof L === 'undefined') return;

    if (!mapInstance) {
      mapInstance = L.map('deliveryMap').setView([currentLat, currentLng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(mapInstance);

      driverMarker = L.marker([currentLat, currentLng]).addTo(mapInstance)
        .bindPopup('<b>Your Current Vehicle Location</b>')
        .openPopup();
    } else {
      mapInstance.invalidateSize();
    }
  }

  function updateDriverMarker(lat, lng) {
    if (!mapInstance || typeof L === 'undefined') return;
    if (!driverMarker) {
      driverMarker = L.marker([lat, lng]).addTo(mapInstance).bindPopup('<b>Vehicle Location</b>');
    } else {
      driverMarker.setLatLng([lat, lng]);
    }
    mapInstance.panTo([lat, lng]);
  }

  // ============================================================================
  // 1. ACTIVE SHIPMENTS
  // ============================================================================
  async function loadDriverActiveDeliveries() {
    const container = document.getElementById('activeShipmentsList');
    if (!container) return;

    try {
      const res = await driverFetch('/delivery/assignments');
      if (!res.ok) throw new Error('Failed to load assignments');
      const data = await res.json();
      const all = data.assignments || [];

      // Filter active (not delivered)
      const active = all.filter(a => a.status !== 'delivered' && a.status !== 'failed');
      const badge = document.getElementById('activeShipmentBadge');
      if (badge) badge.textContent = active.length;

      if (active.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center; padding:40px 20px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8A9A90" stroke-width="1.8" style="margin-bottom:12px;">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            </svg>
            <h3>No Active Deliveries Right Now</h3>
            <p>You have fulfilled all assigned shipments. Check "Available Orders" to claim a new pickup.</p>
            <button class="btn-primary" style="margin-top:14px;" onclick="showDriverSection('driverAvailableView', 'Available Pickup Orders', 'navDriverAvailable')">
              Browse Available Orders
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = active.map(a => {
        return `
          <div class="delivery-order-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
              <div>
                <span style="font-size:0.8rem; font-weight:700; color:#B45309; text-transform:uppercase;">Assignment #ASN-${a.id}</span>
                <h3 style="margin:4px 0 0 0;">${escapeHtml(a.crop_name || 'Agricultural Produce')} — ${a.quantity} kg</h3>
                <span style="font-size:0.88rem; color:var(--ink-soft);">Order #ORD-${a.order_id} · Value: ₹${Number(a.total_price || 0).toLocaleString('en-IN')}</span>
              </div>
              <span class="status-badge status-${a.status}">${escapeHtml(a.status)}</span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; background:var(--surface-alt); padding:14px; border-radius:8px; margin-bottom:16px;">
              <div>
                <strong style="display:block; color:#143D2B; font-size:0.85rem; margin-bottom:4px;">📍 1. PICKUP (FARM)</strong>
                <div>${escapeHtml(a.farmer_name || 'Farmer')}</div>
                <div style="font-size:0.85rem; color:var(--ink-soft);">${escapeHtml(a.pickup_address || a.farmer_location || 'Farm Location')}</div>
                ${a.farmer_phone ? `<div style="font-size:0.85rem; margin-top:2px;">📞 <a href="tel:${escapeHtml(a.farmer_phone)}">${escapeHtml(a.farmer_phone)}</a></div>` : ''}
              </div>
              <div>
                <strong style="display:block; color:#0369A1; font-size:0.85rem; margin-bottom:4px;">🏁 2. DELIVERY DESTINATION</strong>
                <div>${escapeHtml(a.buyer_name || 'Buyer')}</div>
                <div style="font-size:0.85rem; color:var(--ink-soft);">${escapeHtml(a.delivery_address || a.buyer_location || 'Customer Address')}</div>
                ${a.buyer_phone ? `<div style="font-size:0.85rem; margin-top:2px;">📞 <a href="tel:${escapeHtml(a.buyer_phone)}">${escapeHtml(a.buyer_phone)}</a></div>` : ''}
              </div>
            </div>

            <!-- Lifecycle Actions -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div style="font-size:0.85rem; color:var(--ink-soft);">
                Assigned: ${new Date(a.assigned_at).toLocaleDateString('en-IN')}
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${a.status === 'assigned' ? `
                  <button class="delivery-step-btn" style="background:#2E7D32; color:#FFF;" onclick="advanceDeliveryStatus(${a.id}, 'picked_up')">
                    ✓ Confirm Pickup from Farm
                  </button>
                ` : ''}
                ${a.status === 'picked_up' ? `
                  <button class="delivery-step-btn" style="background:#0369A1; color:#FFF;" onclick="advanceDeliveryStatus(${a.id}, 'in_transit')">
                    🚚 Start In Transit
                  </button>
                ` : ''}
                ${a.status === 'in_transit' ? `
                  <button class="delivery-step-btn" style="background:#6D28D9; color:#FFF;" onclick="advanceDeliveryStatus(${a.id}, 'out_for_delivery')">
                    📦 Out for Delivery
                  </button>
                ` : ''}
                ${a.status === 'out_for_delivery' ? `
                  <button class="delivery-step-btn" style="background:#15803D; color:#FFF;" onclick="openProofModal(${a.id})">
                    Handover & Proof of Delivery
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p style="color:#DC2626; text-align:center; padding:20px;">Failed to load assignments.</p>';
    }
  }

  window.advanceDeliveryStatus = async function (assignmentId, nextStatus) {
    if (!confirm(`Mark delivery status as "${nextStatus}"?`)) return;

    try {
      const res = await driverFetch(`/delivery/status/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Status updated to ${nextStatus}!`, 'success');
        loadDriverActiveDeliveries();
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Connection failed', 'error');
    }
  };

  // Proof of Delivery Handlers
  window.openProofModal = function (assignmentId) {
    document.getElementById('proofAssignmentId').value = assignmentId;
    document.getElementById('recipientName').value = '';
    document.getElementById('deliveryNotes').value = '';
    const modal = document.getElementById('proofModal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeProofModal = function () {
    const modal = document.getElementById('proofModal');
    if (modal) modal.style.display = 'none';
  };

  window.submitProofOfDelivery = async function () {
    const assignmentId = document.getElementById('proofAssignmentId').value;
    const recipientName = document.getElementById('recipientName').value.trim();
    const notes = document.getElementById('deliveryNotes').value.trim();
    const photoInput = document.getElementById('deliveryPhotoProof');

    if (!recipientName) {
      alert('Recipient name is required to complete delivery handover.');
      return;
    }

    const btn = document.getElementById('btnSubmitProof');
    setLoading(btn, true);

    let photoUrl = null;
    if (photoInput && photoInput.files && photoInput.files[0]) {
      try {
        photoUrl = await compressImage(photoInput.files[0]);
      } catch (e) {
        console.warn('Image compression bypassed:', e);
      }
    }

    try {
      const payload = {
        recipient_name: recipientName,
        notes: notes || 'Delivery completed successfully',
        photo_url: photoUrl,
        delivered_lat: currentLat,
        delivered_lng: currentLng
      };

      const res = await driverFetch(`/delivery/proof/${assignmentId}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Proof submitted! Shipment marked as successfully delivered.', 'success');
        closeProofModal();
        loadDriverActiveDeliveries();
      } else {
        showToast(data.error || 'Failed to submit proof', 'error');
      }
    } catch (err) {
      showToast('Connection failed', 'error');
    } finally {
      setLoading(btn, false);
    }
  };

  // ============================================================================
  // 2. AVAILABLE PICKUP ORDERS
  // ============================================================================
  async function loadDriverAvailableOrders() {
    const tbody = document.querySelector('#availableOrdersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Scanning for ready farm orders...</td></tr>';

    try {
      const res = await driverFetch('/delivery/available');
      if (!res.ok) throw new Error('Failed to fetch available orders');
      const data = await res.json();
      const orders = data.orders || [];

      if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No unassigned orders ready for pickup at the moment.</td></tr>';
        return;
      }

      tbody.innerHTML = orders.map(o => `
        <tr>
          <td><strong>#ORD-${o.id}</strong></td>
          <td>${escapeHtml(o.crop_name)} (${o.quantity} kg)</td>
          <td>${escapeHtml(o.farmer_location || o.pickup_address || 'Farm')}</td>
          <td>${escapeHtml(o.delivery_address || o.buyer_location || 'Customer')}</td>
          <td><strong>₹${Number(o.total_price || 0).toLocaleString('en-IN')}</strong></td>
          <td>
            <button class="btn-primary btn-small" onclick="claimDeliveryOrder(${o.id})">
              Accept Pickup
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#DC2626; padding:20px;">Failed to load available orders.</td></tr>';
    }
  }

  window.claimDeliveryOrder = async function (orderId) {
    if (!confirm(`Accept pickup and delivery for Order #ORD-${orderId}?`)) return;

    try {
      const res = await driverFetch('/delivery/assign', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Shipment claimed! Switching to Active Deliveries...', 'success');
        showDriverSection('driverActiveView', 'Active Shipments', 'navDriverActive');
      } else {
        showToast(data.error || 'Failed to claim shipment', 'error');
      }
    } catch (err) {
      showToast('Connection failed', 'error');
    }
  };

  // ============================================================================
  // 3. COMPLETED TRIPS HISTORY
  // ============================================================================
  async function loadDriverCompletedTrips() {
    const tbody = document.querySelector('#completedTripsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Loading trip history...</td></tr>';

    try {
      const res = await driverFetch('/delivery/assignments');
      const data = await res.json();
      const all = data.assignments || [];
      const completed = all.filter(a => a.status === 'delivered');

      if (completed.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No completed trips recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = completed.map(c => `
        <tr>
          <td>#ASN-${c.id}</td>
          <td>#ORD-${c.order_id}</td>
          <td>${escapeHtml(c.crop_name)} (${c.quantity} kg)</td>
          <td>${escapeHtml(c.buyer_name || 'Buyer')} (${escapeHtml(c.delivery_address || 'Address')})</td>
          <td>${c.delivered_at ? new Date(c.delivered_at).toLocaleString('en-IN') : 'Completed'}</td>
          <td>${escapeHtml(c.notes || 'Delivered')}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#DC2626; padding:20px;">Failed to load trips.</td></tr>';
    }
  }

  // ============================================================================
  // 4. REPORT ISSUE / TICKET
  // ============================================================================
  const issueForm = document.getElementById('driverIssueForm');
  if (issueForm) {
    issueForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitDriverIssue');
      setLoading(btn, true);

      const orderId = document.getElementById('issueOrderId').value;
      const category = document.getElementById('issueCategory').value;
      const description = document.getElementById('issueDescription').value.trim();

      try {
        const res = await driverFetch('/complaints', {
          method: 'POST',
          body: JSON.stringify({
            order_id: orderId ? parseInt(orderId) : null,
            category: category,
            subject: `Delivery Alert: ${category.replace('_', ' ')} on Order #${orderId}`,
            description: description
          })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Urgent ticket dispatched to platform support!', 'success');
          issueForm.reset();
        } else {
          showToast(data.error || 'Failed to submit ticket', 'error');
        }
      } catch (err) {
        showToast('Connection failed', 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // Initialize view
  loadDriverActiveDeliveries();

})();
