'use strict';

(function () {
  // State
  let allImages = [];
  let filteredImages = [];
  const selected = new Set();
  let currentView = 'comfortable';

  // DOM elements
  const grid = document.getElementById('imageGrid');
  const imageCount = document.getElementById('imageCount');
  const selectAllBtn = document.getElementById('selectAll');
  const deselectAllBtn = document.getElementById('deselectAll');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadText = document.getElementById('downloadText');
  const themeToggle = document.getElementById('themeToggle');
  const typeFilter = document.getElementById('typeFilter');
  const sizeFilter = document.getElementById('sizeFilter');
  const hideIconsFilter = document.getElementById('hideIconsFilter');
  const viewCompact = document.getElementById('viewCompact');
  const viewComfortable = document.getElementById('viewComfortable');
  const viewList = document.getElementById('viewList');
  const hoverPreview = document.getElementById('hoverPreview');
  const hoverPreviewImg = document.getElementById('hoverPreviewImg');
  const hoverPreviewInfo = document.getElementById('hoverPreviewInfo');

  // ===== Theme =====
  function initTheme() {
    const stored = localStorage.getItem('ail-theme');
    if (stored === 'dark') {
      document.body.classList.add('dark');
    } else if (stored === 'light') {
      document.body.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark');
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('ail-theme', isDark ? 'dark' : 'light');
  }

  // ===== View Toggle =====
  function setView(view) {
    currentView = view;
    grid.classList.remove('grid--compact', 'grid--list');
    if (view === 'compact') grid.classList.add('grid--compact');
    if (view === 'list') grid.classList.add('grid--list');

    viewCompact.classList.toggle('active', view === 'compact');
    viewComfortable.classList.toggle('active', view === 'comfortable');
    viewList.classList.toggle('active', view === 'list');

    localStorage.setItem('ail-view', view);

    // Re-render to update card structure for list view
    renderGrid();
  }

  // ===== Icon/Logo Detection =====
  function isIconOrBranded(img) {
    if (img.type === 'favicon') return true;

    const w = img._loadedWidth || img.width || 0;
    const h = img._loadedHeight || img.height || 0;
    const hasDims = w > 0 && h > 0;

    // Very small images (< 32px) — definitely icons
    if (hasDims && w < 32 && h < 32) return true;

    // Small inline SVGs — likely UI icons
    if (img.type === 'svg-inline' && hasDims && w < 64 && h < 64) return true;

    // URL pattern heuristics
    if (!img.url.startsWith('data:')) {
      const urlLower = img.url.toLowerCase();
      const iconPattern =
        /\/(favicon|icon|logo|brand|sprite|badge)\b|[_\-./](favicon|icon|logo|brand|sprite|badge)[_\-./\d?#]/i;
      if (iconPattern.test(urlLower)) {
        if (!hasDims || (w < 200 && h < 200)) return true;
      }
    }

    // Small and roughly square — likely icon
    if (hasDims && w < 100 && h < 100) {
      const ratio = w / h;
      if (ratio > 0.7 && ratio < 1.4) return true;
    }

    return false;
  }

  // ===== Filtering =====
  function applyFilters() {
    const type = typeFilter.value;
    const size = sizeFilter.value;
    const hideIcons = hideIconsFilter.checked;

    filteredImages = allImages.filter((img) => {
      // Icon/branded filter
      if (hideIcons && isIconOrBranded(img)) return false;

      // Type filter
      if (type !== 'all') {
        if (type === 'img' && img.type !== 'img' && img.type !== 'picture') return false;
        if (type === 'css-bg' && img.type !== 'css-bg') return false;
        if (type === 'meta' && img.type !== 'meta') return false;
        if (type === 'svg' && img.type !== 'svg' && img.type !== 'svg-inline') return false;
        if (
          type === 'other' &&
          ['img', 'picture', 'css-bg', 'meta', 'svg', 'svg-inline'].includes(img.type)
        )
          return false;
      }

      // Size filter
      if (size !== 'all' && img._loadedWidth) {
        const maxDim = Math.max(img._loadedWidth, img._loadedHeight || 0);
        if (size === 'large' && maxDim <= 500) return false;
        if (size === 'medium' && (maxDim < 100 || maxDim > 500)) return false;
        if (size === 'small' && maxDim >= 100) return false;
      }

      return true;
    });

    renderGrid();
  }

  // ===== Rendering =====
  function renderGrid() {
    grid.innerHTML = '';
    hoverPreview.hidden = true;

    if (filteredImages.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'grid__empty';
      empty.innerHTML = '<p>No images match the current filters</p>';
      grid.appendChild(empty);
      updateToolbar();
      return;
    }

    filteredImages.forEach((img) => {
      const card = createCard(img);
      grid.appendChild(card);
    });

    updateToolbar();
  }

  function createCard(imgData) {
    const card = document.createElement('div');
    card.className = 'card' + (selected.has(imgData.url) ? ' selected' : '');
    card.dataset.url = imgData.url;

    const isList = currentView === 'list';

    // Image element
    const imgEl = document.createElement('img');
    imgEl.className = 'card__img';
    imgEl.alt = 'Image';
    imgEl.loading = 'lazy';
    imgEl.src = imgData.url;

    imgEl.onload = function () {
      imgData._loadedWidth = this.naturalWidth;
      imgData._loadedHeight = this.naturalHeight;
      addBadge(card, imgData, this.naturalWidth, this.naturalHeight);
    };

    imgEl.onerror = function () {
      this.remove();
      const errorDiv = document.createElement('div');
      errorDiv.className = 'card__error';
      const ext = imgData.url.split('.').pop().split('?')[0].toUpperCase().substring(0, 4);
      errorDiv.textContent = ext || 'IMG';
      card.insertBefore(errorDiv, card.firstChild);
    };

    card.appendChild(imgEl);

    // List view: info section
    if (isList) {
      const info = document.createElement('div');
      info.className = 'card__info';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = getImageName(imgData.url);
      info.appendChild(nameSpan);
      card.appendChild(info);
    }

    // Badge (dimensions)
    if (imgData._loadedWidth && imgData._loadedHeight) {
      addBadge(card, imgData, imgData._loadedWidth, imgData._loadedHeight);
    } else if (imgData.width && imgData.height) {
      addBadge(card, imgData, imgData.width, imgData.height);
      imgData._loadedWidth = imgData.width;
      imgData._loadedHeight = imgData.height;
    }

    // Checkbox
    const check = document.createElement('div');
    check.className = 'card__check';
    check.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    card.appendChild(check);

    // Click to select/deselect
    card.addEventListener('click', () => {
      if (selected.has(imgData.url)) {
        selected.delete(imgData.url);
        card.classList.remove('selected');
      } else {
        selected.add(imgData.url);
        card.classList.add('selected');
      }
      updateToolbar();
    });

    // Hover preview
    card.addEventListener('mouseenter', () => {
      const cardImg = card.querySelector('.card__img');
      if (!cardImg) return;

      hoverPreviewImg.src = imgData.url;
      const dims =
        imgData._loadedWidth && imgData._loadedHeight
          ? `${imgData._loadedWidth}\u00D7${imgData._loadedHeight}`
          : '';
      hoverPreviewInfo.textContent = dims;
      hoverPreview.hidden = false;

      // Position next to the card
      requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const pw = hoverPreview.offsetWidth;
        const ph = hoverPreview.offsetHeight;

        let left = rect.right + 8;
        if (left + pw > 400) {
          left = rect.left - pw - 8;
        }
        if (left < 0) left = Math.max(4, (400 - pw) / 2);

        let top = rect.top;
        if (top + ph > window.innerHeight) {
          top = window.innerHeight - ph - 8;
        }
        if (top < 0) top = 4;

        hoverPreview.style.left = left + 'px';
        hoverPreview.style.top = top + 'px';
      });
    });

    card.addEventListener('mouseleave', () => {
      hoverPreview.hidden = true;
    });

    return card;
  }

  function getImageName(url) {
    if (url.startsWith('data:')) {
      const mimeMatch = url.match(/^data:image\/(\w+)/);
      return mimeMatch ? `[data] ${mimeMatch[1]}` : '[data]';
    }
    try {
      const pathname = new URL(url).pathname;
      const name = pathname.split('/').pop();
      return name ? decodeURIComponent(name).substring(0, 40) : url.substring(0, 40);
    } catch {
      return url.substring(0, 40);
    }
  }

  function addBadge(card, imgData, w, h) {
    let badge = card.querySelector('.card__badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'card__badge';
      card.appendChild(badge);
    }
    badge.textContent = `${w}\u00D7${h}`;
  }

  function updateToolbar() {
    const total = filteredImages.length;
    const sel = selected.size;

    imageCount.textContent = `Found ${allImages.length} image${allImages.length !== 1 ? 's' : ''}`;
    if (total !== allImages.length) {
      imageCount.textContent += ` (${total} shown)`;
    }

    selectAllBtn.disabled = total === 0;
    deselectAllBtn.disabled = sel === 0;
    downloadBtn.disabled = sel === 0;
    downloadText.textContent = sel > 0 ? `Download Selected (${sel})` : 'Download Selected';
  }

  // ===== Actions =====
  function selectAll() {
    filteredImages.forEach((img) => selected.add(img.url));
    grid.querySelectorAll('.card').forEach((c) => c.classList.add('selected'));
    updateToolbar();
  }

  function deselectAll() {
    selected.clear();
    grid.querySelectorAll('.card').forEach((c) => c.classList.remove('selected'));
    updateToolbar();
  }

  function downloadSelected() {
    if (selected.size === 0) return;
    const urls = Array.from(selected);
    chrome.runtime.sendMessage({ action: 'DOWNLOAD', urls });

    downloadText.textContent = 'Downloading...';
    downloadBtn.disabled = true;

    setTimeout(() => {
      updateToolbar();
    }, 2000);
  }

  // ===== Init =====
  async function init() {
    initTheme();

    // Restore view preference
    const savedView = localStorage.getItem('ail-view') || 'comfortable';
    setView(savedView);

    // Event listeners
    themeToggle.addEventListener('click', toggleTheme);
    selectAllBtn.addEventListener('click', selectAll);
    deselectAllBtn.addEventListener('click', deselectAll);
    downloadBtn.addEventListener('click', downloadSelected);
    typeFilter.addEventListener('change', applyFilters);
    sizeFilter.addEventListener('change', applyFilters);
    hideIconsFilter.addEventListener('change', applyFilters);
    viewCompact.addEventListener('click', () => setView('compact'));
    viewComfortable.addEventListener('click', () => setView('comfortable'));
    viewList.addEventListener('click', () => setView('list'));

    // Connect to background for receiving messages
    const port = chrome.runtime.connect({ name: 'popup' });
    port.onMessage.addListener((message) => {
      if (message.action === 'IMAGES_FOUND') {
        onImagesFound(message.images);
      }
    });

    // Get current tab and inject content script
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showError('Cannot access this tab');
        return;
      }

      if (
        tab.url &&
        (tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('about:'))
      ) {
        showError('Cannot scan browser internal pages');
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js'],
      });

      setTimeout(() => {
        if (allImages.length === 0) {
          showError('No images found on this page');
        }
      }, 8000);
    } catch (e) {
      console.error('Failed to inject content script:', e);
      showError('Cannot scan this page. Try refreshing.');
    }
  }

  function onImagesFound(images) {
    allImages = images || [];

    if (allImages.length === 0) {
      showError('No images found on this page');
      return;
    }

    applyFilters();
  }

  function showError(msg) {
    grid.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'grid__empty';
    empty.innerHTML = `<p>${msg}</p>`;
    grid.appendChild(empty);
    imageCount.textContent = msg;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
