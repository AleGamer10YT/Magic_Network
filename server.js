const express = require("express");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");

const execFileAsync = promisify(execFile);
const app = express();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const DATA_FILE = path.join(__dirname, "data", "network.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SWITCH_SPEEDS = new Set(["10m", "100m", "1g", "2_5g", "10g", "10g_plus"]);
const sessions = new Map();

app.use(express.json({ limit: "3mb" }));

function nowIso() {
  return new Date().toISOString();
}

function defaultData() {
  return {
    router: {
      id: "router",
      name: "Router Casa",
      type: "router",
      ip: "192.168.0.1",
      status: "unknown",
      gateway: "192.168.0.1",
      mac: "",
      notes: "Gateway principale della rete LAN",
      parentId: null,
      position: { x: 520, y: 80 }
    },
    devices: [],
    discovered: [],
    layout: {},
    settings: {
      subnet: "192.168.0.0/24",
      scanStart: 1,
      scanEnd: 254,
      autosave: true
    },
    updatedAt: nowIso()
  };
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await writeData(defaultData());
  }
}

async function readData() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    ...defaultData(),
    ...parsed,
    router: { ...defaultData().router, ...(parsed.router || {}) },
    devices: Array.isArray(parsed.devices) ? parsed.devices : [],
    discovered: Array.isArray(parsed.discovered) ? parsed.discovered : [],
    layout: parsed.layout || {},
    settings: { ...defaultData().settings, ...(parsed.settings || {}) }
  };
}

async function writeData(data) {
  const next = { ...data, updatedAt: nowIso() };
  await fs.writeFile(DATA_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function sanitizeDevice(input, existing = {}) {
  const id = existing.id || input.id || crypto.randomUUID();
  const type = String(input.type || existing.type || "pc").toLowerCase();
  const parentId = type === "router"
    ? null
    : input.parentId === undefined ? existing.parentId || "router" : input.parentId || "router";
  const switchMode = type === "switch" && input.switchMode === "managed" ? "managed" : type === "switch" ? "unmanaged" : null;
  const switchSpeeds = type === "switch"
    ? normalizeSwitchSpeeds(input.switchSpeeds || existing.switchSpeeds)
    : [];
  return {
    id,
    name: String(input.name || existing.name || "Nuovo dispositivo").trim(),
    type,
    ip: switchMode === "unmanaged" ? "" : String(input.ip || existing.ip || "").trim(),
    status: switchMode === "unmanaged" ? null : existing.status || "unknown",
    mac: switchMode === "unmanaged" ? "" : String(existing.mac || "").trim(),
    notes: String(input.notes || existing.notes || "").trim(),
    parentId,
    position: normalizePosition(input.position || existing.position),
    lastSeen: existing.lastSeen || null,
    switchMode,
    switchSpeeds
  };
}

function enrichDeviceFromDiscovery(device, discoveredItems = []) {
  if (!device || device.switchMode === "unmanaged") {
    return { ...device, ip: "", status: null, mac: "", lastSeen: null };
  }
  if (!device.ip) return { ...device, status: "unknown", mac: device.mac || "" };
  const match = discoveredItems.find((item) => item.ip === device.ip || (device.mac && item.mac && item.mac === device.mac));
  if (!match) return device;
  const status = match.status || device.status || "unknown";
  return {
    ...device,
    status,
    mac: match.mac || device.mac || "",
    lastSeen: status === "online" ? nowIso() : device.lastSeen || match.lastSeen || null
  };
}

function updateSavedDevicesFromDiscovery(devices, discoveredItems = []) {
  return devices.map((device) => {
    if (device.switchMode === "unmanaged") return { ...device, ip: "", status: null, mac: "", lastSeen: null };
    if (!device.ip) return { ...device, status: "unknown", mac: device.mac || "" };
    const match = discoveredItems.find((item) => item.ip === device.ip || (device.mac && item.mac && item.mac === device.mac));
    if (!match) return { ...device, status: "unknown" };
    const status = match.status || "unknown";
    return {
      ...device,
      status,
      mac: match.mac || device.mac || "",
      lastSeen: status === "online" ? nowIso() : device.lastSeen || match.lastSeen || null
    };
  });
}

function normalizeSwitchSpeeds(speeds) {
  if (!Array.isArray(speeds)) return [];
  const normalized = speeds.map(String).filter((speed) => SWITCH_SPEEDS.has(speed));
  return normalized.length ? [normalized[0]] : [];
}

function validateDeviceInput(input) {
  const type = String(input?.type || "").toLowerCase();
  if (type !== "switch") return null;
  const speeds = Array.isArray(input.switchSpeeds)
    ? [...new Set(input.switchSpeeds.map(String).filter((speed) => SWITCH_SPEEDS.has(speed)))]
    : [];
  if (speeds.length !== 1) return "Seleziona una sola velocita' massima per lo switch";
  return null;
}

function normalizePosition(position) {
  if (!position || typeof position !== "object") return null;
  const x = Number(position.x);
  const y = Number(position.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function getClientIp(req) {
  return req.socket.remoteAddress || "";
}

function cleanupSessions() {
  const now = Date.now();
  for (const [token, expiresAt] of sessions.entries()) {
    if (expiresAt <= now) sessions.delete(token);
  }
}

function isLocalRequest(req) {
  const ip = getClientIp(req).replace("::ffff:", "");
  return ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function authRequired(req, res, next) {
  if (!APP_PASSWORD) return next();
  if (req.path === "/api/login" || req.path === "/api/auth-status") return next();
  cleanupSessions();
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token && sessions.has(token)) return next();
  return res.status(401).json({ error: "Password richiesta" });
}

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

app.use("/api", authRequired);

app.get("/api/auth-status", (req, res) => {
  res.json({ enabled: Boolean(APP_PASSWORD), local: isLocalRequest(req) });
});

app.post("/api/login", (req, res) => {
  if (!APP_PASSWORD) return res.json({ token: "" });
  if (!isLocalRequest(req)) return res.status(403).json({ error: "Accesso consentito solo da rete locale" });
  if (req.body?.password !== APP_PASSWORD) return res.status(401).json({ error: "Password non valida" });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  res.json({ token, expiresInMs: SESSION_TTL_MS });
});

app.get("/api/network-status", async (req, res) => {
  const data = await readData();
  const network = getNetworkSummary();
  const gateway = network.gateway || data.router.gateway || data.router.ip;
  const routerIp = data.router.ip || gateway;
  const routerStatus = routerIp ? await pingHost(routerIp) : "unknown";
  const arp = await readArpTable();
  const routerMac = arp.find((entry) => entry.ip === routerIp)?.mac || data.router.mac || "";
  data.router = {
    ...data.router,
    ip: routerIp,
    gateway,
    status: routerStatus,
    mac: routerMac
  };
  await writeData(data);
  res.json({
    router: data.router,
    interfaces: network.interfaces,
    gateway,
    hostname: os.hostname(),
    platform: os.platform(),
    scanAvailable: {
      ping: true,
      arp: true,
      nmap: await hasCommand("nmap")
    },
    note: "Il browser non puo' scansionare direttamente tutta la LAN; queste informazioni arrivano dal backend locale."
  });
});

app.get("/api/devices", async (req, res) => {
  const data = await readData();
  res.json({ router: data.router, devices: data.devices, discovered: data.discovered, settings: data.settings, updatedAt: data.updatedAt });
});

app.post("/api/devices", async (req, res) => {
  const validationError = validateDeviceInput(req.body || {});
  if (validationError) return res.status(400).json({ error: validationError });
  const data = await readData();
  const device = enrichDeviceFromDiscovery(sanitizeDevice(req.body || {}), data.discovered);
  data.devices.push(device);
  await writeData(data);
  res.status(201).json(device);
});

app.put("/api/devices/:id", async (req, res) => {
  const data = await readData();
  if (req.params.id === "router") {
    data.router = { ...data.router, ...sanitizeDevice({ ...data.router, ...(req.body || {}), id: "router", type: "router", parentId: null }) };
    await writeData(data);
    return res.json(data.router);
  }
  const index = data.devices.findIndex((device) => device.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Dispositivo non trovato" });
  const validationError = validateDeviceInput(req.body || {});
  if (validationError) return res.status(400).json({ error: validationError });
  data.devices[index] = enrichDeviceFromDiscovery(sanitizeDevice(req.body || {}, data.devices[index]), data.discovered);
  await writeData(data);
  res.json(data.devices[index]);
});

app.delete("/api/devices/:id", async (req, res) => {
  if (req.params.id === "router") return res.status(400).json({ error: "Il router base non puo' essere eliminato" });
  const data = await readData();
  const exists = data.devices.some((device) => device.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Dispositivo non trovato" });
  data.devices = data.devices
    .filter((device) => device.id !== req.params.id)
    .map((device) => (device.parentId === req.params.id ? { ...device, parentId: "router" } : device));
  await writeData(data);
  res.status(204).end();
});

app.post("/api/scan", async (req, res) => {
  const data = await readData();
  const mode = req.body?.mode || "known";
  const scanStart = clamp(Number(req.body?.scanStart ?? data.settings.scanStart), 1, 254);
  const scanEnd = clamp(Number(req.body?.scanEnd ?? data.settings.scanEnd), scanStart, 254);
  const subnetBase = getSubnetBase(req.body?.subnet || data.settings.subnet || data.router.ip);
  const localInterfaces = getNetworkSummary().interfaces
    .filter((entry) => isScanCandidate(entry.address, subnetBase))
    .map((entry) => ({ ip: entry.address, mac: normalizeMac(entry.mac), name: os.hostname() }));
  const arpEntries = (await readArpTable()).filter((entry) => isScanCandidate(entry.ip, subnetBase));
  const nmapEntries = (mode === "range" ? await runNmap(subnetBase, scanStart, scanEnd) : []).filter((entry) => isScanCandidate(entry.ip, subnetBase));
  const targets = mode === "range"
    ? Array.from({ length: scanEnd - scanStart + 1 }, (_, index) => `${subnetBase}.${scanStart + index}`)
    : [...new Set([data.router.ip, ...data.devices.map((device) => device.ip).filter(Boolean), ...localInterfaces.map((entry) => entry.ip), ...arpEntries.map((entry) => entry.ip), ...nmapEntries.map((entry) => entry.ip)])].filter(isPrivateUnicast);

  const limitedTargets = targets.filter(Boolean).slice(0, mode === "range" ? 254 : 80);
  const statuses = await pingMany(limitedTargets, mode === "range" ? 32 : 16);
  const discovered = mergeDiscovery(limitedTargets, statuses, arpEntries, nmapEntries, localInterfaces, data.devices, data.discovered);

  data.router.status = statuses[data.router.ip] || data.router.status || "unknown";
  data.router.mac = discovered.find((item) => item.ip === data.router.ip)?.mac || arpEntries.find((entry) => entry.ip === data.router.ip)?.mac || data.router.mac || "";
  data.devices = updateSavedDevicesFromDiscovery(data.devices, discovered);
  data.discovered = upsertDiscoveredItems(data.discovered, discovered, data.router.ip);
  data.settings = { ...data.settings, scanStart, scanEnd, subnet: `${subnetBase}.0/24` };
  await writeData(data);
  res.json({ router: data.router, devices: data.devices, discovered: data.discovered, scanned: limitedTargets.length });
});

app.post("/api/save-layout", async (req, res) => {
  const data = await readData();
  const layout = req.body?.layout || {};
  const devices = Array.isArray(req.body?.devices) ? req.body.devices : [];
  data.layout = layout;
  if (req.body?.router) data.router = { ...data.router, ...req.body.router, id: "router", type: "router", parentId: null };
  if (Array.isArray(req.body?.devices)) {
    const invalidDevice = devices.find((device) => validateDeviceInput(device));
    if (invalidDevice) return res.status(400).json({ error: validateDeviceInput(invalidDevice) });
    const existingDevices = data.devices;
    data.devices = devices.map((device) => enrichDeviceFromDiscovery(
      sanitizeDevice(device, existingDevices.find((item) => item.id === device.id) || {}),
      data.discovered
    ));
  }
  if (Array.isArray(req.body?.discovered)) data.discovered = req.body.discovered;
  await writeData(data);
  res.json({ ok: true, updatedAt: data.updatedAt });
});

app.get("/api/load-layout", async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.use(express.static(PUBLIC_DIR));

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function getSubnetBase(value) {
  const text = String(value || "192.168.1.0").split("/")[0];
  const match = text.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\./);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : "192.168.1";
}

function isPrivateUnicast(ip) {
  const parts = String(ip || "").split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10) return parts[3] > 0 && parts[3] < 255;
  if (parts[0] === 192 && parts[1] === 168) return parts[3] > 0 && parts[3] < 255;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return parts[3] > 0 && parts[3] < 255;
  return false;
}

function isScanCandidate(ip, subnetBase) {
  return isPrivateUnicast(ip) && String(ip).startsWith(`${subnetBase}.`);
}

function normalizeMac(mac) {
  const text = String(mac || "").trim();
  if (!text || text === "00:00:00:00:00:00") return "";
  return text.toLowerCase().replace(/-/g, ":");
}

function resolveHostStatus(pingStatus, ...sources) {
  if (pingStatus === "online") return "online";
  if (sources.some((source) => source?.mac)) return "online";
  return pingStatus || "unknown";
}

function getNetworkSummary() {
  const interfaces = [];
  const nets = os.networkInterfaces();
  for (const [name, entries] of Object.entries(nets)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        interfaces.push({
          name,
          address: entry.address,
          netmask: entry.netmask,
          mac: normalizeMac(entry.mac),
          cidr: entry.cidr
        });
      }
    }
  }
  return {
    interfaces,
    gateway: guessGateway(interfaces)
  };
}

function guessGateway(interfaces) {
  const first = interfaces[0]?.address;
  if (!first) return "";
  const parts = first.split(".");
  parts[3] = "1";
  return parts.join(".");
}

async function pingHost(ip) {
  if (!ip) return "unknown";
  const args = os.platform() === "win32" ? ["-n", "1", "-w", "700", ip] : ["-c", "1", "-W", "1", ip];
  try {
    await execFileAsync("ping", args, { timeout: 1500, windowsHide: true });
    return "online";
  } catch {
    return "offline";
  }
}

async function pingMany(ips, concurrency) {
  const results = {};
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < ips.length) {
      const ip = ips[cursor++];
      results[ip] = await pingHost(ip);
    }
  });
  await Promise.all(workers);
  return results;
}

async function readArpTable() {
  try {
    const { stdout } = await execFileAsync("arp", ["-a"], { timeout: 3000, windowsHide: true });
    const entries = [];
    for (const line of stdout.split(/\r?\n/)) {
      const ip = line.match(/(\d{1,3}(?:\.\d{1,3}){3})/)?.[1];
      const mac = line.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i)?.[0];
      if (ip) entries.push({ ip, mac: normalizeMac(mac) });
    }
    return entries;
  } catch {
    return [];
  }
}

async function hasCommand(command) {
  try {
    const check = os.platform() === "win32" ? "where" : "which";
    await execFileAsync(check, [command], { timeout: 1500, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function runNmap(subnetBase, scanStart, scanEnd) {
  if (!(await hasCommand("nmap"))) return [];
  const range = `${subnetBase}.${scanStart}-${scanEnd}`;
  try {
    const { stdout } = await execFileAsync("nmap", ["-sn", range], { timeout: 45000, windowsHide: true });
    const entries = [];
    let currentHost = null;
    for (const line of stdout.split(/\r?\n/)) {
      const host = line.match(/Nmap scan report for (?:.+ \()?(\d{1,3}(?:\.\d{1,3}){3})\)?/);
      if (host) {
        currentHost = { ip: host[1], mac: "" };
        entries.push(currentHost);
      }
      const mac = line.match(/MAC Address: ([0-9A-F:]{17})/i);
      if (mac && currentHost) currentHost.mac = normalizeMac(mac[1]);
    }
    return entries;
  } catch {
    return [];
  }
}

function mergeDiscovery(targets, statuses, arpEntries, nmapEntries, localInterfaces, existingDevices, existingDiscovered) {
  return targets.map((ip) => {
    const known = existingDevices.find((device) => device.ip === ip);
    const existing = existingDiscovered.find((device) => device.ip === ip);
    const local = localInterfaces.find((entry) => entry.ip === ip);
    const arp = arpEntries.find((entry) => entry.ip === ip);
    const nmap = nmapEntries.find((entry) => entry.ip === ip);
    const status = resolveHostStatus(statuses[ip], local, nmap, arp);
    return {
      ip,
      name: known?.name || existing?.name || local?.name || `Dispositivo ${ip}`,
      type: known?.type || existing?.type || "unknown",
      status,
      mac: local?.mac || nmap?.mac || arp?.mac || known?.mac || existing?.mac || "",
      parentId: known?.parentId || existing?.parentId || "router",
      lastSeen: status === "online" ? nowIso() : known?.lastSeen || existing?.lastSeen || null,
      inMap: Boolean(known)
    };
  });
}

function upsertDiscoveredItems(items, discovered, routerIp) {
  const next = [...items];
  for (const item of discovered) {
    if (!item.ip || item.ip === routerIp) continue;
    const index = next.findIndex((device) => device.ip === item.ip || (item.mac && device.mac === item.mac));
    if (index >= 0) {
      next[index] = { ...next[index], ...item };
    } else if (item.status === "online" || item.mac) {
      next.push({ ...item, id: crypto.randomUUID() });
    }
  }
  return next.filter((item) => item.ip && item.ip !== routerIp);
}

ensureDataFile()
  .then(() => {
    const server = app.listen(PORT, HOST, () => {
      console.log("Magic Network avviato.");
      for (const url of getStartupUrls()) {
        console.log(`- ${url}`);
      }
      console.log("Imposta HOST a un IP LAN specifico per restringere l'ascolto, oppure APP_PASSWORD per abilitare la password.");
    });
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Porta ${PORT} gia' in uso su ${HOST}. Chiudi il processo esistente oppure avvia con PORT=3001 npm run dev.`);
        process.exit(1);
      }
      console.error("Errore del server:", error);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error("Errore di avvio:", error);
    process.exit(1);
  });

function getStartupUrls() {
  const urls = [`http://localhost:${PORT}`];
  if (HOST !== "0.0.0.0") {
    urls.push(`http://${HOST}:${PORT}`);
    return urls;
  }
  for (const item of getNetworkSummary().interfaces) {
    urls.push(`http://${item.address}:${PORT}`);
  }
  return [...new Set(urls)];
}
