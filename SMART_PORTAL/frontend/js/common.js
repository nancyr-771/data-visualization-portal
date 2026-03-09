const API_BASE = "http://127.0.0.1:5000";

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

function requireAuth(role) {
  const token = getToken();
  const user = getUser();
  if (!token || !user || user.role !== role) {
    clearAuth();
    window.location.href = "login.html";
  }
  return user;
}

function logout() {
  clearAuth();
  window.location.href = "login.html";
}
