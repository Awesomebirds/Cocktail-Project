/**
 * Cocktail Party Menu - Mobile Web Application Logic
 * No Emojis used anywhere.
 */

// Recommended Popular Cocktails List (Organized by spirit base)
const FEATURED_NAMES = [
  '진 토닉',             // 진
  '스크루드라이버',       // 보드카
  '씨 브리즈',           // 보드카
  '베이 브리즈',         // 보드카
  '코스모폴리탄',         // 보드카
  '섹스 온 더 비치',      // 보드카
  '모스크바 뮬',         // 보드카
  '쿠바 리브레',         // 럼
  '다이키리',            // 럼
  '마가리타',            // 데킬라
  '데킬라 선라이즈',      // 데킬라
  '엘 디아블로 스타일',   // 데킬라
  '갓파더',              // 위스키
  '아마레또 사워',        // 리큐르
  '피치 크러시',         // 리큐르
  '옥보단',              // 리큐르
  '롱 아일랜드 아이스티'  // 멀티 스피릿
];

function isFeaturedCocktail(c) {
  if (c.featured === true) return true;
  const cleanName = (c.name || '').replace(/\s+/g, '');
  return FEATURED_NAMES.some(fn => fn.replace(/\s+/g, '') === cleanName);
}

// Application State
const state = {
  cocktails: [],
  activeCategory: 'featured', // Default view: Featured cocktails
  activeAbv: 'all',
  activeStyle: 'all',
  activeTaste: 'all',
  searchQuery: '',
  activeDetailId: null
};

// SVG Glass Icons (Highball, Cocktail/Coupe, Rocks)
const glassIcons = {
  highball: `
    <svg class="glass-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M7 3h10l-1.5 17a2 2 0 0 1-2 1.8h-3a2 2 0 0 1-2-1.8L7 3z"></path>
      <line x1="8" y1="8" x2="16" y2="8" stroke-dasharray="2 2" opacity="0.6"></line>
      <line x1="16" y1="1" x2="13" y2="10" stroke-width="1.2" opacity="0.5"></line>
    </svg>
  `,
  cocktail: `
    <svg class="glass-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <polygon points="4 4 20 4 12 14 4 4"></polygon>
      <line x1="12" y1="14" x2="12" y2="20"></line>
      <line x1="8" y1="20" x2="16" y2="20"></line>
    </svg>
  `,
  rocks: `
    <svg class="glass-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M6 5h12l-1 14a2 2 0 0 1-2 1.8h-6a2 2 0 0 1-2-1.8L6 5z"></path>
      <rect x="9" y="11" width="6" height="5" rx="1" opacity="0.4"></rect>
    </svg>
  `
};

function getGlassType(cocktail) {
  const method = cocktail.method || '';
  const style = cocktail.style || '';
  const name = cocktail.name || '';

  if (method.includes('온더락')) {
    return 'rocks';
  }
  if (style.includes('롱드링크') || name.includes('토닉') || name.includes('피즈') || name.includes('콜린스') || name.includes('소다') || name.includes('크러시') || name.includes('옥보단') || name.includes('아이스티') || name.includes('뮬')) {
    return 'highball';
  }
  return 'cocktail';
}

// DOM Elements
const elements = {
  cocktailGrid: document.getElementById('cocktailGrid'),
  resultsCount: document.getElementById('resultsCount'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
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
  renderApp();
}

// Fetch Cocktails JSON (with cache busting)
async function fetchCocktailData() {
  try {
    const res = await fetch('cocktails.json?t=' + Date.now());
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    state.cocktails = (data.cocktails || []).map(c => ({
      ...c,
      style: c.style || '',
      featured: isFeaturedCocktail(c)
    }));
  } catch (err) {
    console.error('Failed to load cocktails data:', err);
    elements.resultsCount.textContent = '데이터를 불러오지 못했습니다.';
  }
}

// Event Listeners
function setupEventListeners() {
  // Search
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    elements.clearSearch.classList.toggle('active', state.searchQuery.length > 0);
    renderApp();
  });

  elements.clearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearch.classList.remove('active');
    renderApp();
  });

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
    elements.filterPanel.classList.toggle('open');
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
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearch.classList.remove('active');
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.cat-tab[data-cat="featured"]').classList.add('active');
    state.activeCategory = 'featured';
    renderApp();
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
      const isMultiSpirit = (c.id === 'MIX-001' || c.category === 'cocktail') &&
        ['gin', 'vodka', 'rum', 'tequila'].includes(state.activeCategory);
      if (c.category !== state.activeCategory && !isMultiSpirit) {
        return false;
      }
    }

    // ABV match
    if (state.activeAbv === 'light' && c.abv > 10) return false;
    if (state.activeAbv === 'medium' && (c.abv <= 10 || c.abv > 20)) return false;
    if (state.activeAbv === 'strong' && c.abv <= 20) return false;

    // Style match ('롱드링크' or '숏')
    if (state.activeStyle === 'long' && !c.style.includes('롱드링크')) return false;
    if (state.activeStyle === 'short' && !c.style.includes('숏')) return false;

    // Taste match
    if (state.activeTaste === 'sweet' && c.sweetness < 3) return false;
    if (state.activeTaste === 'sour' && c.sourness < 3) return false;
    if (state.activeTaste === 'dry' && c.sweetness > 2) return false;

    // Search query match (name, description, base, ingredients)
    if (state.searchQuery) {
      const q = state.searchQuery;
      const ingText = c.ingredients.map(i => i.item).join(' ').toLowerCase();
      const inSearch = c.name.toLowerCase().includes(q) ||
                       c.description.toLowerCase().includes(q) ||
                       c.base.toLowerCase().includes(q) ||
                       ingText.includes(q);
      if (!inSearch) return false;
    }

    return true;
  });

  // In default featured view, sort cocktails exactly by the curated spirit-base order
  if (state.activeCategory === 'featured' && !state.searchQuery && state.activeAbv === 'all' && state.activeStyle === 'all' && state.activeTaste === 'all') {
    list.sort((a, b) => {
      const idxA = FEATURED_NAMES.findIndex(fn => fn.replace(/\s+/g, '') === (a.name || '').replace(/\s+/g, ''));
      const idxB = FEATURED_NAMES.findIndex(fn => fn.replace(/\s+/g, '') === (b.name || '').replace(/\s+/g, ''));
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });
  }

  return list;
}

// Render Application View
function renderApp() {
  const filtered = getFilteredCocktails();
  
  if (state.activeCategory === 'featured' && !state.searchQuery && state.activeAbv === 'all' && state.activeStyle === 'all' && state.activeTaste === 'all') {
    elements.resultsCount.textContent = `추천 칵테일 (${filtered.length}종)`;
  } else {
    elements.resultsCount.textContent = `총 ${filtered.length}개의 칵테일`;
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
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      openDetailModal(id);
    });
  });
}

// Generate Card HTML
function createCocktailCardHtml(c) {
  const glass = getGlassType(c);

  // ABV Badge Class
  let abvClass = 'abv-medium';
  if (c.abv <= 10) abvClass = 'abv-light';
  else if (c.abv >= 21) abvClass = 'abv-strong';

  // Taste dots
  const sweetDots = Array.from({ length: 5 }, (_, i) => 
    `<span class="meter-dot ${i < c.sweetness ? 'filled sweet' : ''}"></span>`
  ).join('');

  const sourDots = Array.from({ length: 5 }, (_, i) => 
    `<span class="meter-dot ${i < c.sourness ? 'filled sour' : ''}"></span>`
  ).join('');

  // Fallback image / glass icon
  const visualContent = `
    <img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" loading="lazy">
    <div style="display:none;" class="svg-fallback-wrap">${glassIcons[glass]}</div>
  `;

  // Top header: Only show '추천' tag if featured, otherwise blank
  const topTagHtml = c.featured 
    ? `<span class="featured-tag">추천</span>` 
    : ``;

  return `
    <article class="cocktail-card" data-id="${c.id}">
      <div class="card-top">
        <div class="card-lead-tag">
          ${topTagHtml}
        </div>
        <div class="card-tags">
          <span class="abv-badge ${abvClass}">${c.abvText}</span>
        </div>
      </div>

      <div class="card-main">
        <div class="cocktail-visual">
          ${visualContent}
        </div>
        <div class="cocktail-info">
          <h3 class="cocktail-name">${c.name}</h3>
          <div class="cocktail-meta">${c.base} &bull; ${c.style}</div>
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
      </div>
    </article>
  `;
}

// Detail Modal
function openDetailModal(id) {
  const c = state.cocktails.find(item => item.id === id);
  if (!c) return;

  state.activeDetailId = id;
  const glass = getGlassType(c);

  let abvClass = 'abv-medium';
  if (c.abv <= 10) abvClass = 'abv-light';
  else if (c.abv >= 21) abvClass = 'abv-strong';

  const sweetPct = (c.sweetness / 5) * 100;
  const sourPct = (c.sourness / 5) * 100;

  const ingredientsHtml = c.ingredients.map(ing => `
    <li class="recipe-item">
      <span class="item-name">${ing.item}</span>
      <span class="item-amt">${ing.amount}</span>
    </li>
  `).join('');

  const visualContent = `
    <img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
    <div style="display:none;" class="svg-fallback-wrap">${glassIcons[glass]}</div>
  `;

  const leadBadgeHtml = c.featured 
    ? `<span class="featured-tag modal-tag">인기 추천</span>` 
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
          <span class="tag-pill abv-badge ${abvClass}">${c.abvText}</span>
        </div>
      </div>
    </div>

    <div class="detail-desc-box">
      ${c.description}
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

    <h4 class="detail-section-title">제조 및 가니시</h4>
    <div class="info-data-grid">
      <div class="info-data-card">
        <span class="info-data-label">제조 방식</span>
        <span class="info-data-val">${c.method}</span>
      </div>
      <div class="info-data-card">
        <span class="info-data-label">추천 글래스</span>
        <span class="info-data-val">${c.glass}</span>
      </div>
      <div class="info-data-card">
        <span class="info-data-label">가니시</span>
        <span class="info-data-val">${c.garnish || '없음'}</span>
      </div>
    </div>

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
  modalEl.classList.add('open');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  modalEl.classList.remove('open');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
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
