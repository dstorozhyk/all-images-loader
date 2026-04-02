'use strict';

(function () {
  // State
  let allImages = [];
  let filteredImages = [];
  const selected = new Set();

  // DOM elements
  const grid = document.getElementById('imageGrid');
  const imageCount = document.getElementById('imageCount');
  const selectAllBtn = document.getElementById('selectAll');
  const deselectAllBtn = document.getElementById('deselectAll');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadText = document.getElementById('downloadText');
  const themeToggle = document.getElementById('themeToggle');
  const emptyState = document.getElementById('emptyState');
  const emptyText = document.getElementById('emptyText');
  const spinner = document.getElementById('spinner');
  const typeFilter = document.getElementById('typeFilter');
  const sizeFilter = document.getElementById('sizeFilter');

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

  // ===== Filtering =====
  function applyFilters() {
    const type = typeFilter.value;
    const size = sizeFilter.value;

    filteredImages = allImages.filter((img) => {
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

      // Size filter (based on loaded dimensions)
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

    if (filteredImages.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'grid__empty';
      empty.innerHTML = '<p>No images match the current filters</p>';
      grid.appendChild(empty);
      updateToolbar();
      return;
    }

    filteredImages.forEach((img, index) => {
      const card = createCard(img, index);
      grid.appendChild(card);
    });

    updateToolbar();
  }

  function createCard(imgData) {
    const card = document.createElement('div');
    card.className = 'card' + (selected.has(imgData.url) ? ' selected' : '');
    card.dataset.url = imgData.url;

    // Checkbox
    card.innerHTML = `
      <div class="card__check">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    `;

    // Image
    if (imgData.url.startsWith('data:')) {
      const imgEl = document.createElement('img');
      imgEl.className = 'card__img';
      imgEl.src = imgData.url;
      imgEl.alt = 'Image';
      imgEl.loading = 'lazy';
      card.insertBefore(imgEl, card.firstChild);

      if (imgData.width && imgData.height) {
        addBadge(card, imgData.width, imgData.height);
        imgData._loadedWidth = imgData.width;
        imgData._loadedHeight = imgData.height;
      }
    } else {
      const imgEl = document.createElement('img');
      imgEl.className = 'card__img';
      imgEl.src = imgData.url;
      imgEl.alt = 'Image';
      imgEl.loading = 'lazy';

      imgEl.onload = function () {
        imgData._loadedWidth = this.naturalWidth;
        imgData._loadedHeight = this.naturalHeight;
        addBadge(card, this.naturalWidth, this.naturalHeight);
      };

      imgEl.onerror = function () {
        this.remove();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'card__error';
        const ext = imgData.url.split('.').pop().split('?')[0].toUpperCase().substring(0, 4);
        errorDiv.textContent = ext || 'IMG';
        card.insertBefore(errorDiv, card.firstChild);
      };

      card.insertBefore(imgEl, card.firstChild);

      if (imgData.width && imgData.height) {
        addBadge(card, imgData.width, imgData.height);
        imgData._loadedWidth = imgData.width;
        imgData._loadedHeight = imgData.height;
      }
    }

    // Click handler
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

    return card;
  }

  function addBadge(card, w, h) {
    if (card.querySelector('.card__badge')) return;
    const badge = document.createElement('span');
    badge.className = 'card__badge';
    badge.textContent = `${w}\u00D7${h}`;
    card.appendChild(badge);
  }

  function updateToolbar() {
    const total = filteredImages.length;
    const sel = selected.size;

    imageCount.textContent = `Found ${allImages.length} image${allImages.length !== 1 ? 's' : ''}`;

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

    // Event listeners
    themeToggle.addEventListener('click', toggleTheme);
    selectAllBtn.addEventListener('click', selectAll);
    deselectAllBtn.addEventListener('click', deselectAll);
    downloadBtn.addEventListener('click', downloadSelected);
    typeFilter.addEventListener('change', applyFilters);
    sizeFilter.addEventListener('change', applyFilters);

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

      // Timeout if no response
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
    filteredImages = [...allImages];

    if (allImages.length === 0) {
      showError('No images found on this page');
      return;
    }

    renderGrid();
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
