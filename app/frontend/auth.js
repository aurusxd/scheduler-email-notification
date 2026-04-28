const AUTH_STORAGE_KEY = "tasknotify_auth_user_v1";
const loginTabBtn = document.getElementById("loginTabBtn");
const registerTabBtn = document.getElementById("registerTabBtn");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginUsernameInput = document.getElementById("loginUsernameInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const registerUsernameInput = document.getElementById("registerUsernameInput");
const registerEmailInput = document.getElementById("registerEmailInput");
const registerPasswordInput = document.getElementById("registerPasswordInput");
const authFeedback = document.getElementById("authFeedback");
const API_BASE_URL = window.localStorage.getItem("tasknotify_api_base_url") || "http://127.0.0.1:8000";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function showAuthFeedback(message, type = "") {
  if (!authFeedback) return;
  const text = normalizeText(message);
  authFeedback.textContent = text;
  authFeedback.classList.toggle("hidden", !text);
  authFeedback.classList.toggle("error", type === "error");
  authFeedback.classList.toggle("success", type === "success");
}

function saveAuthUser(user) {
  if (!user) return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (_) {
    // Ignore storage errors.
  }
}

function loadAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Number.isInteger(parsed.id)) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function setAuthTab(nextTab) {
  const isLogin = nextTab === "login";
  loginTabBtn?.classList.toggle("active", isLogin);
  registerTabBtn?.classList.toggle("active", !isLogin);
  loginForm?.classList.toggle("hidden", !isLogin);
  registerForm?.classList.toggle("hidden", isLogin);
  showAuthFeedback("");
}

async function authRequest(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(normalizeText(data?.detail || "Ошибка авторизации"));
  }
  return data;
}

async function submitLogin(event) {
  event.preventDefault();
  const username = normalizeText(loginUsernameInput?.value);
  const password = loginPasswordInput?.value || "";
  if (!username || !password) {
    showAuthFeedback("Введите логин и пароль", "error");
    return;
  }

  try {
    const data = await authRequest("/api/auth/login", { username, password });
    saveAuthUser(data.user);
    window.location.href = "./index.html";
  } catch (error) {
    showAuthFeedback(error.message || "Ошибка входа", "error");
  }
}

async function submitRegister(event) {
  event.preventDefault();
  const username = normalizeText(registerUsernameInput?.value);
  const email_address = normalizeText(registerEmailInput?.value);
  const password = registerPasswordInput?.value || "";
  if (!username || !email_address || !password) {
    showAuthFeedback("Заполните все поля регистрации", "error");
    return;
  }

  try {
    const data = await authRequest("/api/auth/register", {
      username,
      email_address,
      password,
    });
    saveAuthUser(data.user);
    window.location.href = "./index.html";
  } catch (error) {
    showAuthFeedback(error.message || "Ошибка регистрации", "error");
  }
}

const existingUser = loadAuthUser();
if (existingUser?.id) {
  window.location.href = "./index.html";
}

setAuthTab("login");
loginTabBtn?.addEventListener("click", () => setAuthTab("login"));
registerTabBtn?.addEventListener("click", () => setAuthTab("register"));
loginForm?.addEventListener("submit", submitLogin);
registerForm?.addEventListener("submit", submitRegister);
