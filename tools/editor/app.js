// Asset Editor — a small standalone pixel-art tool for medieval-zombie-survival's hand-drawn
// art (DESIGN §16). Unlike the old single-purpose tile editor this replaces, an asset here can
// be any w×h in 16px tiles — a 1×1 block, a 2×1 bed, a 2×3 fireplace, a 1×2 character — because
// furniture and characters are two-tall citizens of the same pixel grid as terrain (DESIGN §5.1,
// §6.1). No build step, no dependencies. Open index.html directly, or serve it (the game's
// devserver.mjs serves this folder too, which is what "Save to game" posts to).

const CATEGORIES = [
  { id: 'block', label: 'Block' },
  { id: 'background', label: 'Background' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'character', label: 'Character' },
];

// Forward-looking starting library (2026-09-08): the current game's 15 tiles, plus blank
// canvases for things DESIGN has already specced but no code touches yet — background walls,
// the first furniture pieces, and two-tall (1×2) character sprites — so there's real art to
// draw the moment a phase needs it, instead of a blank project. Michael can rename/delete/add
// freely; this is only what a fresh install starts with.
const SEED_ASSETS = [
  // block (1x1, solid seed color — matches src/config.js COLORS so it isn't blank on load)
  { id: 'dirt', label: 'Dirt', category: 'block', w: 1, h: 1, seed: '#7a4f2a' },
  { id: 'grass', label: 'Grass', category: 'block', w: 1, h: 1, seed: '#5cae3a' },
  { id: 'stone', label: 'Stone', category: 'block', w: 1, h: 1, seed: '#8a8d93' },
  { id: 'bedrock', label: 'Bedrock', category: 'block', w: 1, h: 1, seed: '#2b2d31' },
  { id: 'trunk', label: 'Trunk (bark)', category: 'block', w: 1, h: 1, seed: '#6b4a24' },
  { id: 'leaf', label: 'Leaves', category: 'block', w: 1, h: 1, seed: '#3f8f3a' },
  { id: 'wall', label: 'Timber wall', category: 'block', w: 1, h: 1, seed: '#c9a978' },
  { id: 'wall_stone', label: 'Stone wall', category: 'block', w: 1, h: 1, seed: '#9a9da3' },
  { id: 'floor', label: 'Planks (floor)', category: 'block', w: 1, h: 1, seed: '#8a5a30' },
  { id: 'ladder', label: 'Ladder', category: 'block', w: 1, h: 1, seed: '#8a5a30' },
  { id: 'door', label: 'Door', category: 'block', w: 1, h: 1, seed: '#a5703a' },
  { id: 'hatch', label: 'Trapdoor', category: 'block', w: 1, h: 1, seed: '#8a5a30' },
  // a window is glass in a wall (DESIGN §5.4b) — a plain block, no separate "window" kind
  { id: 'glass', label: 'Glass', category: 'block', w: 1, h: 1, seed: '#cfe8f0' },
  // background (DESIGN §5.7 kind ids, so these slot straight in when Phase 5 lands)
  { id: 'bg_plaster', label: 'Background: plaster', category: 'background', w: 1, h: 1, seed: '#e8d8b5' },
  { id: 'bg_earth', label: 'Background: earth', category: 'background', w: 1, h: 1, seed: '#4a3320' },
  { id: 'bg_plank', label: 'Background: plank', category: 'background', w: 1, h: 1, seed: null },
  { id: 'bg_stone', label: 'Background: stone', category: 'background', w: 1, h: 1, seed: null },
  // furniture (DESIGN §5.8 — sizes as specced; blank so they're drawn intentionally)
  { id: 'chest', label: 'Chest', category: 'furniture', w: 1, h: 1, seed: null },
  { id: 'bed', label: 'Bed', category: 'furniture', w: 2, h: 1, seed: null },
  { id: 'fireplace', label: 'Fireplace', category: 'furniture', w: 2, h: 3, seed: null },
  { id: 'well', label: 'Well', category: 'furniture', w: 1, h: 1, seed: null },
  { id: 'workbench', label: 'Workbench', category: 'furniture', w: 1, h: 1, seed: null },
  // character (DESIGN §6.1 — two tiles tall: 16x32 art)
  { id: 'player', label: 'Player', category: 'character', w: 1, h: 2, seed: null },
  { id: 'zombie', label: 'Zombie', category: 'character', w: 1, h: 2, seed: null },
];

// The old single-purpose editor's project format, for the one-time "Import legacy tileset"
// button: { tiles: { id: pixels[256] } }, always 16x16 (w=1,h=1). Labels aren't stored in that
// format, so this is the same label list it used, for a nicer import than the bare id.
const LEGACY_LABELS = {
  dirt: 'Dirt', grass: 'Grass', stone: 'Stone', bedrock: 'Bedrock', trunk: 'Trunk (bark)',
  leaf: 'Leaves', wall: 'Timber wall', wall_stone: 'Stone wall', floor: 'Planks (floor)',
  ladder: 'Ladder', door: 'Door', shutter: 'Shutter', hatch: 'Trapdoor',
  backwall_earth: 'Background: earth', backwall_plaster: 'Background: plaster',
};
const LEGACY_ID_REMAP = { backwall_earth: 'bg_earth', backwall_plaster: 'bg_plaster' };

const PALETTE = [
  '#7a4f2a', '#5cae3a', '#4b9430', '#8a8d93', '#2b2d31',
  '#6b4a24', '#54391a', '#3f8f3a', '#2f7a2c', '#c9a978',
  '#9a9da3', '#e8d8b5', '#4a3320', '#8a5a30', '#5a3d1e',
  '#a5703a', '#8fc5f0', '#b8bec6', '#f2b134', '#e63946',
  '#000000', '#ffffff',
];

const STORAGE_KEY = 'zed:project:v1';
const RECENT_KEY = 'zed:recent:v1';
const MAX_UNDO = 60;
const MAX_RECENT = 8;

// ---- state ----------------------------------------------------------------

let project = loadProject();
let activeId = Object.keys(project.assets)[0] ?? null;
let activeColor = '#7a4f2a';
let activeTool = 'pencil';
let zoom = 24;
let showGrid = true;
let mirrorX = false;
let categoryFilter = 'all';
let recent = loadRecent();

const undoStacks = {};   // id -> pixel-array snapshots, created lazily per asset
const redoStacks = {};
let strokeSnapshot = null;
let strokeChanged = false;

function freshPixels(w, h, seedColor = null) { return new Array(w * 16 * h * 16).fill(seedColor); }

function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeProject(JSON.parse(raw));
  } catch (e) { console.warn('failed to load project, starting fresh', e); }
  const assets = {};
  for (const s of SEED_ASSETS) assets[s.id] = { id: s.id, label: s.label, category: s.category, w: s.w, h: s.h, pixels: freshPixels(s.w, s.h, s.seed) };
  return { assets };
}

// Defends against a project saved by an older version of this file missing a field.
function normalizeProject(raw) {
  const assets = {};
  for (const [id, a] of Object.entries(raw.assets || {})) {
    const w = a.w || 1, h = a.h || 1;
    assets[id] = { id, label: a.label || id, category: a.category || 'block', w, h, pixels: a.pixels && a.pixels.length === w * 16 * h * 16 ? a.pixels : freshPixels(w, h) };
  }
  return { assets };
}

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}

let saveTimer = null;
function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  const ind = document.getElementById('saveIndicator');
  ind.textContent = 'saved';
  ind.classList.add('flash');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => ind.classList.remove('flash'), 400);
}

function pushRecent(color) {
  if (color === null) return;
  recent = [color, ...recent.filter(c => c !== color)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  renderRecent();
}

// ---- asset helpers ----------------------------------------------------------

function getAsset(id) { return project.assets[id]; }
function cwOf(a) { return a.w * 16; }
function chOf(a) { return a.h * 16; }
function idx(cw, x, y) { return y * cw + x; }

function slugify(label) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'asset';
}
function uniqueId(base) {
  if (!project.assets[base]) return base;
  let i = 2;
  while (project.assets[`${base}_${i}`]) i++;
  return `${base}_${i}`;
}

// ---- pixel helpers ----------------------------------------------------------

function paintCell(asset, x, y, color) {
  const cw = cwOf(asset);
  asset.pixels[idx(cw, x, y)] = color;
  if (mirrorX) asset.pixels[idx(cw, cw - 1 - x, y)] = color;
}

function floodFill(asset, x, y, color) {
  const cw = cwOf(asset), ch = chOf(asset);
  const target = asset.pixels[idx(cw, x, y)];
  if (target === color) return;
  const stack = [[x, y]];
  const seen = new Set();
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= cw || cy >= ch) continue;
    const key = cx + ',' + cy;
    if (seen.has(key)) continue;
    if (asset.pixels[idx(cw, cx, cy)] !== target) continue;
    seen.add(key);
    paintCell(asset, cx, cy, color);
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

// ---- canvas rendering ----------------------------------------------------

const editCanvas = document.getElementById('editCanvas');
const editCtx = editCanvas.getContext('2d');
const proportionCanvas = document.getElementById('proportionPreview');
const proportionCtx = proportionCanvas.getContext('2d');

function drawAssetTo(ctx, asset, cell, offsetX = 0, offsetY = 0, grid = false) {
  const cw = cwOf(asset), ch = chOf(asset);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const c = asset.pixels[idx(cw, x, y)];
      if (c === null) continue;   // transparent — let the canvas's own checker background show
      ctx.fillStyle = c;
      ctx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
    }
  }
  if (grid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    for (let i = 0; i <= cw; i++) { ctx.beginPath(); ctx.moveTo(offsetX + i * cell + 0.5, offsetY); ctx.lineTo(offsetX + i * cell + 0.5, offsetY + ch * cell); ctx.stroke(); }
    for (let i = 0; i <= ch; i++) { ctx.beginPath(); ctx.moveTo(offsetX, offsetY + i * cell + 0.5); ctx.lineTo(offsetX + cw * cell, offsetY + i * cell + 0.5); ctx.stroke(); }
    // heavier lines at 16px tile-cell boundaries, so a multi-cell asset shows its seams
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= asset.w; i++) { ctx.beginPath(); ctx.moveTo(offsetX + i * 16 * cell + 0.5, offsetY); ctx.lineTo(offsetX + i * 16 * cell + 0.5, offsetY + ch * cell); ctx.stroke(); }
    for (let i = 0; i <= asset.h; i++) { ctx.beginPath(); ctx.moveTo(offsetX, offsetY + i * 16 * cell + 0.5); ctx.lineTo(offsetX + cw * cell, offsetY + i * 16 * cell + 0.5); ctx.stroke(); }
  }
}

function renderEditCanvas() {
  const asset = getAsset(activeId);
  if (!asset) { editCanvas.width = 0; editCanvas.height = 0; return; }
  editCanvas.width = cwOf(asset) * zoom;
  editCanvas.height = chOf(asset) * zoom;
  drawAssetTo(editCtx, asset, zoom, 0, 0, showGrid);
}

// A 1x2 mannequin and the active asset standing on the same ground line, over a sample
// background wall — the reference for "does this look right at two-tall scale" (DESIGN §5.1).
function renderProportionPreview() {
  const ctx = proportionCtx, W = proportionCanvas.width, H = proportionCanvas.height;
  const scale = 2;             // 16px art at 2x — the game's planned display scale (DESIGN §6.1)
  const cell = 16 * scale;     // one tile, in preview px
  ctx.clearRect(0, 0, W, H);

  // sample background wall: a plank-ish two-tone checker across the whole preview
  for (let ty = 0; ty * cell < H; ty++) {
    for (let tx = 0; tx * cell < W; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? '#7a5a3a' : '#6e5033';
      ctx.fillRect(tx * cell, ty * cell, cell, cell);
    }
  }

  const groundY = H - 8;
  const mannequinX = 16;
  // mannequin: 1 tile wide, 2 tall, standing on the ground line
  const mw = cell, mh = cell * 2;
  ctx.fillStyle = 'rgba(180,185,195,0.55)';
  ctx.fillRect(mannequinX, groundY - mh, mw, mh);
  ctx.fillStyle = 'rgba(30,32,38,0.55)';
  ctx.fillRect(mannequinX + mw * 0.25, groundY - mh + mh * 0.08, mw * 0.5, mw * 0.5);   // a head

  const asset = getAsset(activeId);
  if (asset) {
    const aw = asset.w * cell, ah = asset.h * cell;
    const ax = mannequinX + mw + 20, ay = groundY - ah;
    const cw = cwOf(asset);
    for (let y = 0; y < chOf(asset); y++) for (let x = 0; x < cw; x++) {
      const c = asset.pixels[idx(cw, x, y)];
      if (c) { ctx.fillStyle = c; ctx.fillRect(ax + x * scale, ay + y * scale, scale, scale); }
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, groundY + 0.5); ctx.lineTo(W, groundY + 0.5); ctx.stroke();
}

function renderThumb(canvas, asset) {
  const ctx = canvas.getContext('2d');
  canvas.width = cwOf(asset); canvas.height = chOf(asset);
  drawAssetTo(ctx, asset, 1, 0, 0, false);
}

// ---- category tabs ----------------------------------------------------------

function renderCategoryTabs() {
  const wrap = document.getElementById('categoryTabs');
  wrap.innerHTML = '';
  const tabs = [{ id: 'all', label: 'All' }, ...CATEGORIES];
  for (const t of tabs) {
    const btn = document.createElement('button');
    btn.className = 'category-tab' + (t.id === categoryFilter ? ' active' : '');
    btn.textContent = t.label;
    btn.addEventListener('click', () => { categoryFilter = t.id; renderAll(); });
    wrap.appendChild(btn);
  }
}

// ---- asset list ------------------------------------------------------------

function renderAssetList() {
  const list = document.getElementById('assetList');
  list.innerHTML = '';
  const ids = Object.keys(project.assets).filter(id => categoryFilter === 'all' || project.assets[id].category === categoryFilter);
  for (const id of ids) {
    const a = project.assets[id];
    const btn = document.createElement('button');
    btn.className = 'tile-btn' + (id === activeId ? ' active' : '');
    const thumb = document.createElement('canvas');
    renderThumb(thumb, a);
    const col = document.createElement('div');
    col.className = 'label-col';
    const name = document.createElement('span'); name.className = 'name'; name.textContent = a.label;
    const dims = document.createElement('span'); dims.className = 'dims'; dims.textContent = `${a.w}×${a.h} · ${a.category}`;
    col.append(name, dims);
    btn.append(thumb, col);
    btn.addEventListener('click', () => { activeId = id; renderAll(); });
    list.appendChild(btn);
  }
}

// ---- new / rename / duplicate / delete --------------------------------------

const newAssetForm = document.getElementById('newAssetForm');
const newCategorySelect = document.getElementById('newCategory');
for (const c of CATEGORIES) { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.label; newCategorySelect.appendChild(opt); }

document.getElementById('newAssetBtn').addEventListener('click', () => {
  newAssetForm.hidden = !newAssetForm.hidden;
  if (!newAssetForm.hidden) document.getElementById('newLabel').focus();
});
document.getElementById('cancelNewAssetBtn').addEventListener('click', () => { newAssetForm.hidden = true; });

document.getElementById('createAssetBtn').addEventListener('click', () => {
  const label = document.getElementById('newLabel').value.trim() || 'New asset';
  const category = newCategorySelect.value;
  const w = Math.max(1, Math.min(6, Number(document.getElementById('newW').value) || 1));
  const h = Math.max(1, Math.min(6, Number(document.getElementById('newH').value) || 1));
  const id = uniqueId(slugify(label));
  project.assets[id] = { id, label, category, w, h, pixels: freshPixels(w, h) };
  activeId = id;
  categoryFilter = category;
  document.getElementById('newLabel').value = '';
  newAssetForm.hidden = true;
  saveProject();
  renderAll();
});

document.getElementById('renameBtn').addEventListener('click', () => {
  const a = getAsset(activeId);
  if (!a) return;
  const label = prompt('New label:', a.label);
  if (label && label.trim()) { a.label = label.trim(); saveProject(); renderAll(); }
});

document.getElementById('duplicateBtn').addEventListener('click', () => {
  const a = getAsset(activeId);
  if (!a) return;
  const id = uniqueId(a.id);
  project.assets[id] = { id, label: a.label + ' copy', category: a.category, w: a.w, h: a.h, pixels: a.pixels.slice() };
  activeId = id;
  saveProject();
  renderAll();
});

document.getElementById('deleteBtn').addEventListener('click', () => {
  const a = getAsset(activeId);
  if (!a) return;
  if (!confirm(`Delete "${a.label}"? This can't be undone.`)) return;
  delete project.assets[activeId];
  delete undoStacks[activeId]; delete redoStacks[activeId];
  activeId = Object.keys(project.assets)[0] ?? null;
  saveProject();
  renderAll();
});

// ---- palette ----------------------------------------------------------

function setActiveColor(color) {
  activeColor = color;
  document.getElementById('activeColorSwatch').style.background = color === null ? '' : color;
  document.querySelectorAll('.swatch').forEach(el => el.classList.toggle('active', el.dataset.color === color));
}

function renderPalette() {
  const grid = document.getElementById('paletteGrid');
  grid.innerHTML = '';
  for (const color of PALETTE) {
    const sw = document.createElement('button');
    sw.className = 'swatch'; sw.style.background = color; sw.dataset.color = color; sw.title = color;
    sw.addEventListener('click', () => setActiveColor(color));
    grid.appendChild(sw);
  }
}

function renderRecent() {
  const grid = document.getElementById('recentGrid');
  grid.innerHTML = '';
  for (const color of recent) {
    const sw = document.createElement('button');
    sw.className = 'swatch'; sw.style.background = color; sw.dataset.color = color; sw.title = color + ' (recent)';
    sw.addEventListener('click', () => setActiveColor(color));
    grid.appendChild(sw);
  }
}

// ---- drawing interaction ------------------------------------------------

function cellFromEvent(e, asset) {
  const rect = editCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / zoom);
  const y = Math.floor((e.clientY - rect.top) / zoom);
  return [Math.max(0, Math.min(cwOf(asset) - 1, x)), Math.max(0, Math.min(chOf(asset) - 1, y))];
}

function applyToolAt(asset, x, y, erase) {
  const cw = cwOf(asset);
  const cur = asset.pixels[idx(cw, x, y)];
  if (erase) { if (cur !== null) { paintCell(asset, x, y, null); strokeChanged = true; } return; }
  switch (activeTool) {
    case 'pencil': if (cur !== activeColor) { paintCell(asset, x, y, activeColor); strokeChanged = true; } break;
    case 'eraser': if (cur !== null) { paintCell(asset, x, y, null); strokeChanged = true; } break;
    case 'bucket': floodFill(asset, x, y, activeColor); strokeChanged = true; break;
    case 'eyedropper': if (cur !== null) { setActiveColor(cur); pushRecent(cur); } break;
  }
}

let drawing = false;
let lastCell = null;

// Bresenham line so a fast drag doesn't leave gaps between sparsely-sampled pointermove events.
function paintLine(asset, x0, y0, x1, y1, erase) {
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  while (true) {
    applyToolAt(asset, x, y, erase);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

editCanvas.addEventListener('contextmenu', e => e.preventDefault());

editCanvas.addEventListener('pointerdown', e => {
  const asset = getAsset(activeId);
  if (!asset) return;
  editCanvas.setPointerCapture(e.pointerId);
  drawing = true;
  strokeSnapshot = asset.pixels.slice();
  strokeChanged = false;
  const [x, y] = cellFromEvent(e, asset);
  lastCell = [x, y];
  applyToolAt(asset, x, y, e.button === 2);
  renderEditCanvas(); renderProportionPreview(); renderThumbForActive();
});

editCanvas.addEventListener('pointermove', e => {
  if (!drawing) return;
  const asset = getAsset(activeId);
  if (!asset) return;
  const [x, y] = cellFromEvent(e, asset);
  const erase = (e.buttons & 2) === 2;
  if (activeTool === 'pencil' || activeTool === 'eraser') paintLine(asset, lastCell[0], lastCell[1], x, y, erase);
  else applyToolAt(asset, x, y, erase);
  lastCell = [x, y];
  renderEditCanvas(); renderProportionPreview();
});

function endStroke() {
  if (!drawing) return;
  drawing = false;
  if (strokeChanged && strokeSnapshot) {
    (undoStacks[activeId] ??= []).push(strokeSnapshot);
    if (undoStacks[activeId].length > MAX_UNDO) undoStacks[activeId].shift();
    (redoStacks[activeId] ??= []).length = 0;
    if (activeTool === 'pencil') pushRecent(activeColor);
    saveProject();
    renderThumbForActive();
  }
  strokeSnapshot = null;
}
editCanvas.addEventListener('pointerup', endStroke);
editCanvas.addEventListener('pointerleave', () => { if (drawing) endStroke(); });

function renderThumbForActive() {
  const btn = [...document.querySelectorAll('.tile-btn')].find(b => b.classList.contains('active'));
  const asset = getAsset(activeId);
  if (btn && asset) renderThumb(btn.querySelector('canvas'), asset);
}

// ---- undo / redo ----------------------------------------------------------

function undo() {
  const stack = undoStacks[activeId];
  if (!stack || !stack.length) return;
  (redoStacks[activeId] ??= []).push(getAsset(activeId).pixels.slice());
  getAsset(activeId).pixels = stack.pop();
  saveProject();
  renderAll();
}
function redo() {
  const stack = redoStacks[activeId];
  if (!stack || !stack.length) return;
  (undoStacks[activeId] ??= []).push(getAsset(activeId).pixels.slice());
  getAsset(activeId).pixels = stack.pop();
  saveProject();
  renderAll();
}

// ---- toolbar wiring ----------------------------------------------------

document.getElementById('toolButtons').addEventListener('click', e => {
  const btn = e.target.closest('.tool-btn');
  if (!btn) return;
  activeTool = btn.dataset.tool;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b === btn));
});

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('gridToggle').addEventListener('change', e => { showGrid = e.target.checked; renderEditCanvas(); });
document.getElementById('mirrorToggle').addEventListener('change', e => { mirrorX = e.target.checked; });
document.getElementById('zoomSelect').addEventListener('change', e => { zoom = Number(e.target.value); renderEditCanvas(); });

document.getElementById('customColor').addEventListener('input', e => setActiveColor(e.target.value));
document.getElementById('transparentBtn').addEventListener('click', () => setActiveColor(null));

document.getElementById('fillSolidBtn').addEventListener('click', () => {
  const asset = getAsset(activeId);
  if (!asset || activeColor === null) return;
  (undoStacks[activeId] ??= []).push(asset.pixels.slice());
  (redoStacks[activeId] ??= []).length = 0;
  asset.pixels = new Array(cwOf(asset) * chOf(asset)).fill(activeColor);
  saveProject();
  renderAll();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  const asset = getAsset(activeId);
  if (!asset) return;
  (undoStacks[activeId] ??= []).push(asset.pixels.slice());
  (redoStacks[activeId] ??= []).length = 0;
  asset.pixels = new Array(cwOf(asset) * chOf(asset)).fill(null);
  saveProject();
  renderAll();
});

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const key = e.key.toLowerCase();
  if (e.ctrlKey || e.metaKey) {
    if (key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (key === 'y') { e.preventDefault(); redo(); }
    return;
  }
  const map = { p: 'pencil', e: 'eraser', g: 'bucket', i: 'eyedropper' };
  if (map[key]) {
    activeTool = map[key];
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === map[key]));
  } else if (key === 'm') {
    const cb = document.getElementById('mirrorToggle');
    cb.checked = !cb.checked; mirrorX = cb.checked;
  }
});

// ---- export / import ----------------------------------------------------------

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function assetToCanvas(asset) {
  const cw = cwOf(asset), ch = chOf(asset);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(cw, ch);
  for (let i = 0; i < asset.pixels.length; i++) {
    const color = asset.pixels[i];
    const [r, g, b, a] = color === null ? [0, 0, 0, 0] : hexToRgba(color);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function hexToRgba(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16), 255];
}

document.getElementById('exportAssetPng').addEventListener('click', () => {
  const asset = getAsset(activeId);
  if (!asset) return;
  assetToCanvas(asset).toBlob(blob => downloadBlob(blob, `${asset.id}.png`));
});

document.getElementById('exportProject').addEventListener('click', () => {
  downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), 'asset-editor-project.json');
});

document.getElementById('importProject').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = normalizeProject(JSON.parse(reader.result));
      if (!Object.keys(parsed.assets).length) throw new Error('no assets in file');
      project = parsed;
      for (const id of Object.keys(undoStacks)) delete undoStacks[id];
      for (const id of Object.keys(redoStacks)) delete redoStacks[id];
      activeId = Object.keys(project.assets)[0] ?? null;
      saveProject();
      renderAll();
    } catch (err) { alert('Could not load that file as a project: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// One-time bridge from the old 16x16-only tileset editor's export format: { tiles: { id: pixels } }.
document.getElementById('importLegacy').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.tiles) throw new Error('missing "tiles" — not a legacy tileset export');
      let added = 0, skipped = 0;
      for (const [oldId, pixels] of Object.entries(parsed.tiles)) {
        const id = LEGACY_ID_REMAP[oldId] || oldId;
        if (project.assets[id] && !confirm(`"${id}" already exists — overwrite it with the imported drawing?`)) { skipped++; continue; }
        project.assets[id] = { id, label: LEGACY_LABELS[oldId] || id, category: id.startsWith('bg_') ? 'background' : 'block', w: 1, h: 1, pixels: pixels.slice(0, 256) };
        added++;
      }
      saveProject();
      renderAll();
      alert(`Imported ${added} tile${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}.`);
    } catch (err) { alert('Could not read that as a legacy tileset: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('saveToGameBtn').addEventListener('click', async () => {
  const manifest = {};
  for (const [id, a] of Object.entries(project.assets)) manifest[id] = { label: a.label, category: a.category, w: a.w, h: a.h, pixels: a.pixels };
  const ind = document.getElementById('serverIndicator');
  ind.textContent = 'saving…';
  try {
    const res = await fetch('/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manifest) });
    if (!res.ok) throw new Error(await res.text());
    ind.textContent = `saved ${Object.keys(manifest).length} assets to assets/manifest.json — reload the game to see them`;
  } catch (err) {
    ind.textContent = 'failed — is this served by devserver.mjs? (' + err.message + ')';
  }
});

// ---- boot ----------------------------------------------------------

function renderAll() {
  renderCategoryTabs();
  renderAssetList();
  renderEditCanvas();
  renderProportionPreview();
  const asset = getAsset(activeId);
  document.getElementById('activeLabel').textContent = asset ? asset.label : '—';
  document.getElementById('activeDims').textContent = asset ? `${asset.w}×${asset.h}` : '';
  setActiveColor(activeColor);
}

renderPalette();
renderRecent();
setActiveColor(activeColor);
renderAll();
