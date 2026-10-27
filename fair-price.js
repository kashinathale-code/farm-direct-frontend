// ============================================================================
// FARM DIRECT — FAIR PRICE METER & MIDDLEMAN SAVINGS CALCULATOR
// ============================================================================

const FD_FairPrice = (function () {
  'use strict';

  let cachedBenchmarks = null;
  let benchmarksFetchTime = 0;
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  // --------------------------------------------------------------------------
  // API Calls & Data Fetching
  // --------------------------------------------------------------------------

  // Fetch benchmark summary for all active platform crops
  async function fetchPlatformBenchmarks(force = false) {
    const now = Date.now();
    if (!force && cachedBenchmarks && (now - benchmarksFetchTime < CACHE_TTL_MS)) {
      return cachedBenchmarks;
    }

    try {
      const apiUrl = window.API_URL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api');
      const res = await fetch(`${apiUrl}/crops/price-insights?all=true`);
      if (!res.ok) throw new Error('Failed to fetch price insights');
      const data = await res.json();
      
      // Index by normalized crop name for O(1) lookup
      const map = {};
      if (Array.isArray(data.benchmarks)) {
        data.benchmarks.forEach(b => {
          map[b.normalized_name] = b;
        });
      }
      cachedBenchmarks = map;
      benchmarksFetchTime = now;
      return cachedBenchmarks;
    } catch (err) {
      console.warn('FD_FairPrice: Could not load platform benchmarks', err.message);
      return cachedBenchmarks || {};
    }
  }

  // Fetch tailored benchmark for a specific crop listing
  async function fetchListingBenchmark(cropId) {
    try {
      const apiUrl = window.API_URL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api');
      const res = await fetch(`${apiUrl}/crops/${cropId}/price-benchmark`);
      if (!res.ok) throw new Error('Benchmark fetch failed');
      return await res.json();
    } catch (err) {
      console.error('fetchListingBenchmark error:', err);
      return null;
    }
  }

  // Fetch benchmark by crop name, farmer price, and region
  async function fetchCropBenchmark(cropName, farmerPrice = null, region = null, farmerId = null) {
    try {
      const apiUrl = window.API_URL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api');
      let url = `${apiUrl}/crops/price-insights?crop_name=${encodeURIComponent(cropName)}`;
      if (farmerPrice != null) url += `&farmer_price=${encodeURIComponent(farmerPrice)}`;
      if (region) url += `&region=${encodeURIComponent(region)}`;
      if (farmerId) url += `&farmer_id=${encodeURIComponent(farmerId)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Benchmark query failed');
      return await res.json();
    } catch (err) {
      console.error('fetchCropBenchmark error:', err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // FEATURE 1A: Farmer Fair Price Meter Renderer
  // --------------------------------------------------------------------------

  function renderFairPriceMeter(container, benchmarkData) {
    if (!container) return;
    const t = window.t || ((k, p, fb) => fb || k);

    if (!benchmarkData || benchmarkData.status === 'insufficient_data' || !benchmarkData.comparison_average) {
      container.innerHTML = `
        <div class="meter-card insufficient">
          <div class="meter-card-header">
            <div class="meter-badge neutral">
              <span>⚖️ ${t('fair_price.meter_title', {}, 'Fair Price Meter')}</span>
            </div>
            <span class="meter-status-tag insufficient">${t('fair_price.insufficient_data', {}, 'Not enough comparable listings yet')}</span>
          </div>

          <div class="insufficient-msg-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <strong>${t('fair_price.insufficient_data', {}, 'Not enough comparable listings yet')}</strong>
              <p>${t('fair_price.insufficient_hint', {}, 'At least 2 active listings of the same crop are required to calculate a reliable benchmark average.')}</p>
            </div>
          </div>

          <div class="meter-footer-meta">
            <span>${t('fair_price.based_on', { count: benchmarkData ? benchmarkData.listing_count || 0 : 0 }, `Based on ${benchmarkData ? benchmarkData.listing_count || 0 : 0} active listing(s)`)}</span>
            <span class="meter-disclaimer">${t('fair_price.disclaimer', {}, 'Benchmark is calculated solely from active Farm Direct platform listings.')}</span>
          </div>
        </div>
      `;
      return;
    }

    const {
      crop_name,
      farmer_price,
      comparison_average,
      min_price,
      max_price,
      listing_count,
      percentage_difference,
      difference_per_kg,
      benchmark_status,
      comparison_scope,
      region,
      calculated_at
    } = benchmarkData;

    // Determine visual status and messages
    let statusClass = 'around';
    let statusLabel = t('fair_price.status_around', {}, 'Around platform average');
    let explanationMsg = t('fair_price.around_msg', {}, 'Your price is within 5% of the Farm Direct average.');

    if (benchmark_status === 'below') {
      statusClass = 'below';
      statusLabel = t('fair_price.status_below', {}, 'Below platform average');
      explanationMsg = t('fair_price.below_msg', { pct: Math.abs(percentage_difference).toFixed(1) }, `Your price is ${Math.abs(percentage_difference).toFixed(1)}% below the Farm Direct average.`);
    } else if (benchmark_status === 'above') {
      statusClass = 'above';
      statusLabel = t('fair_price.status_above', {}, 'Above platform average');
      explanationMsg = t('fair_price.above_msg', { pct: Math.abs(percentage_difference).toFixed(1) }, `Your price is ${Math.abs(percentage_difference).toFixed(1)}% above the Farm Direct average.`);
    }

    // Gauge pointer position: map percentage difference (-30% to +30%) to (5% to 95%)
    const clampedPct = Math.max(-30, Math.min(30, percentage_difference || 0));
    const pointerPercent = Math.round(((clampedPct + 30) / 60) * 90 + 5);

    const scopeLabel = comparison_scope === 'regional'
      ? `${t('fair_price.scope_regional', {}, 'Regional Benchmark')} (${escapeHtml(region || '')})`
      : t('fair_price.scope_platform', {}, 'Platform-wide Benchmark');

    const formattedTime = calculated_at ? new Date(calculated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently';

    container.innerHTML = `
      <div class="meter-card ${statusClass}">
        <div class="meter-card-header">
          <div>
            <div class="meter-crop-title">
              <strong>${escapeHtml(crop_name)}</strong>
              <span class="meter-scope-pill">${scopeLabel}</span>
            </div>
            <div class="meter-subtitle">${t('fair_price.based_on', { count: listing_count }, `Based on ${listing_count} comparable active listing(s)`)}</div>
          </div>
          <div class="meter-status-pill ${statusClass}">
            ${statusLabel}
          </div>
        </div>

        <!-- Prices comparison row -->
        <div class="meter-comparison-grid">
          <div class="meter-price-box farmer">
            <span class="price-box-label">${t('fair_price.farmer_price', {}, 'Your Listed Price')}</span>
            <span class="price-box-val">₹${Number(farmer_price).toFixed(2)}<small>/kg</small></span>
          </div>

          <div class="meter-diff-badge ${statusClass}">
            <span class="diff-arrow">${percentage_difference < 0 ? '↓' : (percentage_difference > 0 ? '↑' : '≈')}</span>
            <span class="diff-val">${percentage_difference > 0 ? '+' : ''}${percentage_difference}%</span>
            <span class="diff-sub">(${difference_per_kg > 0 ? '+' : ''}₹${difference_per_kg}/kg)</span>
          </div>

          <div class="meter-price-box platform">
            <span class="price-box-label">${t('fair_price.platform_avg', {}, 'Farm Direct Benchmark')}</span>
            <span class="price-box-val">₹${Number(comparison_average).toFixed(2)}<small>/kg</small></span>
          </div>
        </div>

        <!-- Visual 3-Zone Gauge Meter -->
        <div class="meter-gauge-container">
          <div class="meter-gauge-track">
            <div class="gauge-zone zone-below" title="Below average (competitive)">
              <span>Below Avg (&lt; -5%)</span>
            </div>
            <div class="gauge-zone zone-around" title="Near platform benchmark">
              <span>Fair Market (±5%)</span>
            </div>
            <div class="gauge-zone zone-above" title="Above average (premium)">
              <span>Above Avg (&gt; +5%)</span>
            </div>
            <!-- Dynamic Pin Pointer -->
            <div class="gauge-pointer" style="left: ${pointerPercent}%;" aria-label="Current price position: ${percentage_difference}%">
              <div class="pointer-pin"></div>
              <div class="pointer-label">${percentage_difference > 0 ? '+' : ''}${percentage_difference}%</div>
            </div>
          </div>
          <div class="meter-gauge-scale">
            <span>₹${min_price}/kg</span>
            <span>Avg: ₹${comparison_average}/kg</span>
            <span>₹${max_price}/kg</span>
          </div>
        </div>

        <!-- Accessible plain-text feedback -->
        <div class="meter-feedback-row ${statusClass}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            ${benchmark_status === 'below' 
              ? '<polyline points="20 6 9 17 4 12"></polyline>' 
              : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'}
          </svg>
          <span>${explanationMsg}</span>
        </div>

        <!-- Footer Meta & Disclaimers -->
        <div class="meter-footer-meta">
          <span>${t('fair_price.refreshed_at', { time: formattedTime }, `Calculated at: ${formattedTime}`)}</span>
          <p class="meter-disclaimer">${t('fair_price.disclaimer', {}, 'Benchmark is calculated solely from active Farm Direct platform listings. Not an official government APMC mandi price or verified national rate.')}</p>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // FEATURE 1B: Buyer Price Comparison Badges
  // --------------------------------------------------------------------------

  function getBuyerBadgeHtml(crop) {
    if (!crop || !cachedBenchmarks) return '';
    const t = window.t || ((k, p, fb) => fb || k);

    const normName = (crop.crop_name || '').trim().toLowerCase();
    const benchmark = cachedBenchmarks[normName];

    if (!benchmark || benchmark.status === 'insufficient_data' || !benchmark.comparison_average) {
      return `<span class="badge-price-neutral" title="${t('fair_price.insufficient_hint', {}, 'Benchmarking in progress (insufficient comparable listings)')}">🌱 ${t('common.verified_origin', {}, 'Direct Farm Price')}</span>`;
    }

    const price = Number(crop.price_per_kg);
    const avg = Number(benchmark.comparison_average);
    if (!avg || avg <= 0 || !price) return '';

    const diff = price - avg;
    const pctDiff = Number((((price - avg) / avg) * 100).toFixed(1));

    // Clear 5% threshold rule
    if (pctDiff <= -5.0) {
      const absPct = Math.abs(pctDiff);
      return `<span class="badge-price-deal" title="${absPct}% ${t('fair_price.status_below', {}, 'below platform average')} (₹${avg}/kg)">✨ ${t('fair_price.good_deal', {}, 'Good Deal')} · ${absPct}% ${t('fair_price.status_below', {}, 'below avg')}</span>`;
    } else if (pctDiff >= 5.0) {
      return `<span class="badge-price-above" title="${pctDiff}% ${t('fair_price.status_above', {}, 'above platform average')} (₹${avg}/kg)">🏷️ ${t('fair_price.status_above', {}, 'Above platform avg')} (₹${avg}/kg)</span>`;
    } else {
      return `<span class="badge-price-fair" title="${t('fair_price.status_around', {}, 'Around platform average')} (₹${avg}/kg)">⚖️ ${t('fair_price.status_around', {}, 'Around platform avg')} (₹${avg}/kg)</span>`;
    }
  }

  // --------------------------------------------------------------------------
  // FEATURE 1C: Middleman Savings Calculator
  // --------------------------------------------------------------------------

  function initSavingsCalculator(containerId, farmerCrops = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const t = window.t || ((k, p, fb) => fb || k);

    container.innerHTML = `
      <div class="calc-card">
        <div class="calc-header">
          <div class="calc-title-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <line x1="6" y1="8" x2="6" y2="8"></line>
              <line x1="10" y1="8" x2="10" y2="8"></line>
              <line x1="14" y1="8" x2="14" y2="8"></line>
              <line x1="18" y1="8" x2="18" y2="8"></line>
              <line x1="6" y1="12" x2="18" y2="12"></line>
              <line x1="6" y1="16" x2="18" y2="16"></line>
            </svg>
            <h3>${t('calc.title', {}, 'Middleman Savings Calculator')}</h3>
          </div>
          <p class="calc-subtitle">${t('calc.subtitle', {}, 'Estimate additional gross revenue earned by selling directly to buyers instead of local middlemen or traditional mandis.')}</p>
        </div>

        <form id="savingsCalcForm" class="calc-form" onsubmit="return false;">
          <!-- Existing Crop Prefill Selector -->
          ${farmerCrops && farmerCrops.length > 0 ? `
            <div class="input-group">
              <label class="field-label" for="calcCropSelect">${t('calc.select_listing_hint', {}, 'Prefill from an existing listing (optional):')}</label>
              <select id="calcCropSelect" class="calc-select">
                <option value="">${t('fair_price.select_crop_default', {}, '-- Select a Listed Crop --')}</option>
                ${farmerCrops.map(c => `
                  <option value="${c.id}" data-name="${escapeHtml(c.crop_name)}" data-price="${c.price_per_kg}" data-qty="${c.quantity_available}">
                    ${escapeHtml(c.crop_name)} — ₹${c.price_per_kg}/kg (${c.quantity_available} kg)
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <div class="form-grid-2">
            <div class="input-group">
              <label class="field-label" for="calcCropName">${t('calc.crop_name', {}, 'Crop Name')}</label>
              <input type="text" id="calcCropName" placeholder="${t('calc.crop_name_placeholder', {}, 'e.g. Wheat, Tomato, Onion')}" value="Wheat">
            </div>

            <div class="input-group">
              <label class="field-label" for="calcQuantity">${t('calc.quantity', {}, 'Quantity to Sell (kg)')}</label>
              <input type="number" id="calcQuantity" min="1" step="1" placeholder="${t('calc.quantity_placeholder', {}, 'e.g. 500')}" value="500">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="input-group">
              <label class="field-label" for="calcMandiPrice">${t('calc.mandi_price', {}, 'Local Mandi / Middleman Price (₹/kg)')}</label>
              <div class="input-currency-wrap">
                <span class="currency-prefix">₹</span>
                <input type="number" id="calcMandiPrice" min="0.1" step="0.5" placeholder="${t('calc.mandi_price_placeholder', {}, 'e.g. 20')}" value="20">
              </div>
            </div>

            <div class="input-group">
              <label class="field-label" for="calcDirectPrice">${t('calc.direct_price', {}, 'Proposed Direct-Selling Price (₹/kg)')}</label>
              <div class="input-currency-wrap">
                <span class="currency-prefix">₹</span>
                <input type="number" id="calcDirectPrice" min="0.1" step="0.5" placeholder="${t('calc.direct_price_placeholder', {}, 'e.g. 25')}" value="25">
              </div>
            </div>
          </div>
        </form>

        <!-- Live Results Box -->
        <div id="calcResultsBox" class="calc-results-wrap">
          <!-- Populated dynamically by calculateSavings() -->
        </div>

        <div class="calc-disclaimer-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <p>${t('calc.disclaimer', {}, 'Financial Disclaimer: This calculation is a hypothetical estimate based strictly on the values you entered. It represents estimated gross price difference and does not account for transport, packaging, platform fees, labor, spoilage, or taxes. It does not represent guaranteed net profit.')}</p>
        </div>
      </div>
    `;

    // Bind event listeners
    const cropSelect = document.getElementById('calcCropSelect');
    const cropNameInput = document.getElementById('calcCropName');
    const mandiPriceInput = document.getElementById('calcMandiPrice');
    const directPriceInput = document.getElementById('calcDirectPrice');
    const qtyInput = document.getElementById('calcQuantity');

    if (cropSelect) {
      cropSelect.addEventListener('change', () => {
        const selected = cropSelect.options[cropSelect.selectedIndex];
        if (selected && selected.value) {
          cropNameInput.value = selected.getAttribute('data-name') || '';
          directPriceInput.value = selected.getAttribute('data-price') || '25';
          qtyInput.value = selected.getAttribute('data-qty') || '500';
          calculateSavings();
        }
      });
    }

    [cropNameInput, mandiPriceInput, directPriceInput, qtyInput].forEach(inp => {
      if (inp) {
        inp.addEventListener('input', calculateSavings);
      }
    });

    // Initial calculation
    calculateSavings();
  }

  // Pure browser calculator with safe input handling
  function calculateSavings() {
    const resultsBox = document.getElementById('calcResultsBox');
    if (!resultsBox) return;
    const t = window.t || ((k, p, fb) => fb || k);

    const mandiPrice = parseFloat(document.getElementById('calcMandiPrice')?.value);
    const directPrice = parseFloat(document.getElementById('calcDirectPrice')?.value);
    const quantity = parseFloat(document.getElementById('calcQuantity')?.value);

    // Validate inputs
    if (isNaN(mandiPrice) || isNaN(directPrice) || isNaN(quantity) || mandiPrice <= 0 || directPrice <= 0 || quantity <= 0) {
      resultsBox.innerHTML = `
        <div class="calc-empty-hint">
          <span>ℹ️ Please enter valid positive values for Mandi Price, Direct Price, and Quantity.</span>
        </div>
      `;
      return;
    }

    // Formulas:
    // Estimated difference per kg = Direct-selling price − Comparison price
    // Estimated difference for quantity = Estimated difference per kg × Quantity
    // Percentage difference = (Estimated difference per kg / Comparison price) × 100
    const diffPerKg = Number((directPrice - mandiPrice).toFixed(2));
    const totalGrossDiff = Number((diffPerKg * quantity).toFixed(2));
    const pctDiff = Number(((diffPerKg / mandiPrice) * 100).toFixed(2));

    const isPositive = diffPerKg >= 0;
    const formattedTotal = Math.abs(totalGrossDiff).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const formattedDiffPerKg = Math.abs(diffPerKg).toFixed(2);

    resultsBox.innerHTML = `
      <div class="calc-results-card ${isPositive ? 'positive' : 'negative'}">
        <div class="results-top-row">
          <div class="result-highlight-badge">
            <span class="highlight-title">${t('calc.total_diff_label', {}, 'Estimated Additional Gross Amount')}</span>
            <span class="highlight-val ${isPositive ? 'green' : 'amber'}">
              ${isPositive ? '+' : '-'}₹${formattedTotal}
            </span>
            <span class="highlight-sub">
              ${isPositive ? 'Gain over traditional middleman' : 'Lower than comparison price'} (${quantity} kg)
            </span>
          </div>

          <div class="result-pct-pill ${isPositive ? 'positive' : 'negative'}">
            <span>${isPositive ? '▲ +' : '▼ -'}${Math.abs(pctDiff)}%</span>
            <small>${t('calc.pct_diff_label', {}, 'vs Mandi Price')}</small>
          </div>
        </div>

        ${!isPositive ? `
          <div class="unfavorable-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>${t('calc.unfavorable_notice', {}, 'Notice: Proposed direct price is lower than the comparison mandi price. Estimated difference is negative.')}</span>
          </div>
        ` : ''}

        <div class="results-breakdown-grid">
          <div class="breakdown-item">
            <span class="b-label">${t('calc.comp_price_label', {}, 'Mandi Price')}</span>
            <strong class="b-val">₹${mandiPrice.toFixed(2)}/kg</strong>
          </div>
          <div class="breakdown-item">
            <span class="b-label">${t('calc.proposed_price_label', {}, 'Direct-Selling Price')}</span>
            <strong class="b-val">₹${directPrice.toFixed(2)}/kg</strong>
          </div>
          <div class="breakdown-item">
            <span class="b-label">${t('calc.diff_per_kg_label', {}, 'Estimated Difference per kg')}</span>
            <strong class="b-val ${isPositive ? 'green' : 'amber'}">${isPositive ? '+' : '-'}₹${formattedDiffPerKg}/kg</strong>
          </div>
          <div class="breakdown-item">
            <span class="b-label">${t('calc.quantity', {}, 'Selected Quantity')}</span>
            <strong class="b-val">${quantity} kg</strong>
          </div>
        </div>
      </div>
    `;
  }

  // Helper safe escaping
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
    fetchPlatformBenchmarks,
    fetchListingBenchmark,
    fetchCropBenchmark,
    renderFairPriceMeter,
    getBuyerBadgeHtml,
    initSavingsCalculator,
    calculateSavings
  };
})();

window.FD_FairPrice = FD_FairPrice;
