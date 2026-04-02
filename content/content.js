(function () {
  'use strict';

  const images = new Map();

  function normalizeUrl(url) {
    try {
      if (!url || typeof url !== 'string') return null;
      url = url.trim();
      if (url.startsWith('data:')) return url.length > 32 ? url : null;
      if (url.startsWith('blob:')) return null;
      const resolved = new URL(url, document.baseURI);
      resolved.hash = '';
      return resolved.href;
    } catch {
      return null;
    }
  }

  function addImage(url, meta = {}) {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    if (normalized.startsWith('data:') && normalized.length < 100) return;
    if (images.has(normalized)) return;
    images.set(normalized, {
      url: normalized,
      type: meta.type || 'unknown',
      width: meta.width || null,
      height: meta.height || null,
    });
  }

  function parseSrcset(srcset) {
    if (!srcset) return [];
    return srcset
      .split(',')
      .map((entry) => {
        const parts = entry.trim().split(/\s+/);
        const url = parts[0];
        const descriptor = parts[1] || '';
        let quality = 1;
        if (descriptor.endsWith('w')) {
          quality = parseInt(descriptor, 10) || 1;
        } else if (descriptor.endsWith('x')) {
          quality = parseFloat(descriptor) * 1000 || 1;
        }
        return { url, quality };
      })
      .filter((e) => e.url)
      .sort((a, b) => b.quality - a.quality);
  }

  function getBestSrc(el) {
    const candidates = [];

    const srcset =
      el.getAttribute('srcset') || el.getAttribute('data-srcset') || '';
    const parsed = parseSrcset(srcset);
    if (parsed.length > 0) {
      candidates.push(parsed[0].url);
    }

    const src =
      el.getAttribute('src') ||
      el.getAttribute('data-src') ||
      el.getAttribute('data-original') ||
      el.getAttribute('data-lazy-src') ||
      '';
    if (src) candidates.push(src);

    return candidates;
  }

  // 1. <img> elements
  function scanImgElements() {
    document.querySelectorAll('img').forEach((img) => {
      const srcs = getBestSrc(img);
      srcs.forEach((src) => {
        addImage(src, {
          type: 'img',
          width: img.naturalWidth || null,
          height: img.naturalHeight || null,
        });
      });
    });
  }

  // 2. <picture> / <source> elements
  function scanPictureElements() {
    document.querySelectorAll('picture source').forEach((source) => {
      const srcs = getBestSrc(source);
      srcs.forEach((src) => addImage(src, { type: 'picture' }));
    });
  }

  // 3. CSS background-image
  function scanCSSBackgrounds() {
    const selectors =
      'div, section, span, a, header, footer, main, aside, article, li, td, th, figure, nav, p, h1, h2, h3, h4, h5, h6, button, [style*="background"]';
    document.querySelectorAll(selectors).forEach((el) => {
      try {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          const urls = bg.match(/url\(["']?(.*?)["']?\)/g);
          if (urls) {
            urls.forEach((match) => {
              const url = match.replace(/url\(["']?/, '').replace(/["']?\)/, '');
              addImage(url, { type: 'css-bg' });
            });
          }
        }
      } catch {
        // skip elements that can't be accessed
      }
    });
  }

  // 4. <video poster>
  function scanVideoPoster() {
    document.querySelectorAll('video[poster]').forEach((video) => {
      addImage(video.getAttribute('poster'), { type: 'video-poster' });
    });
  }

  // 5. Open Graph & Twitter meta tags
  function scanMetaTags() {
    const selectors = [
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'meta[itemprop="image"]',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((meta) => {
        addImage(meta.getAttribute('content'), { type: 'meta' });
      });
    });
  }

  // 6. Favicons & icons
  function scanFavicons() {
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((link) => {
        addImage(link.getAttribute('href'), { type: 'favicon' });
      });
    });
  }

  // 7. Canvas elements
  function scanCanvasElements() {
    document.querySelectorAll('canvas').forEach((canvas) => {
      try {
        if (canvas.width > 0 && canvas.height > 0) {
          const dataUrl = canvas.toDataURL('image/png');
          addImage(dataUrl, {
            type: 'canvas',
            width: canvas.width,
            height: canvas.height,
          });
        }
      } catch {
        // tainted canvas, skip
      }
    });
  }

  // 8. SVG images
  function scanSVGImages() {
    document.querySelectorAll('svg image').forEach((img) => {
      const href =
        img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (href) addImage(href, { type: 'svg' });
    });
  }

  // 9. Inline SVGs as data URLs
  function scanInlineSVGs() {
    document.querySelectorAll('svg').forEach((svg) => {
      if (svg.closest('svg') !== svg) return; // skip nested
      try {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        if (svgString.length > 200) {
          const dataUrl =
            'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
          const rect = svg.getBoundingClientRect();
          addImage(dataUrl, {
            type: 'svg-inline',
            width: Math.round(rect.width) || null,
            height: Math.round(rect.height) || null,
          });
        }
      } catch {
        // skip
      }
    });
  }

  // Run all scanners
  scanImgElements();
  scanPictureElements();
  scanCSSBackgrounds();
  scanVideoPoster();
  scanMetaTags();
  scanFavicons();
  scanCanvasElements();
  scanSVGImages();
  scanInlineSVGs();

  // Filter out tiny tracking pixels (1x1, 0x0)
  const results = Array.from(images.values()).filter((img) => {
    if (img.width && img.height && img.width <= 2 && img.height <= 2) return false;
    // Filter tiny data URLs (likely spacer GIFs)
    if (img.url.startsWith('data:') && img.url.length < 200) return false;
    return true;
  });

  chrome.runtime.sendMessage({
    action: 'IMAGES_FOUND',
    images: results,
  });
})();
