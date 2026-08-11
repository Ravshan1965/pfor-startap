/**
 * PFOR Platform — Authentication Module
 * Handles JWT token storage, user session management,
 * and auth modal interactions (login / register tabs).
 */

const API_BASE = 'http://localhost:8000';
const TOKEN_KEY = 'pfor_access_token';
const USER_KEY  = 'pfor_user';

// ---------------------------------------------------------------------------
// Token utilities
// ---------------------------------------------------------------------------

/**
 * Save the JWT token and user data to localStorage.
 * @param {string} token
 * @param {Object} user
 */
function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear the current session from localStorage.
 */
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Return the stored JWT token, or null if not authenticated.
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Return the stored user object, or null.
 * @returns {Object|null}
 */
function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Return true if a token exists in storage.
 * @returns {boolean}
 */
function isAuthenticated() {
  return !!getToken();
}

// ---------------------------------------------------------------------------
// UI: Navbar user state
// ---------------------------------------------------------------------------

/**
 * Update the navbar auth buttons based on session state.
 */
function updateNavbarAuthState() {
  const loginBtn   = document.getElementById('nav-login-btn');
  const logoutBtn  = document.getElementById('nav-logout-btn');
  const userBadge  = document.getElementById('nav-user-badge');
  const userEmail  = document.getElementById('nav-user-email');

  const user = getCurrentUser();

  if (user && isAuthenticated()) {
    loginBtn  && loginBtn.classList.add('hidden');
    logoutBtn && logoutBtn.classList.remove('hidden');
    userBadge && userBadge.classList.remove('hidden');
    if (userEmail) userEmail.textContent = user.email;
  } else {
    loginBtn  && loginBtn.classList.remove('hidden');
    logoutBtn && logoutBtn.classList.add('hidden');
    userBadge && userBadge.classList.add('hidden');
  }
}

// ---------------------------------------------------------------------------
// Modal management
// ---------------------------------------------------------------------------

/**
 * Open the auth modal and switch to the given tab.
 * @param {'login'|'register'} tab
 */
function openAuthModal(tab = 'login') {
  const overlay = document.getElementById('auth-modal-overlay');
  overlay && overlay.classList.add('visible');
  switchAuthTab(tab);
  clearAuthErrors();
}

/**
 * Close the auth modal.
 */
function closeAuthModal() {
  const overlay = document.getElementById('auth-modal-overlay');
  overlay && overlay.classList.remove('visible');
  clearAuthErrors();
}

/**
 * Switch between login and register tabs inside the modal.
 * @param {'login'|'register'} tab
 */
function switchAuthTab(tab) {
  const loginTab    = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginForm   = document.getElementById('login-form');
  const registerForm= document.getElementById('register-form');

  if (tab === 'login') {
    loginTab    && loginTab.classList.add('active');
    registerTab && registerTab.classList.remove('active');
    loginForm   && loginForm.classList.remove('hidden');
    registerForm&& registerForm.classList.add('hidden');
  } else {
    registerTab && registerTab.classList.add('active');
    loginTab    && loginTab.classList.remove('active');
    registerForm&& registerForm.classList.remove('hidden');
    loginForm   && loginForm.classList.add('hidden');
  }
}

/**
 * Clear all visible validation error messages.
 */
function clearAuthErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Register a new user account.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{access_token: string, user: Object}>}
 */
async function apiRegister(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Registration failed.');
  }
  return data;
}

/**
 * Login with existing credentials.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{access_token: string, user: Object}>}
 */
async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Login failed.');
  }
  return data;
}

// ---------------------------------------------------------------------------
// Form submission handlers
// ---------------------------------------------------------------------------

/**
 * Handle login form submission.
 * @param {Event} event
 */
async function handleLogin(event) {
  event.preventDefault();
  clearAuthErrors();

  const emailInput = document.getElementById('login-email');
  const passInput  = document.getElementById('login-password');
  const submitBtn  = document.getElementById('login-submit');
  const errorEl    = document.getElementById('login-error');

  const email    = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    showFormError(errorEl, 'Please enter email and password.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const data = await apiLogin(email, password);
    saveSession(data.access_token, data.user);
    updateNavbarAuthState();
    closeAuthModal();
    showToast('Welcome back! 👋', 'success');
  } catch (err) {
    showFormError(errorEl, err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
}

/**
 * Handle registration form submission.
 * @param {Event} event
 */
async function handleRegister(event) {
  event.preventDefault();
  clearAuthErrors();

  const emailInput = document.getElementById('register-email');
  const passInput  = document.getElementById('register-password');
  const submitBtn  = document.getElementById('register-submit');
  const errorEl    = document.getElementById('register-error');

  const email    = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    showFormError(errorEl, 'Please enter email and password.');
    return;
  }

  if (password.length < 6) {
    showFormError(errorEl, 'Password must be at least 6 characters.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const data = await apiRegister(email, password);
    saveSession(data.access_token, data.user);
    updateNavbarAuthState();
    closeAuthModal();
    showToast('Account created! Welcome to PFOR 🚀', 'success');
  } catch (err) {
    showFormError(errorEl, err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}

/**
 * Handle logout action.
 */
function handleLogout() {
  clearSession();
  updateNavbarAuthState();
  showToast('Signed out successfully.', 'success');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Display an error message in a form error element.
 * @param {HTMLElement} el
 * @param {string} message
 */
function showFormError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuthState();

  // Modal close on overlay click
  document.getElementById('auth-modal-overlay')
    ?.addEventListener('click', (e) => {
      if (e.target.id === 'auth-modal-overlay') closeAuthModal();
    });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAuthModal();
  });

  // Tab switching
  document.getElementById('tab-login')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => switchAuthTab('register'));

  // Modal close button
  document.getElementById('modal-close-btn')?.addEventListener('click', closeAuthModal);

  // Nav buttons
  document.getElementById('nav-login-btn')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('nav-logout-btn')?.addEventListener('click', handleLogout);

  // Forms
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
});

// Expose for use in app.js
window.PforAuth = {
  getToken,
  getCurrentUser,
  isAuthenticated,
  openAuthModal,
};
