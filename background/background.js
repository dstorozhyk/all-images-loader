'use strict';

let popupPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    popupPort = port;
    port.onDisconnect.addListener(() => {
      popupPort = null;
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'IMAGES_FOUND' && popupPort) {
    popupPort.postMessage(message);
    return;
  }

  if (message.action === 'DOWNLOAD') {
    downloadImages(message.urls);
    sendResponse({ status: 'started', count: message.urls.length });
    return true;
  }

  if (message.action === 'DOWNLOAD_SINGLE') {
    downloadImage(message.url);
    sendResponse({ status: 'started' });
    return true;
  }
});

function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 200);
}

function extractFilename(url, index) {
  if (url.startsWith('data:')) {
    const mimeMatch = url.match(/^data:image\/(\w+)/);
    const ext = mimeMatch ? mimeMatch[1].replace('jpeg', 'jpg') : 'png';
    return `image_${String(index + 1).padStart(3, '0')}.${ext}`;
  }

  try {
    const parsed = new URL(url);
    let pathname = parsed.pathname;
    let filename = pathname.split('/').pop();

    if (!filename || filename.length < 2) {
      filename = `image_${String(index + 1).padStart(3, '0')}.jpg`;
    }

    // Add extension if missing
    if (!/\.\w{2,5}$/.test(filename)) {
      filename += '.jpg';
    }

    return sanitizeFilename(decodeURIComponent(filename));
  } catch {
    return `image_${String(index + 1).padStart(3, '0')}.jpg`;
  }
}

async function downloadImage(url, index = 0) {
  const filename = extractFilename(url, index);
  try {
    await chrome.downloads.download({
      url: url,
      filename: filename,
      conflictAction: 'uniquify',
    });
  } catch (e) {
    console.error('Download failed:', url, e);
  }
}

async function downloadImages(urls) {
  for (let i = 0; i < urls.length; i++) {
    await downloadImage(urls[i], i);
  }
}
