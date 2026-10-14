/**
 * Cocktail Party Menu - Mobile Web Application Logic
 * No Emojis used anywhere.
 */

const isBarPage = document.body.dataset.page === 'bar';
let previousFocus = null;
let detailBackPending = false;
let lockedScrollPosition = null;

// Application State
const state = {
  cocktails: [],
  activeCategory: isBarPage ? 'all' : 'featured',
  activeAbv: 'all',
  activeStyle: 'all',
  activeTaste: 'all',
  loadError: false,
  activeDetailId: null
};

// Glass silhouettes share a consistent viewBox; serving glass comes from the data.
const glassPaths = {
  plastic: '<path d="M14 6h20l-1.5 34a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2L14 6Z"/><rect x="19" y="12" width="9" height="9" rx="1.5" transform="rotate(12 23.5 16.5)"/><rect x="20" y="26" width="9" height="9" rx="1.5" transform="rotate(-12 24.5 30.5)"/>',
  cocktail: '<path d="M7 8h34L24 26 7 8ZM24 26v14M15 41h18M12 13h24"/>',
  rocks: '<path d="M9 16h30l-1.5 23a2 2 0 0 1-2 2h-23a2 2 0 0 1-2-2L9 16Z"/><rect x="14" y="23" width="9" height="9" rx="1.5" transform="rotate(-12 18.5 27.5)"/><rect x="26" y="27" width="8" height="8" rx="1.5" transform="rotate(12 30 31)"/>'
};
const glassIcons = Object.fromEntries(Object.entries(glassPaths).map(([key, path]) => [key,
  `<svg class="glass-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`
]));
function getGlassType(cocktail) { return cocktail.glassType || 'plastic'; }

// Validate once on loading; escape only at the HTML rendering boundary.
function readCocktails(data) {
  if (!Array.isArray(data.cocktails)) throw new Error('cocktails must be an array');
  const ids = new Set();
  return data.cocktails.map(c => {
    if (!c || typeof c.id !== 'string' || !/^[A-Z]+-\d+$/.test(c.id) || ids.has(c.id)) {
      throw new Error('Missing or duplicate cocktail ID');
    }
    ids.add(c.id);
    for (const key of ['name', 'description', 'base', 'style', 'category']) {
      if (typeof c[key] !== 'string') throw new Error(`${c.id}: invalid ${key}`);
    }
    for (const [key, max] of [['abv', 100], ['sweetness', 5], ['sourness', 5]]) {
      if (!Number.isFinite(c[key]) || c[key] < 0 || c[key] > max) throw new Error(`${c.id}: invalid ${key}`);
    }
    if (!Array.isArray(c.ingredients) || !c.ingredients.length || c.ingredients.some(i => !i || typeof i.item !== 'string' || typeof i.amount !== 'string')) {
      throw new Error(`${c.id}: invalid ingredients`);
    }
    if (!Object.hasOwn(glassIcons, c.glassType)) throw new Error(`${c.id}: invalid glassType`);
    if (typeof c.featured !== 'boolean') throw new Error(`${c.id}: invalid featured`);
    return {...c, recipeNote: c.recipeNote || '', archiveReason: c.archiveReason || ''};
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}

function displayCocktail(c) {
  const result = {...c};
  for (const key of ['id', 'name', 'description', 'base', 'style', 'recipeNote', 'archiveReason']) result[key] = escapeHtml(c[key] ?? '');
  result.ingredients = c.ingredients.map(i => ({item: escapeHtml(i.item), amount: escapeHtml(i.amount)}));
  return result;
}

function abvClassFor(abv) {
  return abv <= 10 ? 'abv-light' : abv <= 20 ? 'abv-medium' : 'abv-strong';
}

// DOM Elements
const elements = {
  cocktailGrid: document.getElementById('cocktailGrid'),
  resultsCount: document.getElementById('resultsCount'),
  emptyState: document.getElementById('emptyState'),
  categoryTabs: document.getElementById('categoryTabs'),
  btnFilterToggle: document.getElementById('btnFilterToggle'),
  filterPanel: document.getElementById('filterPanel'),
  btnResetFilters: document.getElementById('btnResetFilters'),
  btnEmptyReset: document.getElementById('btnEmptyReset'),
  
  // Modals
  detailModal: document.getElementById('detailModal'),
  modalDetailContent: document.getElementById('modalDetailContent'),
  btnCloseDetail: document.getElementById('btnCloseDetail'),
  
  toast: document.getElementById('toast')
};

// Initialize App
async function initApp() {
  setupEventListeners();
  await fetchCocktailData();
  if (history.state?.cocktailDetailId) openDetailModal(history.state.cocktailDetailId, false);
}

// Fetch Cocktails JSON (with cache busting)
async function fetchCocktailData() {
  state.loadError = false;
  elements.resultsCount.textContent = '칵테일 불러오는 중...';
  document.getElementById('loadError').hidden = true;
  try {
    const res = await fetch('cocktails.json?t=' + Date.now());
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    state.cocktails = readCocktails(data);
  } catch (err) {
    console.error('Failed to load cocktails data:', err);
    state.loadError = true;
  }
  renderApp();
}

// Event Listeners
function setupEventListeners() {
  elements.detailModal.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeModal(elements.detailModal);
  });
  window.addEventListener('popstate', (event) => {
    detailBackPending = false;
    const id = event.state?.cocktailDetailId;
    if (id) openDetailModal(id, false);
    else closeModal(elements.detailModal, true);
  });
  document.getElementById('btnRetry').addEventListener('click', fetchCocktailData);
  // Category Tabs
  elements.categoryTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.cat-tab');
    if (!tab) return;
    
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeCategory = tab.dataset.cat;
    renderApp();
  });

  // Filter Toggle
  elements.btnFilterToggle.addEventListener('click', () => {
    const expanded = elements.filterPanel.classList.toggle('open');
    elements.filterPanel.inert = !expanded;
    elements.btnFilterToggle.setAttribute('aria-expanded', String(expanded));
    elements.btnFilterToggle.classList.toggle('active');
  });

  // Filter Chips
  setupChipGroup('#abvChips', (val) => { state.activeAbv = val; });
  setupChipGroup('#styleChips', (val) => { state.activeStyle = val; });
  setupChipGroup('#tasteChips', (val) => { state.activeTaste = val; });

  // Reset Filters
  elements.btnResetFilters.addEventListener('click', resetFilters);
  elements.btnEmptyReset.addEventListener('click', () => {
    resetFilters();
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.cat-tab[data-cat="all"]').classList.add('active');
    state.activeCategory = 'all';
    renderApp();
  });

  document.addEventListener('keydown', (e) => {
    if (!elements.detailModal.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal(elements.detailModal);
    if (e.key === 'Tab') {
      const buttons = [...elements.detailModal.querySelectorAll('button')];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Modals Close on backdrop or button
  elements.btnCloseDetail.addEventListener('click', () => closeModal(elements.detailModal));
  elements.detailModal.addEventListener('click', (e) => {
    if (e.target === elements.detailModal) closeModal(elements.detailModal);
  });
}

function setupChipGroup(selector, onSelect) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const val = chip.dataset.abv || chip.dataset.style || chip.dataset.taste;
    onSelect(val);
    renderApp();
  });
}

function resetFilters() {
  state.activeAbv = 'all';
  state.activeStyle = 'all';
  state.activeTaste = 'all';

  document.querySelectorAll('#abvChips .filter-chip, #styleChips .filter-chip, #tasteChips .filter-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('#abvChips [data-abv="all"]').classList.add('active');
  document.querySelector('#styleChips [data-style="all"]').classList.add('active');
  document.querySelector('#tasteChips [data-taste="all"]').classList.add('active');

  renderApp();
}

// Filter Logic
function getFilteredCocktails() {
  const list = state.cocktails.filter(c => {
    // Category match
    if (state.activeCategory === 'featured') {
      if (!c.featured) return false;
    } else if (state.activeCategory !== 'all') {
      const isMultiSpirit = c.category === 'cocktail' &&
        ['gin', 'vodka', 'rum', 'tequila'].includes(state.activeCategory);
      if (c.category !== state.activeCategory && !isMultiSpirit) {
        return false;
      }
    }

    // ABV match
    if (state.activeAbv === 'light' && c.abv > 10) return false;
    if (state.activeAbv === 'medium' && (c.abv <= 10 || c.abv > 20)) return false;
    if (state.activeAbv === 'strong' && c.abv <= 20) return false;

    // Style match ('롱드링크' or '숏드링크')
    if (state.activeStyle === 'long' && !c.style.includes('롱드링크')) return false;
    if (state.activeStyle === 'short' && !c.style.includes('숏드링크')) return false;

    // Taste match
    if (state.activeTaste === 'sweet' && c.sweetness < 3) return false;
    if (state.activeTaste === 'sour' && c.sourness < 3) return false;
    if (state.activeTaste === 'dry' && c.sweetness > 2) return false;

    return true;
  });

  return list;
}

// Render Application View
function renderApp() {
  document.getElementById('loadError').hidden = !state.loadError;
  if (state.loadError) {
    elements.resultsCount.textContent = '데이터를 불러오지 못했습니다.';
    elements.cocktailGrid.innerHTML = '';
    elements.emptyState.classList.add('hidden');
    return;
  }
  const filtered = getFilteredCocktails();
  
  if (state.activeCategory === 'featured' && state.activeAbv === 'all' && state.activeStyle === 'all' && state.activeTaste === 'all') {
    elements.resultsCount.textContent = `추천 칵테일 (${filtered.length}종)`;
  } else {
    elements.resultsCount.textContent = `${isBarPage ? '보관 레시피' : '파티 메뉴'} · ${filtered.length}종`;
  }

  if (filtered.length === 0) {
    elements.cocktailGrid.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.cocktailGrid.innerHTML = filtered.map(c => createCocktailCardHtml(c)).join('');

  // Attach card event listeners
  elements.cocktailGrid.querySelectorAll('.cocktail-card').forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailModal(card.dataset.id); }
    });
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      openDetailModal(id);
    });
  });
}

// Generate Card HTML
function createCocktailCardHtml(c) {
  c = displayCocktail(c);
  const glass = getGlassType(c);

  // ABV Badge Class
  const abvClass = abvClassFor(c.abv);

  // Taste dots
  const sweetDots = Array.from({ length: 5 }, (_, i) => 
    `<span class="meter-dot ${i < c.sweetness ? 'filled sweet' : ''}"></span>`
  ).join('');

  const sourDots = Array.from({ length: 5 }, (_, i) => 
    `<span class="meter-dot ${i < c.sourness ? 'filled sour' : ''}"></span>`
  ).join('');

  const visualContent = glassIcons[glass];

  // Top header: Only show '추천' tag if featured, otherwise blank
  const topTagHtml = c.featured 
    ? `<span class="featured-tag">추천</span>` 
    : ``;

  return `
    <article class="cocktail-card" data-id="${c.id}" tabindex="0" role="button" aria-label="${c.name} 레시피 보기">
      <div class="card-main">
        <div class="cocktail-visual">
          ${visualContent}
        </div>
        <div class="cocktail-info">
          <div class="card-title-row">
            <h3 class="cocktail-name">${c.name}</h3>
            ${topTagHtml}
          </div>
          <p class="cocktail-desc-preview">${c.description}</p>
        </div>
      </div>

      <div class="taste-meters">
        <div class="meter-item">
          <span class="meter-label">단맛</span>
          <div class="meter-dots">${sweetDots}</div>
        </div>
        <div class="meter-item">
          <span class="meter-label">산미</span>
          <div class="meter-dots">${sourDots}</div>
        </div>
        <span class="abv-badge ${abvClass}">ALC ${c.abv}%</span>
      </div>
    </article>
  `;
}

// Detail Modal
function openDetailModal(id, addHistory = true) {
  if (detailBackPending) return;
  const cocktail = state.cocktails.find(item => item.id === id);
  if (!cocktail) return;
  const c = displayCocktail(cocktail);

  if (addHistory && history.state?.cocktailDetailId !== id) {
    history.pushState({...history.state, cocktailDetailId: id}, '', location.href);
  }
  state.activeDetailId = id;
  const glass = getGlassType(c);

  const abvClass = abvClassFor(c.abv);

  const sweetPct = (c.sweetness / 5) * 100;
  const sourPct = (c.sourness / 5) * 100;

  const ingredientsHtml = c.ingredients.map(ing => `
    <li class="recipe-item">
      <span class="item-name">${ing.item}</span>
      <span class="item-amt">${ing.amount}</span>
    </li>
  `).join('');

  const visualContent = glassIcons[glass];

  const leadBadgeHtml = c.featured 
    ? `<span class="featured-tag modal-tag">파티 추천</span>` 
    : ``;

  elements.modalDetailContent.innerHTML = `
    <div class="detail-header-block">
      <div class="detail-visual">
        ${visualContent}
      </div>
      <div class="detail-title-block">
        ${leadBadgeHtml}
        <h2 class="detail-name" id="modalTitle">${c.name}</h2>
        <div class="detail-tags">
          <span class="tag-pill">${c.base}</span>
          <span class="tag-pill">${c.style}</span>
          <span class="tag-pill abv-badge ${abvClass}">ALC ${c.abv}%</span>
        </div>
      </div>
    </div>

    <div class="detail-desc-box">
      ${c.description}
      ${c.recipeNote ? `<p class="recipe-note">${c.recipeNote}</p>` : ''}
      ${isBarPage ? `<p class="recipe-note">보관 사유: ${c.archiveReason}</p>` : ''}
      <p class="recipe-note">도수는 기존 레시피의 추정치이며, 실제 제품과 얼음 희석량에 따라 달라집니다.</p>
    </div>

    <h4 class="detail-section-title">맛 프로필 (Taste Profile)</h4>
    <div class="taste-bar-grid">
      <div class="taste-bar-box">
        <div class="taste-bar-head">
          <span>단맛 (Sweetness)</span>
          <span>${c.sweetness} / 5</span>
        </div>
        <div class="taste-meter-track">
          <div class="taste-meter-fill sweet" style="width: ${sweetPct}%"></div>
        </div>
      </div>

      <div class="taste-bar-box">
        <div class="taste-bar-head">
          <span>산미 (Sourness)</span>
          <span>${c.sourness} / 5</span>
        </div>
        <div class="taste-meter-track">
          <div class="taste-meter-fill sour" style="width: ${sourPct}%"></div>
        </div>
      </div>
    </div>

    <h4 class="detail-section-title">레시피 구성 (Recipe)</h4>
    <ul class="recipe-list">
      ${ingredientsHtml}
    </ul>

    <div class="detail-actions">
      <button id="btnDetailClose" class="btn-action">
        확인 및 닫기
      </button>
    </div>
  `;

  document.getElementById('btnDetailClose').addEventListener('click', () => {
    closeModal(elements.detailModal);
  });

  openModal(elements.detailModal);
}

// Modal Helpers
function openModal(modalEl) {
  if (!lockedScrollPosition) {
    previousFocus = document.activeElement;
    lockedScrollPosition = {x: window.scrollX, y: window.scrollY};
    document.body.style.setProperty('--locked-scroll-top', `-${lockedScrollPosition.y}px`);
    document.documentElement.classList.add('modal-scroll-locked');
    document.body.classList.add('modal-scroll-locked');
  }
  if (!modalEl.open) modalEl.showModal();
  modalEl.classList.add('open');
  modalEl.setAttribute('aria-hidden', 'false');
  document.querySelector('header').inert = true;
  document.querySelector('main').inert = true;
  elements.modalDetailContent.scrollTop = 0;
  elements.btnCloseDetail.focus({preventScroll: true});
}

function closeModal(modalEl, fromHistory = false) {
  if (!fromHistory && history.state?.cocktailDetailId) {
    if (!detailBackPending) {
      detailBackPending = true;
      history.back();
    }
    return;
  }
  if (!modalEl.classList.contains('open')) return;
  modalEl.classList.remove('open');
  modalEl.close();
  modalEl.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('modal-scroll-locked');
  document.body.classList.remove('modal-scroll-locked');
  document.body.style.removeProperty('--locked-scroll-top');
  document.querySelector('header').inert = false;
  document.querySelector('main').inert = false;
  previousFocus?.focus({preventScroll: true});
  if (lockedScrollPosition) {
    window.scrollTo({left: lockedScrollPosition.x, top: lockedScrollPosition.y, behavior: 'instant'});
    lockedScrollPosition = null;
  }
  if (modalEl === elements.detailModal) {
    state.activeDetailId = null;
  }
}

// Toast Notification
let toastTimer = null;
function showToast(msg) {
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2200);
}

// Kick off
document.addEventListener('DOMContentLoaded', initApp);
