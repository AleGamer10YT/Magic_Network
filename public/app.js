const state = {
  token: localStorage.getItem("magicNetworkToken") || "",
  router: null,
  devices: [],
  discovered: [],
  settings: {},
  selectedId: "router",
  filter: "all",
  search: "",
  drag: null,
  pan: null,
  scanInFlight: false,
  autoRefreshTimer: null,
  viewBox: {
    x: 0,
    y: 0,
    width: 1280,
    height: 760
  },
  panelDrag: null,
  infoPanel: {
    visible: false,
    id: "router",
    x: 24,
    y: 24
  },
  autosaveTimer: null
};

const els = {
  loginOverlay: document.querySelector("#loginOverlay"),
  loginForm: document.querySelector("#loginForm"),
  passwordInput: document.querySelector("#passwordInput"),
  loginError: document.querySelector("#loginError"),
  networkMeta: document.querySelector("#networkMeta"),
  deviceCount: document.querySelector("#deviceCount"),
  deviceList: document.querySelector("#deviceList"),
  detectedCount: document.querySelector("#detectedCount"),
  detectedList: document.querySelector("#detectedList"),
  networkSvg: document.querySelector("#networkSvg"),
  canvasWrap: document.querySelector("#canvasWrap"),
  zoomInBtn: document.querySelector("#zoomInBtn"),
  zoomOutBtn: document.querySelector("#zoomOutBtn"),
  infoPanel: document.querySelector("#infoPanel"),
  infoPanelHandle: document.querySelector("#infoPanelHandle"),
  infoPanelType: document.querySelector("#infoPanelType"),
  infoPanelTitle: document.querySelector("#infoPanelTitle"),
  infoPanelBody: document.querySelector("#infoPanelBody"),
  infoPanelEditBtn: document.querySelector("#infoPanelEditBtn"),
  closeInfoPanelBtn: document.querySelector("#closeInfoPanelBtn"),
  selectionMeta: document.querySelector("#selectionMeta"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  subnetInput: document.querySelector("#subnetInput"),
  scanStartInput: document.querySelector("#scanStartInput"),
  scanEndInput: document.querySelector("#scanEndInput"),
  scanPreview: document.querySelector("#scanPreview"),
  deviceDialog: document.querySelector("#deviceDialog"),
  deviceForm: document.querySelector("#deviceForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  deviceIdInput: document.querySelector("#deviceIdInput"),
  nameInput: document.querySelector("#nameInput"),
  typeInput: document.querySelector("#typeInput"),
  ipField: document.querySelector("#ipField"),
  ipInput: document.querySelector("#ipInput"),
  detectedField: document.querySelector("#detectedField"),
  detectedInput: document.querySelector("#detectedInput"),
  statusField: document.querySelector("#statusField"),
  statusInput: document.querySelector("#statusInput"),
  macField: document.querySelector("#macField"),
  macInput: document.querySelector("#macInput"),
  parentInput: document.querySelector("#parentInput"),
  switchOptions: document.querySelector("#switchOptions"),
  switchManagementInputs: Array.from(document.querySelectorAll('input[name="switchMode"]')),
  switchSpeedInputs: Array.from(document.querySelectorAll('input[name="switchSpeeds"]')),
  deviceSpeedInputs: Array.from(document.querySelectorAll('input[name="deviceSpeed"]')),
  switchSpeedError: document.querySelector("#switchSpeedError"),
  notesInput: document.querySelector("#notesInput"),
  toast: document.querySelector("#toast"),
  importJsonInput: document.querySelector("#importJsonInput")
};

const typeLabels = {
  router: "Router",
  switch: "Switch",
  "access-point": "Access point",
  pc: "PC",
  smartphone: "Smartphone",
  tv: "Smart TV",
  console: "Console",
  printer: "Stampante",
  nas: "Server/NAS",
  iot: "IoT",
  unknown: "Sconosciuto"
};

const statusColors = {
  online: "#1f9d55",
  offline: "#d64545",
  unknown: "#d8a31a"
};

const switchSpeedLabels = {
  "10m": "10 Mbps",
  "100m": "100 Mbps",
  "1g": "1 Gbps",
  "2_5g": "2,5 Gbps",
  "10g": "10 Gbps",
  "10g_plus": "10+ Gbps"
};

const switchSpeedColors = {
  "10m": "#d64545",
  "100m": "#f08c00",
  "1g": "#1f9d55",
  "2_5g": "#7c3aed",
  "10g": "#0b78d0",
  "10g_plus": "#111827"
};

const switchSpeedRank = ["10m", "100m", "1g", "2_5g", "10g", "10g_plus"];

const iconPaths = {
  router: '<path d="M5 14h14v5H5z"></path><path d="M8 14V9h8v5"></path><path d="M9 17h.01M12 17h.01M15 17h.01"></path><path d="M9 6c2-2 4-2 6 0M7 4c3.4-3 6.6-3 10 0"></path>',
  switch: '<path d="M4 8h16v9H4z"></path><path d="M7 11h.01M10 11h.01M13 11h.01M16 11h.01"></path><path d="M7 14h10"></path>',
  "access-point": '<path d="M12 19v-7"></path><path d="M8 15h8"></path><path d="M7 8a7 7 0 0 1 10 0"></path><path d="M9.5 10.5a3.5 3.5 0 0 1 5 0"></path>',
  pc: '<path d="M4 5h16v11H4z"></path><path d="M9 20h6"></path><path d="M12 16v4"></path>',
  smartphone: '<path d="M8 3h8v18H8z"></path><path d="M11 18h2"></path>',
  tv: '<path d="M4 6h16v11H4z"></path><path d="M8 21h8"></path><path d="M12 17v4"></path>',
  console: '<path d="M7 9h10l3 7a3 3 0 0 1-5 3l-1.5-2h-3L9 19a3 3 0 0 1-5-3z"></path><path d="M8 13h3M9.5 11.5v3M16 13h.01"></path>',
  printer: '<path d="M7 9V4h10v5"></path><path d="M6 18H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-1"></path><path d="M7 14h10v7H7z"></path>',
  nas: '<path d="M5 4h14v16H5z"></path><path d="M8 8h8M8 12h8M8 16h4"></path><path d="M16 16h.01"></path>',
  iot: '<path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"></path><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"></path>',
  unknown: '<path d="M12 17h.01"></path><path d="M9.5 9a2.7 2.7 0 1 1 4.2 2.2c-.9.6-1.7 1.2-1.7 2.3"></path><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  edit: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"></path><path d="M13.5 6.5l4 4"></path>',
  trash: '<path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path><path d="M9 7V4h6v3"></path>',
  refresh: '<path d="M20 12a8 8 0 0 1-14.7 4.4"></path><path d="M4 16v5h5"></path><path d="M4 12A8 8 0 0 1 18.7 7.6"></path><path d="M20 8V3h-5"></path>',
  save: '<path d="M5 3h12l2 2v16H5z"></path><path d="M8 3v6h8V3"></path><path d="M8 21v-7h8v7"></path>',
  folder: '<path d="M3 6h7l2 2h9v11H3z"></path>'
};

function svgIcon(type, size = 22) {
  const paths = iconPaths[type] || iconPaths.unknown;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function applyStaticIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = svgIcon(node.dataset.icon, 16);
  });
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "/api/login") {
    showLogin();
  }
  if (!response.ok) {
    throw new Error(body.error || "Errore API");
  }
  return body;
}

async function init() {
  applyStaticIcons();
  bindEvents();
  const auth = await fetch("/api/auth-status").then((response) => response.json()).catch(() => ({ enabled: false }));
  if (auth.enabled && !state.token) {
    showLogin();
    return;
  }
  await loadAll();
  startAutoRefresh();
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  document.querySelector("#addSwitchBtn").addEventListener("click", () => openDeviceDialog({ type: "switch", parentId: "router" }));
  document.querySelector("#addDeviceBtn").addEventListener("click", () => openDeviceDialog({ type: "pc", parentId: state.selectedId || "router" }));
  document.querySelector("#editDeviceBtn").addEventListener("click", editSelected);
  document.querySelector("#deleteDeviceBtn").addEventListener("click", deleteSelected);
  document.querySelector("#scanBtn").addEventListener("click", () => scan("known"));
  document.querySelector("#rangeScanBtn").addEventListener("click", () => scan("range"));
  document.querySelector("#saveBtn").addEventListener("click", () => saveLayout(true));
  document.querySelector("#loadBtn").addEventListener("click", loadAll);
  document.querySelector("#exportJsonBtn").addEventListener("click", exportJson);
  document.querySelector("#importJsonBtn").addEventListener("click", () => els.importJsonInput.click());
  document.querySelector("#exportPngBtn").addEventListener("click", exportPng);
  els.infoPanelHandle.addEventListener("pointerdown", onPanelPointerDown);
  els.infoPanelEditBtn.addEventListener("click", editSelected);
  els.closeInfoPanelBtn.addEventListener("click", closeInfoPanel);
  els.zoomInBtn.addEventListener("click", () => zoomCanvas(0.8));
  els.zoomOutBtn.addEventListener("click", () => zoomCanvas(1.25));
  els.networkSvg.addEventListener("pointerdown", onCanvasPointerDown);
  els.importJsonInput.addEventListener("change", importJson);
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });
  els.statusFilter.addEventListener("change", (event) => {
    state.filter = event.target.value;
    render();
  });
  [els.subnetInput, els.scanStartInput, els.scanEndInput].forEach((input) => {
    input.addEventListener("input", updateScanPreview);
  });
  els.deviceForm.addEventListener("submit", saveDeviceFromForm);
  els.detectedInput.addEventListener("change", applyDetectedSelection);
  els.ipInput.addEventListener("input", applyAutomaticNetworkFieldsFromIp);
  els.typeInput.addEventListener("change", updateSwitchOptions);
  els.switchManagementInputs.forEach((input) => input.addEventListener("change", updateSwitchOptions));
  els.switchSpeedInputs.forEach((input) => input.addEventListener("change", handleSwitchSpeedChange));
  document.querySelector("#closeDialogBtn").addEventListener("click", closeDialog);
  document.querySelector("#cancelDialogBtn").addEventListener("click", closeDialog);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointermove", onCanvasPointerMove);
  window.addEventListener("pointerup", onCanvasPointerUp);
  window.addEventListener("pointermove", onPanelPointerMove);
  window.addEventListener("pointerup", onPanelPointerUp);
}

async function handleLogin(event) {
  event.preventDefault();
  els.loginError.textContent = "";
  try {
    const result = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: els.passwordInput.value })
    });
    state.token = result.token || "";
    localStorage.setItem("magicNetworkToken", state.token);
    els.loginOverlay.classList.add("hidden");
    await loadAll();
    startAutoRefresh();
  } catch (error) {
    els.loginError.textContent = error.message;
  }
}

function showLogin() {
  els.loginOverlay.classList.remove("hidden");
  els.passwordInput.focus();
}

async function loadAll() {
  try {
    const [data, status] = await Promise.all([
      api("/api/load-layout"),
      api("/api/network-status").catch(() => null)
    ]);
    state.router = status?.router || data.router;
    state.devices = data.devices || [];
    state.discovered = data.discovered || [];
    state.settings = data.settings || {};
    hydrateSettings();
    ensureLayout();
    render();
    toast("Schema caricato");
  } catch (error) {
    toast(error.message);
  }
}

function startAutoRefresh() {
  if (state.autoRefreshTimer) return;
  window.setTimeout(() => scan("known", { silent: true }), 1200);
  state.autoRefreshTimer = window.setInterval(() => {
    scan("known", { silent: true });
  }, 60_000);
}

function hydrateSettings() {
  els.subnetInput.value = subnetToPrefix(state.settings.subnet || state.router?.ip || "192.168.0");
  els.scanStartInput.value = state.settings.scanStart || 1;
  els.scanEndInput.value = state.settings.scanEnd || 254;
  updateScanPreview();
}

function allNodes() {
  return [state.router, ...state.devices].filter(Boolean);
}

function getNode(id) {
  return allNodes().find((node) => node.id === id);
}

function ensureLayout() {
  if (!state.router.position) state.router.position = { x: 560, y: 80 };
  const childrenMap = groupChildren();
  const levels = new Map([["router", 0]]);
  const queue = ["router"];
  while (queue.length) {
    const parentId = queue.shift();
    const level = levels.get(parentId) || 0;
    for (const child of childrenMap.get(parentId) || []) {
      levels.set(child.id, level + 1);
      queue.push(child.id);
    }
  }
  const byLevel = {};
  for (const device of state.devices) {
    const level = levels.get(device.id) || 1;
    byLevel[level] = byLevel[level] || [];
    byLevel[level].push(device);
  }
  for (const [levelText, devices] of Object.entries(byLevel)) {
    const level = Number(levelText);
    devices.forEach((device, index) => {
      if (!device.position) {
        const spacing = 1040 / Math.max(1, devices.length + 1);
        device.position = { x: 120 + spacing * (index + 1), y: 90 + level * 180 };
      }
    });
  }
}

function groupChildren() {
  const map = new Map();
  for (const device of state.devices) {
    const parentId = device.parentId || "router";
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(device);
  }
  return map;
}

function render() {
  renderMeta();
  renderDeviceList();
  renderDetectedList();
  renderSvg();
  renderInfoPanel();
  updateActionState();
}

function renderMeta() {
  const statusNodes = allNodes().filter(hasOperationalStatus);
  const online = statusNodes.filter((node) => node.status === "online").length;
  const total = statusNodes.length;
  els.networkMeta.textContent = `${online}/${total} online - gateway ${state.router?.gateway || state.router?.ip || "n/d"}`;
  const selected = getNode(state.selectedId);
  els.selectionMeta.textContent = selected ? `${selected.name} - ${typeLabels[selected.type] || selected.type} - ${selected.ip || "IP non assegnato"}` : "Nessun dispositivo selezionato";
}

function renderDeviceList() {
  const nodes = allNodes().filter((node) => {
    const matchesStatus = state.filter === "all" || (hasOperationalStatus(node) && node.status === state.filter);
    const text = `${node.name} ${node.ip} ${typeLabels[node.type] || node.type}`.toLowerCase();
    return matchesStatus && text.includes(state.search);
  });
  els.deviceCount.textContent = nodes.length;
  els.deviceList.innerHTML = nodes.map((node) => {
    const parent = node.parentId ? getNode(node.parentId)?.name || "Router" : "Radice";
    return `
      <article class="device-row ${node.id === state.selectedId ? "selected" : ""}" data-id="${node.id}" tabindex="0">
        <div class="device-row-icon">${svgIcon(node.type, 24)}</div>
        <div class="device-row-main">
          <div class="device-row-title">
            <span>${escapeHtml(node.name)}</span>
            ${hasOperationalStatus(node) ? `<i class="status-dot ${node.status || "unknown"}"></i>` : ""}
          </div>
          <div class="device-row-meta">${escapeHtml(node.ip || "IP non assegnato")} - ${escapeHtml(typeLabels[node.type] || node.type)} - ${escapeHtml(parent)}</div>
        </div>
      </article>
    `;
  }).join("");
  els.deviceList.querySelectorAll(".device-row").forEach((row) => {
    row.addEventListener("click", () => showInfoPanel(row.dataset.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter") showInfoPanel(row.dataset.id);
    });
  });
}

function renderDetectedList() {
  const mappedIps = new Set(allNodes().map((node) => node.ip).filter(Boolean));
  const detected = state.discovered
    .filter((item) => item.ip && !mappedIps.has(item.ip))
    .filter((item) => {
      const matchesStatus = state.filter === "all" || item.status === state.filter;
      const text = `${item.name} ${item.ip} ${item.mac || ""}`.toLowerCase();
      return matchesStatus && text.includes(state.search);
    });
  els.detectedCount.textContent = detected.length;
  els.detectedList.innerHTML = detected.length ? detected.map((item) => `
    <article class="detected-row">
      <div>
        <div class="device-row-title">
          <span>${escapeHtml(item.name || `Dispositivo ${item.ip}`)}</span>
          <i class="status-dot ${item.status || "unknown"}"></i>
        </div>
        <div class="device-row-meta">${escapeHtml(item.ip)}${item.mac ? ` - ${escapeHtml(item.mac)}` : ""}</div>
      </div>
      <button type="button" data-detected-ip="${escapeHtml(item.ip)}">+</button>
    </article>
  `).join("") : `<p class="empty-state">Nessun IP rilevato non assegnato.</p>`;
  els.detectedList.querySelectorAll("[data-detected-ip]").forEach((button) => {
    button.addEventListener("click", () => {
      const detectedItem = state.discovered.find((item) => item.ip === button.dataset.detectedIp);
      openDeviceDialog({
        ...(detectedItem || {}),
        id: "",
        type: detectedItem?.type && detectedItem.type !== "unknown" ? detectedItem.type : "pc",
        parentId: state.selectedId || "router"
      });
    });
  });
}

function applyViewBox() {
  const { x, y, width, height } = state.viewBox;
  els.networkSvg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
}

function zoomCanvas(factor) {
  const { x, y, width, height } = state.viewBox;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const nextWidth = clamp(width * factor, 260, 8000);
  const nextHeight = clamp(height * factor, 160, 5000);
  state.viewBox = {
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight
  };
  applyViewBox();
}

function renderSvg() {
  const nodes = allNodes();
  const links = state.devices.map((device) => ({ from: getNode(device.parentId || "router") || state.router, to: device })).filter((link) => link.from && link.to);
  applyViewBox();
  els.networkSvg.innerHTML = `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca9a5"></path>
      </marker>
    </defs>
    <g class="nodes">
      ${nodes.map(renderNode).join("")}
    </g>
    <g class="links">
      ${links.map(renderLink).join("")}
    </g>
  `;
  els.networkSvg.querySelectorAll(".node-card").forEach((node) => {
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("dblclick", () => {
      selectNode(node.dataset.id);
      editSelected();
    });
  });
}

function renderLink(link) {
  // target top-center
  const toCenterX = (link.to.position?.x || 0) + 90;
  const toTopY = (link.to.position?.y || 0);
  const end = { x: toCenterX, y: toTopY };
  // compute start point at source boundary towards target center
  const fakeTargetForIntersection = { position: { x: toCenterX - 90, y: toTopY - 58 } };
  const start = boundaryPointTowards(link.from, fakeTargetForIntersection);
  const midY = (start.y + end.y) / 2;
  const fromSpeed = getNodePrimarySpeed(link.from);
  const toSpeed = getNodePrimarySpeed(link.to);
  const bottleneck = pickLowerSpeed(fromSpeed, toSpeed);
  const strokeColor = switchSpeedColors[bottleneck] || '#9ca9a5';
  const pathD = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
  return `<path class="link-line" marker-end="url(#arrow)" d="${pathD}" stroke="${strokeColor}" style="stroke-width:3;fill:none;stroke-linecap:round"></path>`;
}

function centerOf(node) {
  return { x: node.position.x + 90, y: node.position.y + 58 };
}

function boundaryPointTowards(fromNode, toNode) {
  const from = centerOf(fromNode);
  const to = centerOf(toNode);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const halfW = 90;
  const halfH = 58;
  if (dx === 0 && dy === 0) return from;
  const tx = dx === 0 ? Infinity : Math.abs(halfW / dx);
  const ty = dy === 0 ? Infinity : Math.abs(halfH / dy);
  const t = Math.min(tx, ty);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

function renderNode(node) {
  const status = node.status || "unknown";
  const showStatus = hasOperationalStatus(node);
  const parentName = node.parentId ? getNode(node.parentId)?.name || "Router" : node.gateway || "Gateway";
  const title = truncate(node.name, 22);
  const ip = truncate(node.ip || "IP non assegnato", 23);
  const icon = iconPaths[node.type] || iconPaths.unknown;
  const borderColor = node.type === "switch"
    ? getSwitchBorderColor(node)
    : (switchSpeedColors[getNodePrimarySpeed(node)] || "#cfd8d4");
  const nodeTypeText = node.type === "switch" ? `${node.switchMode === "managed" ? "Managed" : "Unmanaged"} switch` : typeLabels[node.type] || node.type;
  const metaLine = node.type === "switch" && node.switchMode === "unmanaged"
    ? nodeTypeText
    : `${nodeTypeText} - ${ip}`;
  const detailLine = node.type === "switch"
    ? getSwitchSpeedText(node)
    : node.deviceSpeed
      ? (switchSpeedLabels[node.deviceSpeed] || node.deviceSpeed)
      : node.mac ? truncate(node.mac, 22) : node.notes ? truncate(node.notes, 24) : "Nessuna nota";
  return `
    <g class="node-card ${node.id === state.selectedId ? "selected" : ""}" data-id="${node.id}" transform="translate(${node.position.x} ${node.position.y})">
      <rect class="node-rect" width="180" height="116" style="stroke:${borderColor}"></rect>
      ${showStatus ? `<circle class="node-status-ring" cx="158" cy="22" r="8" stroke="${statusColors[status] || statusColors.unknown}"></circle>` : ""}
      <g class="node-icon" transform="translate(14 15)" stroke="#255f85" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
      <text class="node-title" x="50" y="28">${escapeSvg(title)}</text>
      <text class="node-meta" x="16" y="58">${escapeSvg(truncate(metaLine, 24))}</text>
      <text class="node-parent" x="16" y="80">Link: ${escapeSvg(truncate(parentName, 23))}</text>
      <text class="node-parent" x="16" y="100">${escapeSvg(truncate(detailLine, 24))}</text>
    </g>
  `;
}

function selectNode(id) {
  state.selectedId = id;
  render();
}

function showInfoPanel(id, coordinates = null) {
  const node = getNode(id);
  if (!node) return;
  state.selectedId = id;
  state.infoPanel.visible = true;
  state.infoPanel.id = id;
  if (coordinates) {
    const rect = els.canvasWrap.getBoundingClientRect();
    state.infoPanel.x = clamp(coordinates.clientX - rect.left + 14, 12, Math.max(12, rect.width - 340));
    state.infoPanel.y = clamp(coordinates.clientY - rect.top + 14, 12, Math.max(12, rect.height - 330));
  }
  render();
}

function closeInfoPanel() {
  state.infoPanel.visible = false;
  renderInfoPanel();
}

function renderInfoPanel() {
  const node = getNode(state.infoPanel.id);
  if (!state.infoPanel.visible || !node) {
    els.infoPanel.classList.add("hidden");
    return;
  }
  const parent = node.parentId ? getNode(node.parentId)?.name || "Router" : "Radice schema";
  const fields = [
    ["Tipo", typeLabels[node.type] || node.type],
    ...(node.type === "switch" ? [
      ["Gestione", node.switchMode === "managed" ? "Managed" : "Unmanaged"],
      ["Velocita'", getSwitchSpeedText(node)]
    ] : []),
    ["IP", node.ip || "Non assegnato"],
    ...(hasOperationalStatus(node) ? [["Stato", statusLabel(node.status)]] : []),
    ["Gateway", node.gateway || (node.id === "router" ? node.ip || "Non disponibile" : "Ereditato dal router")],
    ["MAC", node.mac || "Non disponibile"],
    ["Collegato a", parent],
    ["Ultimo visto", node.lastSeen ? new Date(node.lastSeen).toLocaleString() : "Non disponibile"],
    ["Note", node.notes || "Nessuna nota"]
  ];
  els.infoPanelType.textContent = typeLabels[node.type] || "Dispositivo";
  els.infoPanelTitle.textContent = node.name || "Senza nome";
  els.infoPanelBody.innerHTML = `
    ${hasOperationalStatus(node) ? `<div class="info-status ${node.status || "unknown"}">
      <i class="status-dot ${node.status || "unknown"}"></i>
      <span>${statusLabel(node.status)}</span>
    </div>` : ""}
    <dl>
      ${fields.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("")}
    </dl>
  `;
  els.infoPanel.style.left = `${state.infoPanel.x}px`;
  els.infoPanel.style.top = `${state.infoPanel.y}px`;
  els.infoPanel.classList.remove("hidden");
}

function onPointerDown(event) {
  event.stopPropagation();
  const nodeElement = event.currentTarget;
  const node = getNode(nodeElement.dataset.id);
  if (!node) return;
  const point = svgPoint(event);
  state.drag = {
    id: node.id,
    offsetX: point.x - node.position.x,
    offsetY: point.y - node.position.y,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  };
  state.selectedId = node.id;
  nodeElement.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!state.drag) return;
  const node = getNode(state.drag.id);
  if (!node) return;
  if (Math.abs(event.clientX - state.drag.startX) > 4 || Math.abs(event.clientY - state.drag.startY) > 4) {
    state.drag.moved = true;
  }
  const point = svgPoint(event);
  node.position = {
    x: point.x - state.drag.offsetX,
    y: point.y - state.drag.offsetY
  };
  renderSvg();
}

function onPointerUp(event) {
  if (!state.drag) return;
  const drag = state.drag;
  state.drag = null;
  if (drag.moved) {
    scheduleAutosave();
  } else {
    showInfoPanel(drag.id, event);
  }
}

function onCanvasPointerDown(event) {
  if (event.button !== 0 || event.target.closest(".node-card")) return;
  event.preventDefault();
  state.pan = {
    startX: event.clientX,
    startY: event.clientY,
    viewBox: { ...state.viewBox }
  };
  els.canvasWrap.classList.add("panning");
  els.networkSvg.setPointerCapture?.(event.pointerId);
}

function onCanvasPointerMove(event) {
  if (!state.pan) return;
  const rect = els.networkSvg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const deltaX = (event.clientX - state.pan.startX) * (state.pan.viewBox.width / rect.width);
  const deltaY = (event.clientY - state.pan.startY) * (state.pan.viewBox.height / rect.height);
  state.viewBox.x = state.pan.viewBox.x - deltaX;
  state.viewBox.y = state.pan.viewBox.y - deltaY;
  applyViewBox();
}

function onCanvasPointerUp() {
  if (!state.pan) return;
  state.pan = null;
  els.canvasWrap.classList.remove("panning");
}

function onPanelPointerDown(event) {
  if (event.target.closest("button")) return;
  const rect = els.infoPanel.getBoundingClientRect();
  state.panelDrag = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  els.infoPanelHandle.setPointerCapture?.(event.pointerId);
}

function onPanelPointerMove(event) {
  if (!state.panelDrag) return;
  const rect = els.canvasWrap.getBoundingClientRect();
  state.infoPanel.x = clamp(event.clientX - rect.left - state.panelDrag.offsetX, 8, Math.max(8, rect.width - els.infoPanel.offsetWidth - 8));
  state.infoPanel.y = clamp(event.clientY - rect.top - state.panelDrag.offsetY, 8, Math.max(8, rect.height - els.infoPanel.offsetHeight - 8));
  els.infoPanel.style.left = `${state.infoPanel.x}px`;
  els.infoPanel.style.top = `${state.infoPanel.y}px`;
}

function onPanelPointerUp() {
  state.panelDrag = null;
}

function svgPoint(event) {
  const point = els.networkSvg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(els.networkSvg.getScreenCTM().inverse());
}

function openDeviceDialog(defaults = {}) {
  populateParentOptions(defaults.id);
  populateDetectedOptions(defaults.ip);
  const isNewSwitch = !defaults.id && defaults.type === "switch";
  const switchMode = defaults.switchMode || (defaults.ip ? "managed" : isNewSwitch ? "unmanaged" : "managed");
  const switchSpeeds = Array.isArray(defaults.switchSpeeds) && defaults.switchSpeeds.length ? defaults.switchSpeeds : ["1g"];
  els.deviceIdInput.value = defaults.id || "";
  els.nameInput.value = defaults.name || (defaults.type === "switch" ? "Nuovo switch" : "Nuovo dispositivo");
  els.typeInput.value = defaults.type || "pc";
  els.ipInput.value = defaults.ip || "";
  els.statusInput.value = defaults.status || "unknown";
  els.macInput.value = defaults.mac || "";
  els.notesInput.value = defaults.notes || "";
  els.parentInput.value = defaults.parentId || "router";
  els.dialogTitle.textContent = defaults.id ? "Modifica dispositivo" : "Aggiungi dispositivo";
  els.typeInput.disabled = defaults.id === "router";
  els.parentInput.disabled = defaults.id === "router";
  setSwitchModeValue(switchMode);
  setSwitchSpeedsValue(switchSpeeds);
  // device speed
  const deviceSpeed = defaults.deviceSpeed || (defaults.type === 'switch' ? getPrimarySwitchSpeed(defaults) : '1g');
  setDeviceSpeedValue(deviceSpeed);
  updateSwitchOptions();
  if (!(els.typeInput.value === "switch" && getSwitchModeValue() === "unmanaged")) {
    applyAutomaticNetworkFieldsFromIp();
  }
  els.deviceDialog.showModal();
}

function populateParentOptions(currentId = "") {
  const candidates = allNodes().filter((node) => node.id !== currentId && ["router", "switch", "access-point"].includes(node.type));
  els.parentInput.innerHTML = candidates.map((node) => `<option value="${node.id}">${escapeHtml(node.name)}</option>`).join("");
}

function populateDetectedOptions(selectedIp = "") {
  const mappedIps = new Set(allNodes().map((node) => node.ip).filter(Boolean));
  const options = state.discovered
    .filter((item) => item.ip && (!mappedIps.has(item.ip) || item.ip === selectedIp))
    .map((item) => `<option value="${escapeHtml(item.ip)}">${escapeHtml(item.ip)} - ${escapeHtml(item.name || "Rilevato")}</option>`)
    .join("");
  els.detectedInput.innerHTML = `<option value="">Inserisci manualmente</option>${options}`;
  els.detectedInput.value = selectedIp && state.discovered.some((item) => item.ip === selectedIp) ? selectedIp : "";
}

function applyDetectedSelection() {
  const item = state.discovered.find((entry) => entry.ip === els.detectedInput.value);
  if (!item) {
    applyAutomaticNetworkFieldsFromIp();
    return;
  }
  els.ipInput.value = item.ip || "";
  els.macInput.value = item.mac || "";
  els.statusInput.value = item.status || "unknown";
  if (!els.nameInput.value || els.nameInput.value === "Nuovo dispositivo") {
    els.nameInput.value = item.name || `Dispositivo ${item.ip}`;
  }
  if (item.type && item.type !== "unknown") {
    els.typeInput.value = item.type;
  }
  updateSwitchOptions();
}

function applyAutomaticNetworkFieldsFromIp() {
  const ip = els.ipInput.value.trim();
  const item = state.discovered.find((entry) => entry.ip === ip);
  if (!item) {
    const saved = getNode(els.deviceIdInput.value);
    els.macInput.value = saved?.ip === ip ? saved.mac || "" : "";
    els.statusInput.value = saved?.ip === ip ? saved.status || "unknown" : "unknown";
    return;
  }
  els.macInput.value = item.mac || "";
  els.statusInput.value = item.status || "unknown";
  if (els.detectedInput.value !== item.ip && Array.from(els.detectedInput.options).some((option) => option.value === item.ip)) {
    els.detectedInput.value = item.ip;
  }
}

function updateSwitchOptions() {
  const isSwitch = els.typeInput.value === "switch";
  els.switchOptions.classList.toggle("hidden", !isSwitch);
  if (!isSwitch) {
    els.statusField.classList.remove("hidden");
    els.macField.classList.remove("hidden");
    els.ipField.classList.remove("hidden");
    els.detectedField.classList.remove("hidden");
    els.statusInput.disabled = true;
    els.macInput.readOnly = true;
    els.ipInput.disabled = false;
    els.detectedInput.disabled = false;
    clearSwitchSpeedError();
    return;
  }
  const isUnmanaged = getSwitchModeValue() === "unmanaged";
  els.statusField.classList.toggle("hidden", isUnmanaged);
  els.macField.classList.toggle("hidden", isUnmanaged);
  els.ipField.classList.toggle("hidden", isUnmanaged);
  els.detectedField.classList.toggle("hidden", isUnmanaged);
  els.statusInput.disabled = true;
  els.macInput.readOnly = true;
  els.ipInput.disabled = isUnmanaged;
  els.detectedInput.disabled = isUnmanaged;
  if (isUnmanaged) {
    els.ipInput.value = "";
    els.detectedInput.value = "";
    els.statusInput.value = "unknown";
    els.macInput.value = "";
  }
}

function getSwitchModeValue() {
  return els.switchManagementInputs.find((input) => input.checked)?.value || "unmanaged";
}

function setSwitchModeValue(value) {
  const next = value === "managed" ? "managed" : "unmanaged";
  els.switchManagementInputs.forEach((input) => {
    input.checked = input.value === next;
  });
}

function getSwitchSpeedsValue() {
  return els.switchSpeedInputs.filter((input) => input.checked).map((input) => input.value);
}

function setSwitchSpeedsValue(speeds) {
  const selected = new Set(Array.isArray(speeds) && speeds.length ? [speeds[0]] : ["1g"]);
  els.switchSpeedInputs.forEach((input) => {
    input.checked = selected.has(input.value);
  });
  clearSwitchSpeedError();
}

function handleSwitchSpeedChange(event) {
  if (event.target.checked) {
    els.switchSpeedInputs.forEach((input) => {
      if (input !== event.target) input.checked = false;
    });
    clearSwitchSpeedError();
  }
}

function clearSwitchSpeedError() {
  els.switchSpeedError.classList.add("hidden");
}

function showSwitchSpeedError() {
  els.switchSpeedError.classList.remove("hidden");
  els.switchOptions.scrollIntoView({ behavior: "smooth", block: "center" });
}

function getPrimarySwitchSpeed(node) {
  const speeds = Array.isArray(node.switchSpeeds) && node.switchSpeeds.length ? node.switchSpeeds : [];
  if (!speeds.length) return "1g";
  return speeds.reduce((best, speed) => (
    switchSpeedRank.indexOf(speed) > switchSpeedRank.indexOf(best) ? speed : best
  ), speeds[0]);
}

function getSwitchBorderColor(node) {
  return switchSpeedColors[getPrimarySwitchSpeed(node)] || switchSpeedColors["1g"];
}

function getSwitchSpeedText(node) {
  const speeds = Array.isArray(node.switchSpeeds) && node.switchSpeeds.length ? node.switchSpeeds : [];
  if (!speeds.length) return "Non impostata";
  return speeds.map((speed) => switchSpeedLabels[speed] || speed).join(", ");
}

function getDeviceSpeedValue() {
  const checked = els.deviceSpeedInputs.find((input) => input.checked);
  return checked ? checked.value : '1g';
}

function setDeviceSpeedValue(value) {
  els.deviceSpeedInputs.forEach((input) => input.checked = input.value === value);
}

function getNodePrimarySpeed(node) {
  if (!node) return '1g';
  if (node.type === 'switch') return getPrimarySwitchSpeed(node);
  if (node.deviceSpeed) return node.deviceSpeed;
  if (node.id === 'router' && node.switchSpeeds) return getPrimarySwitchSpeed(node);
  return '1g';
}

function pickLowerSpeed(a, b) {
  const rankA = switchSpeedRank.indexOf(a) === -1 ? switchSpeedRank.indexOf('1g') : switchSpeedRank.indexOf(a);
  const rankB = switchSpeedRank.indexOf(b) === -1 ? switchSpeedRank.indexOf('1g') : switchSpeedRank.indexOf(b);
  return rankA < rankB ? a : b;
}

function editSelected() {
  const selected = getNode(state.selectedId);
  if (!selected) return toast("Seleziona un dispositivo");
  openDeviceDialog(selected);
}

async function saveDeviceFromForm(event) {
  event.preventDefault();
  const id = els.deviceIdInput.value;
  const isSwitch = els.typeInput.value === "switch";
  const switchMode = getSwitchModeValue();
  const switchSpeeds = isSwitch ? getSwitchSpeedsValue() : [];
  if (isSwitch && switchSpeeds.length !== 1) {
    showSwitchSpeedError();
    toast("Seleziona una sola velocita' massima per lo switch");
    return;
  }
  const payload = {
    name: els.nameInput.value,
    type: els.typeInput.value,
    ip: isSwitch && switchMode === "unmanaged" ? "" : els.ipInput.value,
    notes: els.notesInput.value,
    parentId: els.parentInput.value,
    position: id ? getNode(id)?.position : null,
    switchMode: isSwitch ? switchMode : null,
    switchSpeeds,
    deviceSpeed: isSwitch ? null : getDeviceSpeedValue()
  };
  if (!payload.position) {
    payload.position = nextPosition(payload.parentId);
  }
  try {
    const saved = await api(id ? `/api/devices/${id}` : "/api/devices", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    if (id === "router") state.router = saved;
    else if (id) state.devices = state.devices.map((device) => device.id === id ? saved : device);
    else state.devices.push(saved);
    state.selectedId = saved.id;
    closeDialog();
    render();
    scheduleAutosave();
    toast("Dispositivo salvato");
  } catch (error) {
    toast(error.message);
  }
}

function nextPosition(parentId) {
  const parent = getNode(parentId) || state.router;
  const siblings = state.devices.filter((device) => device.parentId === parentId).length;
  return {
    x: (parent.position?.x || 560) - 180 + siblings * 210,
    y: (parent.position?.y || 80) + 180
  };
}

function closeDialog() {
  els.typeInput.disabled = false;
  els.parentInput.disabled = false;
  els.ipField.classList.remove("hidden");
  els.detectedField.classList.remove("hidden");
  els.statusField.classList.remove("hidden");
  els.ipInput.disabled = false;
  els.detectedInput.disabled = false;
  els.deviceDialog.close();
}

async function deleteSelected() {
  const selected = getNode(state.selectedId);
  if (!selected || selected.id === "router") return toast("Il router base non puo' essere eliminato");
  if (!confirm(`Eliminare ${selected.name}? I figli verranno ricollegati al router.`)) return;
  try {
    await api(`/api/devices/${selected.id}`, { method: "DELETE" });
    state.devices = state.devices
      .filter((device) => device.id !== selected.id)
      .map((device) => device.parentId === selected.id ? { ...device, parentId: "router" } : device);
    state.selectedId = "router";
    render();
    scheduleAutosave();
    toast("Dispositivo eliminato");
  } catch (error) {
    toast(error.message);
  }
}

async function scan(mode, options = {}) {
  if (state.scanInFlight) return;
  state.scanInFlight = true;
  const silent = Boolean(options.silent);
  if (!silent) toast(mode === "range" ? "Scansione range in corso..." : "Aggiornamento stato...");
  try {
    const result = await api("/api/scan", {
      method: "POST",
      body: JSON.stringify({
        mode,
        subnet: `${subnetToPrefix(els.subnetInput.value)}.0/24`,
        scanStart: Number(els.scanStartInput.value),
        scanEnd: Number(els.scanEndInput.value)
      })
    });
    state.router = result.router;
    state.devices = result.devices;
    state.discovered = result.discovered || [];
    ensureLayout();
    render();
    if (!silent) toast(`Scansione completata: ${result.scanned} IP controllati`);
  } catch (error) {
    if (!silent) toast(error.message);
  } finally {
    state.scanInFlight = false;
  }
}

async function saveLayout(showToast = false) {
  try {
    await api("/api/save-layout", {
      method: "POST",
      body: JSON.stringify({
        router: state.router,
        devices: state.devices,
        discovered: state.discovered,
        layout: buildLayout()
      })
    });
    if (showToast) toast("Schema salvato");
  } catch (error) {
    toast(error.message);
  }
}

function buildLayout() {
  return Object.fromEntries(allNodes().map((node) => [node.id, node.position]));
}

function scheduleAutosave() {
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer = setTimeout(() => saveLayout(false), 700);
}

function exportJson() {
  downloadFile("magic-network-layout.json", JSON.stringify({
    router: state.router,
    devices: state.devices,
    discovered: state.discovered,
    settings: state.settings,
    exportedAt: new Date().toISOString()
  }, null, 2), "application/json");
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    state.router = imported.router || state.router;
    state.devices = Array.isArray(imported.devices) ? imported.devices : state.devices;
    state.discovered = Array.isArray(imported.discovered) ? imported.discovered : state.discovered;
    ensureLayout();
    render();
    await saveLayout(true);
    toast("JSON importato");
  } catch (error) {
    toast(`Import non valido: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function exportPng() {
  const clone = els.networkSvg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const style = document.createElement("style");
  style.textContent = `
    .link-line{stroke:#9ca9a5;stroke-width:2;fill:none}
    .node-rect{fill:#fff;stroke:#cfd8d4;stroke-width:1.4;rx:8}
    .node-title{fill:#17211f;font-size:14px;font-weight:780;font-family:Segoe UI,Arial,sans-serif}
    .node-meta,.node-parent{fill:#66736f;font-size:11px;font-weight:600;font-family:Segoe UI,Arial,sans-serif}
    .node-status-ring{stroke-width:3;fill:#fff}
  `;
  clone.prepend(style);
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 760;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fbfdfc";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      if (pngBlob) downloadBlob("magic-network-schema.png", pngBlob);
    }, "image/png");
  };
  image.src = url;
}

function downloadFile(filename, content, type) {
  downloadBlob(filename, new Blob([content], { type }));
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function updateActionState() {
  const hasSelection = Boolean(getNode(state.selectedId));
  document.querySelector("#editDeviceBtn").disabled = !hasSelection;
  document.querySelector("#deleteDeviceBtn").disabled = !hasSelection || state.selectedId === "router";
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function truncate(text, limit) {
  const value = String(text || "");
  return value.length > limit ? `${value.slice(0, limit - 1)}...` : value;
}

function statusLabel(status) {
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  return "Sconosciuto";
}

function hasOperationalStatus(node) {
  return !(node?.type === "switch" && node?.switchMode === "unmanaged");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeSvg(value) {
  return escapeHtml(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function subnetToPrefix(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : "192.168.0";
}

function updateScanPreview() {
  const prefix = subnetToPrefix(els.subnetInput.value);
  const start = clamp(Number(els.scanStartInput.value) || 1, 1, 254);
  const end = clamp(Number(els.scanEndInput.value) || 254, start, 254);
  els.scanPreview.textContent = `Controlla da ${prefix}.${start} a ${prefix}.${end}.`;
}

init();
