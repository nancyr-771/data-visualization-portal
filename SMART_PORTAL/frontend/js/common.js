function resolveApiBase() {
  const configuredBase =
    window.__APP_CONFIG__?.API_BASE ||
    document.querySelector('meta[name="api-base"]')?.content ||
    localStorage.getItem("api_base_override") ||
    "";

  if (configuredBase) {
    return configuredBase.replace(/\/+$/, "");
  }

  const { protocol, hostname } = window.location;
  const isLocal =
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  return isLocal ? "http://127.0.0.1:5000" : "/api";
}

const API_BASE = resolveApiBase();

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function setAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}

function showStatus(id, message, type = "info") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `status show ${type}`;
}

function hideStatus(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = "status";
  el.textContent = "";
}

function ensureToastRoot() {
  let root = document.getElementById("toastRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "toastRoot";
    root.className = "toast-root";
    document.body.appendChild(root);
  }
  return root;
}

function showToast(message, type = "info") {
  const root = ensureToastRoot();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  root.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add("hide");
    window.setTimeout(() => toast.remove(), 240);
  }, 2600);
}

function requireAuth(role) {
  const token = getToken();
  const user = getUser();
  if (!token || !user || (role && user.role !== role)) {
    clearAuth();
    window.location.href = "login.html";
  }
  return user;
}

function logout() {
  clearAuth();
  window.location.href = "login.html";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

async function downloadFile(url, filename) {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }
    throw new Error(payload.error || "Download failed");
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2).replace(/\.00$/, "") : value ?? "-";
}

function setButtonLoading(button, isLoading, loadingText, idleText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
}

function populateClassSelect(select, classes = [], selectedClassId = "") {
  if (!select) return;
  const previousValue = selectedClassId || select.value;
  select.innerHTML = "";
  classes.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.class_id;
    option.textContent = `${item.class_name} | ${item.student_count ?? 0} students`;
    if (item.class_id === previousValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function toggleSidebar() {
  document.body.classList.toggle("sidebar-open");
}

window.addEventListener("DOMContentLoaded", () => {
  const toggles = document.querySelectorAll("[data-sidebar-toggle]");
  toggles.forEach((toggle) => toggle.addEventListener("click", toggleSidebar));
});
