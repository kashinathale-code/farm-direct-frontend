// ============================================================================
// FARM DIRECT — FARMER WEATHER FORECAST & AGRICULTURAL INSIGHTS
// ============================================================================

const FD_Weather = (function () {
  'use strict';

  const CACHE_TTL_MINUTES = 45;
  const CACHE_KEY_PREFIX = 'fd_weather_cache_';
  const LOCATION_STORAGE_KEY = 'fd_weather_location';

  // Default fallback agricultural location (Pune, Maharashtra, India)
  const DEFAULT_LOCATION = {
    name: 'Pune',
    admin1: 'Maharashtra',
    country: 'India',
    latitude: 18.5204,
    longitude: 73.8567,
    timezone: 'Asia/Kolkata'
  };

  // WMO Weather Interpretation Codes (WMO Code -> Icon & i18n key)
  const WMO_ICONS = {
    0: { icon: '☀️', key: 'weather_code.0' },
    1: { icon: '🌤️', key: 'weather_code.1' },
    2: { icon: '⛅', key: 'weather_code.2' },
    3: { icon: '☁️', key: 'weather_code.3' },
    45: { icon: '🌫️', key: 'weather_code.45' },
    48: { icon: '🌫️', key: 'weather_code.48' },
    51: { icon: '🌦️', key: 'weather_code.51' },
    53: { icon: '🌦️', key: 'weather_code.53' },
    55: { icon: '🌧️', key: 'weather_code.55' },
    61: { icon: '🌧️', key: 'weather_code.61' },
    63: { icon: '🌧️', key: 'weather_code.63' },
    65: { icon: '⛈️', key: 'weather_code.65' },
    71: { icon: '🌨️', key: 'weather_code.71' },
    73: { icon: '🌨️', key: 'weather_code.73' },
    75: { icon: '❄️', key: 'weather_code.75' },
    80: { icon: '🌦️', key: 'weather_code.80' },
    81: { icon: '🌧️', key: 'weather_code.81' },
    82: { icon: '⛈️', key: 'weather_code.82' },
    95: { icon: '⛈️', key: 'weather_code.95' },
    96: { icon: '⛈️', key: 'weather_code.96' },
    99: { icon: '⛈️', key: 'weather_code.99' }
  };

  function getWeatherMeta(code) {
    const meta = WMO_ICONS[code] || { icon: '🌤️', key: 'weather_code.1' };
    const label = window.t ? window.t(meta.key, {}, 'Partly Cloudy') : 'Partly Cloudy';
    return { icon: meta.icon, label };
  }

  // --------------------------------------------------------------------------
  // Location Management
  // --------------------------------------------------------------------------

  // Get current farmer location preference
  function getActiveLocation() {
    // 1. Check custom stored location
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // 2. Check profile user location
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.location && user.location.trim().length > 0) {
        return {
          name: user.location.trim(),
          isProfileQuery: true,
          latitude: null,
          longitude: null
        };
      }
    } catch (e) {}

    // 3. Fallback to default agricultural region
    return DEFAULT_LOCATION;
  }

  function setActiveLocation(loc) {
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
    } catch (e) {}
  }

  // Search locations using Open-Meteo Geocoding API
  async function searchLocations(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const data = await res.json();
      return (data.results || []).map(r => ({
        name: r.name,
        admin1: r.admin1 || '',
        country: r.country || '',
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone || 'Asia/Kolkata'
      }));
    } catch (err) {
      console.warn('Geocoding search failed:', err.message);
      return [];
    }
  }

  // Geocode location string if lat/lon not present
  async function resolveCoordinates(loc) {
    if (loc.latitude && loc.longitude) return loc;
    const query = loc.name || 'Pune';
    const results = await searchLocations(query);
    if (results && results.length > 0) {
      const resolved = { ...results[0], name: loc.name };
      setActiveLocation(resolved);
      return resolved;
    }
    return DEFAULT_LOCATION;
  }

  // --------------------------------------------------------------------------
  // Open-Meteo Forecast API with Caching
  // --------------------------------------------------------------------------

  async function fetchForecast(location, forceRefresh = false) {
    const resolvedLoc = await resolveCoordinates(location);
    const lat = resolvedLoc.latitude.toFixed(4);
    const lon = resolvedLoc.longitude.toFixed(4);
    const cacheKey = `${CACHE_KEY_PREFIX}${lat}_${lon}`;

    // Check localStorage cache
    if (!forceRefresh) {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const ageMinutes = (Date.now() - cached.timestamp) / (1000 * 60);
          if (ageMinutes < CACHE_TTL_MINUTES) {
            return { data: cached.data, location: resolvedLoc, isCached: true, timestamp: cached.timestamp };
          }
        }
      } catch (e) {}
    }

    // Call official Open-Meteo Forecast API
    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Open-Meteo responded with status ${res.status}`);
    }
    const data = await res.json();

    // Cache result
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {}

    return { data, location: resolvedLoc, isCached: false, timestamp: Date.now() };
  }

  // --------------------------------------------------------------------------
  // Rule-Based Weather Insights Generator
  // --------------------------------------------------------------------------

  function generateFarmingInsights(weatherData) {
    const t = window.t || ((k, p, fb) => fb || k);
    const insights = [];

    if (!weatherData || !weatherData.daily) return insights;

    const daily = weatherData.daily;
    const current = weatherData.current || {};

    const maxRainNext3Days = Math.max(...(daily.precipitation_sum || []).slice(0, 3));
    const maxRainProbNext3Days = Math.max(...(daily.precipitation_probability_max || []).slice(0, 3));
    const maxTempNext3Days = Math.max(...(daily.temperature_2m_max || []).slice(0, 3));
    const maxWindNext3Days = Math.max(...(daily.wind_speed_10m_max || []).slice(0, 3));

    // Rule 1: Rain Alert
    if (maxRainNext3Days >= 5.0 || maxRainProbNext3Days >= 60) {
      insights.push({
        type: 'rain',
        severity: 'warning',
        icon: '🌧️',
        title: 'Rainfall Advisory',
        message: t('weather.rain_alert', {
          rain: maxRainNext3Days.toFixed(1),
          prob: maxRainProbNext3Days
        }, `Rain Alert: Significant precipitation is expected (${maxRainNext3Days.toFixed(1)}mm / ${maxRainProbNext3Days}% chance). Consider postponing crop harvesting, open-yard drying, and pesticide spraying. Ensure harvested produce is stored under waterproof cover.`)
      });
    }

    // Rule 2: Heat Advisory
    if (maxTempNext3Days >= 35.0) {
      insights.push({
        type: 'heat',
        severity: 'caution',
        icon: '🌡️',
        title: 'Heat Stress Advisory',
        message: t('weather.heat_alert', {
          temp: maxTempNext3Days.toFixed(1)
        }, `Heat Advisory: Elevated temperatures expected (${maxTempNext3Days.toFixed(1)}°C max). Increase irrigation frequency during early morning or dusk hours to mitigate thermal stress for sensitive crops.`)
      });
    }

    // Rule 3: High Wind Alert
    if (maxWindNext3Days >= 25.0) {
      insights.push({
        type: 'wind',
        severity: 'caution',
        icon: '💨',
        title: 'Wind & Spray Drift Advisory',
        message: t('weather.wind_alert', {
          wind: maxWindNext3Days.toFixed(1)
        }, `Wind Alert: High wind velocities forecast (${maxWindNext3Days.toFixed(1)} km/h). Delay foliar sprays to prevent chemical drift and inspect staking or supports for tall crops.`)
      });
    }

    // Rule 4: Dry & Favorable Window
    if (maxRainNext3Days < 1.0 && maxRainProbNext3Days < 25 && maxTempNext3Days < 36.0 && maxWindNext3Days < 22.0) {
      insights.push({
        type: 'favorable',
        severity: 'positive',
        icon: '✅',
        title: 'Favorable Field Window',
        message: t('weather.dry_favorable', {}, 'Favorable Work Window: Relatively dry and stable weather expected. Suitable conditions for outdoor fieldwork, harvesting, grain sorting, and transport.')
      });
    }

    return insights;
  }

  // --------------------------------------------------------------------------
  // UI Component: Compact Weather Card (for Overview view)
  // --------------------------------------------------------------------------

  async function renderOverviewWeatherCard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const t = window.t || ((k, p, fb) => fb || k);

    container.innerHTML = `
      <div class="weather-card loading">
        <div class="weather-spinner"></div>
        <span>${t('common.loading', {}, 'Loading agricultural weather forecast...')}</span>
      </div>
    `;

    try {
      const activeLoc = getActiveLocation();
      const { data, location, timestamp } = await fetchForecast(activeLoc);
      const current = data.current || {};
      const daily = data.daily || {};

      const currentMeta = getWeatherMeta(current.weather_code);
      const minTemp = daily.temperature_2m_min && daily.temperature_2m_min[0] != null ? Math.round(daily.temperature_2m_min[0]) : '--';
      const maxTemp = daily.temperature_2m_max && daily.temperature_2m_max[0] != null ? Math.round(daily.temperature_2m_max[0]) : '--';
      const rainProb = daily.precipitation_probability_max && daily.precipitation_probability_max[0] != null ? daily.precipitation_probability_max[0] : 0;
      const rainSum = daily.precipitation_sum && daily.precipitation_sum[0] != null ? daily.precipitation_sum[0].toFixed(1) : '0.0';

      const insights = generateFarmingInsights(data);
      const topInsight = insights.length > 0 ? insights[0] : null;

      const locDisplayName = location.name + (location.admin1 ? `, ${location.admin1}` : '');
      const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      container.innerHTML = `
        <div class="weather-card">
          <!-- Card Header -->
          <div class="weather-card-header">
            <div class="weather-loc-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <strong>${escapeHtml(locDisplayName)}</strong>
            </div>

            <div class="weather-header-actions">
              <button class="btn-weather-action" onclick="FD_Weather.openLocationModal()" title="${t('weather.change_location', {}, 'Change Location')}">
                ✏️ ${t('weather.change_location', {}, 'Change')}
              </button>
              <button class="btn-weather-action" onclick="FD_Weather.refreshOverviewWeather(true)" title="${t('common.refresh', {}, 'Refresh Forecast')}">
                🔄
              </button>
            </div>
          </div>

          <!-- Current Weather Core -->
          <div class="weather-current-grid">
            <div class="weather-current-main">
              <span class="weather-huge-icon">${currentMeta.icon}</span>
              <div class="weather-temp-wrap">
                <span class="weather-temp-num">${Math.round(current.temperature_2m || 0)}°C</span>
                <span class="weather-cond-text">${currentMeta.label}</span>
              </div>
            </div>

            <div class="weather-metrics-pills">
              <div class="metric-pill">
                <span class="m-icon">🌡️</span>
                <span class="m-label">${t('weather.min_max', {}, 'Min / Max')}</span>
                <strong>${minTemp}° / ${maxTemp}°C</strong>
              </div>
              <div class="metric-pill">
                <span class="m-icon">💧</span>
                <span class="m-label">${t('weather.precipitation', {}, 'Precipitation')}</span>
                <strong>${rainProb}% (${rainSum} mm)</strong>
              </div>
              <div class="metric-pill">
                <span class="m-icon">💨</span>
                <span class="m-label">${t('weather.wind_speed', {}, 'Wind')}</span>
                <strong>${Math.round(current.wind_speed_10m || 0)} km/h</strong>
              </div>
              <div class="metric-pill">
                <span class="m-icon">🌫️</span>
                <span class="m-label">${t('weather.humidity', {}, 'Humidity')}</span>
                <strong>${Math.round(current.relative_humidity_2m || 0)}%</strong>
              </div>
            </div>
          </div>

          <!-- Top Farming Insight Banner -->
          ${topInsight ? `
            <div class="weather-insight-banner ${topInsight.severity}">
              <span class="insight-icon">${topInsight.icon}</span>
              <div class="insight-text">
                <strong>${topInsight.title}:</strong> ${topInsight.message}
              </div>
            </div>
          ` : ''}

          <!-- Card Footer with Attribution & Time -->
          <div class="weather-card-footer">
            <span class="weather-updated-text">${t('weather.last_updated', { time: formattedTime }, `Last updated: ${formattedTime}`)}</span>
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" class="weather-attr-link">
              ${t('weather.attribution', {}, 'Weather data by Open-Meteo')}
            </a>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('renderOverviewWeatherCard error:', err);
      container.innerHTML = `
        <div class="weather-card error">
          <div class="weather-error-content">
            <span>⚠️ ${t('weather.error', {}, 'Unable to retrieve weather forecast at this time.')}</span>
            <div style="margin-top:8px;">
              <button class="btn-secondary btn-small" onclick="FD_Weather.refreshOverviewWeather(true)">${t('common.retry', {}, 'Retry')}</button>
              <button class="btn-secondary btn-small" onclick="FD_Weather.openLocationModal()">${t('weather.change_location', {}, 'Change Location')}</button>
            </div>
          </div>
          <div class="weather-card-footer">
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" class="weather-attr-link">
              ${t('weather.attribution', {}, 'Weather data by Open-Meteo')}
            </a>
          </div>
        </div>
      `;
    }
  }

  // --------------------------------------------------------------------------
  // UI Component: Dedicated Extended 7-Day Weather View
  // --------------------------------------------------------------------------

  async function renderExtendedWeatherView(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const t = window.t || ((k, p, fb) => fb || k);

    container.innerHTML = `
      <div class="weather-extended-view">
        <div class="section-title-row">
          <div>
            <h2>${t('weather.card_title', {}, 'Agricultural Weather Forecast')}</h2>
            <p>${t('weather.card_subtitle', {}, 'Real-time meteorological insights to help plan harvesting, drying, irrigation, and crop protection.')}</p>
          </div>
          <div class="weather-header-actions">
            <button class="btn-secondary" onclick="FD_Weather.openLocationModal()">
              📍 ${t('weather.change_location', {}, 'Change Location')}
            </button>
            <button class="btn-primary" onclick="FD_Weather.renderExtendedWeatherView('${containerId}')">
              🔄 ${t('common.refresh', {}, 'Refresh Forecast')}
            </button>
          </div>
        </div>

        <div class="weather-card loading" style="margin-top:20px;">
          <div class="weather-spinner"></div>
          <span>${t('common.loading', {}, 'Loading agricultural weather forecast...')}</span>
        </div>
      </div>
    `;

    try {
      const activeLoc = getActiveLocation();
      const { data, location, timestamp } = await fetchForecast(activeLoc);
      const current = data.current || {};
      const daily = data.daily || {};

      const currentMeta = getWeatherMeta(current.weather_code);
      const insights = generateFarmingInsights(data);
      const locDisplayName = location.name + (location.admin1 ? `, ${location.admin1}` : '') + (location.country ? `, ${location.country}` : '');
      const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Daily 7-day cards
      const dayCardsHtml = (daily.time || []).map((dateStr, idx) => {
        const d = new Date(dateStr);
        const dayName = d.toLocaleDateString([], { weekday: 'short' });
        const dateFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const code = daily.weather_code ? daily.weather_code[idx] : 0;
        const meta = getWeatherMeta(code);
        const minT = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[idx]) : '--';
        const maxT = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[idx]) : '--';
        const rainP = daily.precipitation_probability_max ? daily.precipitation_probability_max[idx] : 0;
        const rainM = daily.precipitation_sum ? daily.precipitation_sum[idx].toFixed(1) : '0';

        const isToday = idx === 0;

        return `
          <div class="forecast-day-card ${isToday ? 'today' : ''}">
            <span class="day-title">${isToday ? 'Today' : dayName}</span>
            <span class="day-date">${dateFormatted}</span>
            <span class="day-icon">${meta.icon}</span>
            <span class="day-cond">${meta.label}</span>
            <div class="day-temp-range">
              <span class="high">${maxT}°</span>
              <span class="low">${minT}°</span>
            </div>
            <div class="day-rain-tag ${rainP > 40 ? 'rainy' : ''}">
              💧 ${rainP}% (${rainM}mm)
            </div>
          </div>
        `;
      }).join('');

      // Insights cards
      const insightsHtml = insights.length > 0 ? insights.map(i => `
        <div class="weather-insight-card ${i.severity}">
          <div class="insight-card-header">
            <span class="insight-card-icon">${i.icon}</span>
            <strong>${i.title}</strong>
          </div>
          <p class="insight-card-msg">${i.message}</p>
        </div>
      `).join('') : `
        <div class="weather-insight-card positive">
          <div class="insight-card-header">
            <span class="insight-card-icon">✅</span>
            <strong>Standard Farm Operations</strong>
          </div>
          <p class="insight-card-msg">${t('weather.dry_favorable', {}, 'Favorable Work Window: Relatively dry and stable weather expected. Suitable conditions for outdoor fieldwork, harvesting, grain sorting, and transport.')}</p>
        </div>
      `;

      container.innerHTML = `
        <div class="weather-extended-view">
          <!-- Section Header -->
          <div class="section-title-row">
            <div>
              <h2>${t('weather.card_title', {}, 'Agricultural Weather Forecast')}</h2>
              <p>${t('weather.card_subtitle', {}, 'Real-time meteorological insights to help plan harvesting, drying, irrigation, and crop protection.')}</p>
            </div>
            <div class="weather-header-actions">
              <button class="btn-secondary" onclick="FD_Weather.openLocationModal()">
                📍 ${t('weather.change_location', {}, 'Change Location')}
              </button>
              <button class="btn-primary" onclick="FD_Weather.renderExtendedWeatherView('${containerId}')">
                🔄 ${t('common.refresh', {}, 'Refresh Forecast')}
              </button>
            </div>
          </div>

          <!-- Hero Location & Current Conditions Card -->
          <div class="weather-hero-card">
            <div class="hero-weather-left">
              <div class="hero-loc-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>${escapeHtml(locDisplayName)}</span>
              </div>
              <div class="hero-temp-block">
                <span class="hero-weather-icon">${currentMeta.icon}</span>
                <div>
                  <span class="hero-temp-value">${Math.round(current.temperature_2m || 0)}°C</span>
                  <span class="hero-condition-desc">${currentMeta.label}</span>
                </div>
              </div>
            </div>

            <div class="hero-weather-metrics">
              <div class="hero-metric-item">
                <span class="metric-label">Min / Max Today</span>
                <span class="metric-val">${daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : '--'}°C / ${daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : '--'}°C</span>
              </div>
              <div class="hero-metric-item">
                <span class="metric-label">Precipitation Chance</span>
                <span class="metric-val">${daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0}% (${daily.precipitation_sum ? daily.precipitation_sum[0] : 0} mm)</span>
              </div>
              <div class="hero-metric-item">
                <span class="metric-label">Wind Speed</span>
                <span class="metric-val">${Math.round(current.wind_speed_10m || 0)} km/h</span>
              </div>
              <div class="hero-metric-item">
                <span class="metric-label">Relative Humidity</span>
                <span class="metric-val">${Math.round(current.relative_humidity_2m || 0)}%</span>
              </div>
            </div>
          </div>

          <!-- 7-Day Forecast Strip -->
          <div class="weather-forecast-strip-wrap">
            <h3 class="forecast-strip-title">${t('weather.forecast_7day', {}, '7-Day Farming Weather Outlook')}</h3>
            <div class="forecast-strip-grid">
              ${dayCardsHtml}
            </div>
          </div>

          <!-- Farming Insights Section -->
          <div class="weather-insights-section">
            <div class="insights-header">
              <h3>🌾 ${t('weather.insights_title', {}, 'Weather-Based Farming Insights')}</h3>
              <p>${t('weather.insights_disclaimer', {}, 'Advisory Note: These rule-based suggestions are derived from standard meteorological forecast metrics. Weather conditions can change rapidly. Farmers should use their judgment and consult local Krishi Vigyan Kendra (KVK) or official agricultural department advisories.')}</p>
            </div>
            <div class="insights-grid">
              ${insightsHtml}
            </div>
          </div>

          <!-- Visible Open-Meteo Attribution Footer -->
          <div class="weather-attribution-footer">
            <span>${t('weather.last_updated', { time: formattedTime }, `Last updated: ${formattedTime}`)}</span>
            <div class="attr-wrap">
              <span>Forecast powered by</span>
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo Weather API</a>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('renderExtendedWeatherView error:', err);
      container.innerHTML = `
        <div class="card-box error">
          <p>⚠️ ${t('weather.error', {}, 'Unable to retrieve weather forecast at this time.')}</p>
          <button class="btn-primary" onclick="FD_Weather.renderExtendedWeatherView('${containerId}')">${t('common.retry', {}, 'Retry')}</button>
          <div class="weather-attribution-footer" style="margin-top:15px;">
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather data by Open-Meteo</a>
          </div>
        </div>
      `;
    }
  }

  // --------------------------------------------------------------------------
  // Location Search & Selection Modal
  // --------------------------------------------------------------------------

  function openLocationModal() {
    let modal = document.getElementById('weatherLocationModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'weatherLocationModal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    const t = window.t || ((k, p, fb) => fb || k);

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3>📍 ${t('weather.change_location', {}, 'Select Farm Location')}</h3>
          <button class="modal-close-btn" onclick="document.getElementById('weatherLocationModal').classList.remove('active')">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px; color:var(--ink-soft); margin-bottom:12px;">
            Enter your village, district, or nearest town to receive localized agricultural weather forecasts.
          </p>

          <div class="input-group">
            <input type="text" id="weatherSearchInput" placeholder="${t('weather.search_placeholder', {}, 'Search city or district (e.g. Nashik, Pune, Nagpur)...')}" autocomplete="off">
          </div>

          <div style="margin-bottom:12px;">
            <button class="btn-secondary" style="width:100%;" onclick="FD_Weather.detectCurrentLocation()">
              🎯 ${t('weather.detect_location', {}, 'Use My Current Location')}
            </button>
          </div>

          <div id="weatherSearchResults" class="weather-search-results">
            <!-- Search results rendered dynamically -->
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const input = document.getElementById('weatherSearchInput');
    let debounceTimer = null;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = input.value.trim();
      if (query.length < 2) {
        document.getElementById('weatherSearchResults').innerHTML = '';
        return;
      }
      debounceTimer = setTimeout(async () => {
        const results = await searchLocations(query);
        renderLocationResults(results);
      }, 350);
    });

    input.focus();
  }

  function renderLocationResults(results) {
    const box = document.getElementById('weatherSearchResults');
    if (!box) return;

    if (!results || results.length === 0) {
      box.innerHTML = `<div class="search-empty">No matching locations found. Try another city or district.</div>`;
      return;
    }

    box.innerHTML = results.map((r, i) => `
      <div class="loc-result-item" onclick='FD_Weather.selectLocation(${JSON.stringify(r)})'>
        <strong>${escapeHtml(r.name)}</strong>
        <span>${escapeHtml(r.admin1 || '')}${r.admin1 && r.country ? ', ' : ''}${escapeHtml(r.country || '')}</span>
      </div>
    `).join('');
  }

  function selectLocation(loc) {
    setActiveLocation(loc);

    // Also update farmer's profile in backend if logged in
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      if (token && user) {
        user.location = `${loc.name}${loc.admin1 ? ', ' + loc.admin1 : ''}`;
        localStorage.setItem('user', JSON.stringify(user));
        
        const apiUrl = window.API_URL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api');
        fetch(`${apiUrl}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ location: user.location })
        }).catch(err => console.warn('Profile location update warning:', err.message));
      }
    } catch (e) {}

    // Close modal
    const modal = document.getElementById('weatherLocationModal');
    if (modal) modal.classList.remove('active');

    // Refresh active weather cards
    refreshOverviewWeather(true);
    if (document.getElementById('dedicatedWeatherContainer')) {
      renderExtendedWeatherView('dedicatedWeatherContainer');
    }

    if (window.showToast) {
      window.showToast(`Location set to ${loc.name}! Refreshing forecast...`, 'success');
    }
  }

  // Optional convenience: browser geolocation
  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const detected = {
          name: 'My Farm Location',
          admin1: '',
          country: 'India',
          latitude: lat,
          longitude: lon,
          timezone: 'auto'
        };
        selectLocation(detected);
      },
      (err) => {
        alert('Could not access location. Please type your city or district in the search box.');
      },
      { timeout: 8000 }
    );
  }

  function refreshOverviewWeather(force = true) {
    renderOverviewWeatherCard('overviewWeatherCard');
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    getActiveLocation,
    fetchForecast,
    renderOverviewWeatherCard,
    renderExtendedWeatherView,
    openLocationModal,
    detectCurrentLocation,
    selectLocation,
    refreshOverviewWeather
  };
})();

window.FD_Weather = FD_Weather;
