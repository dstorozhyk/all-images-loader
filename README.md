# All Images Loader

A simple Chrome extension that finds and downloads all images from any webpage in the best available quality.

## Features

- Detects images from multiple sources:
  - `<img>` tags (including `srcset` for highest resolution)
  - `<picture>` and `<source>` elements
  - CSS background images
  - Open Graph and Twitter meta tags
  - Favicons and touch icons
  - Video poster images
  - SVG images and inline SVGs
  - Canvas elements
- Automatically picks the highest quality version of each image
- Filters out tracking pixels and tiny spacer images
- Filter images by type and size
- Select individual images or use "Select All"
- Light and dark theme (auto-detects your system preference)
- Minimalist, clean interface

## Installation

### Step 1 — Download the extension

1. Go to the [**Releases** page](../../releases)
2. Find the latest release at the top
3. Click on the `.zip` file to download it (e.g. `all-images-loader-v1.0.0.zip`)

### Step 2 — Extract the files

1. Find the downloaded `.zip` file (usually in your **Downloads** folder)
2. **Right-click** the file and select **"Extract All..."** (Windows) or **double-click** it (Mac)
3. Remember where you extracted it — you'll need this folder in the next step

### Step 3 — Install in Chrome

1. Open Google Chrome
2. Type `chrome://extensions` in the address bar and press **Enter**
3. Turn on **"Developer mode"** — it's the toggle switch in the **top-right corner**
4. Click the **"Load unpacked"** button that appears in the top-left
5. Navigate to the folder you extracted in Step 2 and select it
6. The extension icon will appear in your Chrome toolbar

> **Tip:** If the icon doesn't appear, click the puzzle piece icon in the Chrome toolbar and pin "All Images Loader".

## How to Use

1. Go to any webpage with images
2. Click the **All Images Loader** icon in your toolbar
3. The extension will scan the page and show all found images
4. **Click** on images to select them (or use **"Select All"**)
5. Use the filters to narrow down by type or size
6. Click **"Download Selected"** — images will be saved to your default downloads folder

## Permissions

This extension requires minimal permissions:

| Permission | Why it's needed |
|---|---|
| **activeTab** | To scan the current page for images when you click the extension icon |
| **downloads** | To save images to your downloads folder |
| **scripting** | To run the image scanner on the current page |

The extension does **not** collect any data, does **not** run in the background, and does **not** access any page until you click the icon.

## Theme

The extension automatically matches your system's light/dark mode preference. You can also toggle the theme manually by clicking the sun/moon icon in the header.

## Development

To modify the extension locally:

```bash
git clone https://github.com/dstorozhyk/all-images-loader.git
cd all-images-loader
```

Then load it in Chrome as described in the installation steps above. No build step is required — the extension uses vanilla JavaScript.

## Creating a Release

Push a version tag to trigger the automated release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Actions workflow will create a release with the `.zip` file automatically.

## License

[MIT](LICENSE)
