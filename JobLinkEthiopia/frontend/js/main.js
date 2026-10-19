// --- Role-Isolated Storage Helpers ---
function getSeekerAuth() {
  let token = localStorage.getItem('seeker_token') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('seeker_token') ||
    localStorage.getItem('token');
  let userStr = localStorage.getItem('seeker_user') ||
    sessionStorage.getItem('seeker_user') ||
    localStorage.getItem('user') ||
    sessionStorage.getItem('user');
  let user = null;
  if (userStr) {
    try { user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr; } catch (e) { }
  }
  if ((!token || !user) && (localStorage.getItem('token') || localStorage.getItem('accessToken')) && (localStorage.getItem('user') || sessionStorage.getItem('user'))) {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      const legacyUser = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (legacyUser && (legacyUser.role === 'job_seeker' || !legacyUser.role)) {
        token = localStorage.getItem('seeker_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
        user = legacyUser;
      }
    } catch (e) { }
  }
  return { token, user };
}

function setSeekerAuth(token, user) {
  if (token) {
    localStorage.setItem('seeker_token', token);
    localStorage.setItem('accessToken', token);
  }
  if (user) {
    const str = typeof user === 'string' ? user : JSON.stringify(user);
    localStorage.setItem('seeker_user', str);
    localStorage.setItem('user', str);
  }
}

function clearSeekerAuth() {
  localStorage.removeItem('seeker_token');
  localStorage.removeItem('seeker_user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('seeker_token');
  sessionStorage.removeItem('seeker_user');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}

function getEmployerAuth() {
  let token = localStorage.getItem('employer_token') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('employer_token') ||
    localStorage.getItem('token');
  let userStr = localStorage.getItem('employer_user') ||
    sessionStorage.getItem('employer_user') ||
    localStorage.getItem('user') ||
    sessionStorage.getItem('user');
  let user = null;
  if (userStr) {
    try {
      const parsed = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
      if (parsed) {
        user = parsed;
      }
    } catch (e) { }
  }
  if ((!token || !user) && (localStorage.getItem('token') || localStorage.getItem('accessToken')) && (localStorage.getItem('user') || sessionStorage.getItem('user'))) {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      const legacyUser = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (legacyUser && (legacyUser.role === 'employer' || !legacyUser.role)) {
        token = localStorage.getItem('employer_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
        user = legacyUser;
      }
    } catch (e) { }
  }
  return { token, user };
}

function setEmployerAuth(token, user) {
  if (token) {
    localStorage.setItem('employer_token', token);
    localStorage.setItem('accessToken', token);
  }
  if (user) {
    const str = typeof user === 'string' ? user : JSON.stringify(user);
    localStorage.setItem('employer_user', str);
    localStorage.setItem('user', str);
  }
}

function clearEmployerAuth() {
  localStorage.removeItem('employer_token');
  localStorage.removeItem('employer_user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('employer_token');
  sessionStorage.removeItem('employer_user');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}

// Expose on window for direct access across modules/pages
window.getSeekerAuth = getSeekerAuth;
window.setSeekerAuth = setSeekerAuth;
window.clearSeekerAuth = clearSeekerAuth;
window.getEmployerAuth = getEmployerAuth;
window.setEmployerAuth = setEmployerAuth;
window.clearEmployerAuth = clearEmployerAuth;

// Helper: Open Modal by ID
window.openModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.classList.remove('hidden');
  }
};

// Helper: Close Modal by ID
window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }
};

// Helper: Open Register Modal directly
window.openRegisterModal = function (e, role) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  if (role) selectedAuthRole = role;
  if (typeof window.setAuthModalMode === 'function') {
    window.setAuthModalMode(null, true, role);
  } else {
    try {
      isRegisterMode = true;
      registerStep = 1;
      if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
    } catch (err) {}
  }
  if (typeof window.openModal === 'function') {
    window.openModal('login-modal');
  } else {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('active');
    }
  }
  return false;
};

// Helper: Open Sign In / Login Modal directly
window.openLoginModal = function (e, role) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  if (role) selectedAuthRole = role;
  if (typeof window.setAuthModalMode === 'function') {
    window.setAuthModalMode(null, false, role);
  } else {
    try {
      isRegisterMode = false;
      registerStep = 1;
      if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
    } catch (err) {}
  }
  if (typeof window.openModal === 'function') {
    window.openModal('login-modal');
  } else {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('active');
    }
  }
  return false;
};

// Helper: Prompt Seeker Login Modal / Redirection
window.promptSeekerLogin = function (msg) {
  if (msg) showToast(msg, 'warning');
  const loginModal = document.getElementById('login-modal');
  if (loginModal) {
    if (typeof updateAuthModalUI === 'function') {
      try {
        isRegisterMode = false;
        loginRedirectUrl = 'seeker.html';
        updateAuthModalUI();
      } catch (e) { }
    }
    window.openModal('login-modal');
  } else {
    setTimeout(() => {
      window.location.href = 'index.html?login=seeker';
    }, 800);
  }
};

// Helper: Handle Seeker Session Expiration Gracefully
window.handleSeekerSessionExpired = function (customMessage) {
  clearSeekerAuth();
  if (window.userSavedJobIds) {
    window.userSavedJobIds.clear();
  }
  if (typeof window.applySavedJobIconsState === 'function') {
    window.applySavedJobIconsState();
  }
  if (typeof window.updateHeaderAuthUI === 'function') {
    window.updateHeaderAuthUI(null);
  }
  const message = customMessage || 'Your session has expired. Please log in again to save jobs.';
  showToast(message, 'warning');

  const loginModal = document.getElementById('login-modal');
  if (loginModal) {
    if (typeof updateAuthModalUI === 'function') {
      try {
        isRegisterMode = false;
        loginRedirectUrl = 'seeker.html';
        updateAuthModalUI();
      } catch (e) { }
    }
    window.openModal('login-modal');
  } else {
    setTimeout(() => {
      window.location.href = 'index.html?login=seeker';
    }, 800);
  }
};

// Helper: Get Badge Color Class by Job Type
function getJobTypeBadgeClass(type) {
  const t = (type || '').toLowerCase().trim();
  if (t === 'full-time') return 'badge-green';
  if (t === 'part-time') return 'badge-blue';
  if (t === 'contract') return 'badge-purple';
  if (t === 'internship') return 'badge-teal';
  if (t === 'freelance') return 'badge-orange';
  return 'badge-green';
}
window.getJobTypeBadgeClass = getJobTypeBadgeClass;

// Utility: Format relative time ("time ago") from a date or timestamp
function timeSince(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const seconds = Math.floor((new Date() - d) / 1000);

  // If timestamp is slightly in the future due to minor clock skew or very recent (< 10 seconds)
  if (seconds < 10) {
    return 'Just now';
  }

  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(seconds / 3600);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(seconds / 86400);
  if (days < 30) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const months = Math.floor(seconds / 2592000); // ~30 days
  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(seconds / 31536000); // ~365 days
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
window.timeSince = timeSince;

// Unified & Isolated Logout Functions
async function logoutSeeker(e) {
  if (e && e.preventDefault) e.preventDefault();
  clearSeekerAuth();
  try {
    await fetch('/api/auth/seeker/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true
    });
  } catch (err) {
    console.warn('Seeker logout API notice:', err);
  }
  if (typeof showToast === 'function') {
    showToast('Job Seeker logged out successfully', 'info');
  }
  window.location.href = 'index.html';
}

async function logoutEmployer(e) {
  if (e && e.preventDefault) e.preventDefault();
  clearEmployerAuth();
  try {
    await fetch('/api/auth/employer/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true
    });
  } catch (err) {
    console.warn('Employer logout API notice:', err);
  }
  if (typeof showToast === 'function') {
    showToast('Employer logged out successfully', 'info');
  }
  window.location.href = 'index.html';
}

window.logoutSeeker = logoutSeeker;
window.logoutEmployer = logoutEmployer;
window.logout = logoutEmployer;

// Universal Delegated Click Handler for Logout (Capture Phase to guarantee interception)
document.addEventListener('click', (e) => {
  const logoutTarget = e.target.closest('#employer-logout-btn, #seeker-logout-btn, #logout-btn, [data-action="logout-employer"], [data-action="logout-seeker"], [data-action="logout"], .logout-link');
  if (logoutTarget) {
    if (logoutTarget.classList.contains('btn-back-home')) return;

    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();

    const action = logoutTarget.getAttribute('data-action');
    const isEmployer = (action === 'logout-employer' || logoutTarget.id === 'employer-logout-btn' || window.location.pathname.includes('employer.html') || (typeof currentPage !== 'undefined' && currentPage === 'employer.html'));
    const isSeeker = (action === 'logout-seeker' || logoutTarget.id === 'seeker-logout-btn' || window.location.pathname.includes('seeker.html') || (typeof currentPage !== 'undefined' && currentPage === 'seeker.html'));

    if (isEmployer) {
      if (typeof window.logoutEmployer === 'function') {
        window.logoutEmployer(e);
      } else {
        logoutEmployer(e);
      }
    } else if (isSeeker) {
      if (typeof window.logoutSeeker === 'function') {
        window.logoutSeeker(e);
      } else {
        logoutSeeker(e);
      }
    } else {
      const empAuth = typeof getEmployerAuth === 'function' ? getEmployerAuth() : {};
      if (empAuth && (empAuth.token || empAuth.user)) {
        if (typeof window.logoutEmployer === 'function') {
          window.logoutEmployer(e);
        } else {
          logoutEmployer(e);
        }
      } else {
        if (typeof window.logoutSeeker === 'function') {
          window.logoutSeeker(e);
        } else {
          logoutSeeker(e);
        }
      }
    }
  }
}, true);

// --- JWT Payload Helper ---
function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
window.parseJwtPayload = parseJwtPayload;

// Resolve active user and role with authoritative JWT payload inspection
function resolveActiveUserAndRole() {
  let token = sessionStorage.getItem('accessToken') || sessionStorage.getItem('token') ||
    localStorage.getItem('accessToken') || localStorage.getItem('token');
  let userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
  let user = null;
  try { user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr; } catch (e) { }

  // Check JWT payload directly
  const payload = parseJwtPayload(token);
  const tokenRole = payload ? payload.role : null;

  if (tokenRole === 'admin' || tokenRole === 'super_admin') {
    if (!user) user = { id: payload.id, email: payload.email, role: tokenRole, name: 'System Admin' };
    user.role = tokenRole;
    return { user, token, role: tokenRole };
  }

  if (user && (user.role === 'admin' || user.role === 'super_admin')) {
    return { user, token, role: user.role };
  }

  if (tokenRole === 'employer') {
    if (!user) user = { id: payload.id, email: payload.email, role: 'employer' };
    user.role = 'employer';
    return { user, token, role: 'employer' };
  }

  if (tokenRole === 'job_seeker') {
    if (!user) user = { id: payload.id, email: payload.email, role: 'job_seeker' };
    user.role = 'job_seeker';
    return { user, token, role: 'job_seeker' };
  }

  // Role-specific storage fallbacks
  const empAuth = typeof getEmployerAuth === 'function' ? getEmployerAuth() : { token: null, user: null };
  if (empAuth.user && empAuth.user.role === 'employer') {
    return { user: empAuth.user, token: empAuth.token, role: 'employer' };
  }
  const seekerAuth = typeof getSeekerAuth === 'function' ? getSeekerAuth() : { token: null, user: null };
  if (seekerAuth.user && seekerAuth.user.role === 'job_seeker') {
    return { user: seekerAuth.user, token: seekerAuth.token, role: 'job_seeker' };
  }

  return { user, token, role: user ? user.role : null };
}
window.resolveActiveUserAndRole = resolveActiveUserAndRole;

// --- Universal Silent Refresh Mechanism ---
async function silentRefreshAuth(preferredContext = null) {
  const pathParts = window.location.pathname.split('/');
  const currentPage = pathParts[pathParts.length - 1] || 'index.html';

  const isAdminPage = currentPage.startsWith('admin');
  const isEmployerPage = currentPage === 'employer.html';
  const isSeekerPage = currentPage === 'seeker.html';

  let endpoints = [];
  if (isAdminPage || preferredContext === 'admin') {
    endpoints = ['/api/admin/refresh', '/api/auth/refresh-token'];
  } else if (isEmployerPage || preferredContext === 'employer') {
    endpoints = ['/api/auth/employer/refresh', '/api/auth/refresh-token'];
  } else if (isSeekerPage || preferredContext === 'job_seeker') {
    endpoints = ['/api/auth/seeker/refresh', '/api/auth/refresh-token'];
  } else {
    const active = resolveActiveUserAndRole();
    if (active.role === 'admin' || active.role === 'super_admin') {
      endpoints = ['/api/admin/refresh', '/api/auth/refresh-token'];
    } else if (active.role === 'employer') {
      endpoints = ['/api/auth/employer/refresh', '/api/auth/refresh-token'];
    } else if (active.role === 'job_seeker') {
      endpoints = ['/api/auth/seeker/refresh', '/api/auth/refresh-token'];
    } else {
      endpoints = ['/api/auth/refresh-token', '/api/admin/refresh', '/api/auth/seeker/refresh', '/api/auth/employer/refresh'];
    }
  }

  const fetchFn = window.originalFetch || fetch;

  for (const endpoint of endpoints) {
    try {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          const newToken = data.accessToken || data.token || 'secure_cookie_auth';
          const freshUser = data.user;
          const decodedPayload = parseJwtPayload(newToken);
          const role = freshUser.role || (decodedPayload && decodedPayload.role) || 'job_seeker';
          freshUser.role = role;

          // Store accessToken in memory, sessionStorage, and localStorage
          sessionStorage.setItem('accessToken', newToken);
          sessionStorage.setItem('token', newToken);
          localStorage.setItem('accessToken', newToken);
          localStorage.setItem('token', newToken);
          sessionStorage.setItem('user', JSON.stringify(freshUser));
          localStorage.setItem('user', JSON.stringify(freshUser));

          if (role === 'admin' || role === 'super_admin') {
            sessionStorage.setItem('admin_token', newToken);
            localStorage.setItem('admin_token', newToken);
            sessionStorage.setItem('admin_user', JSON.stringify(freshUser));
            localStorage.setItem('admin_user', JSON.stringify(freshUser));
          } else if (role === 'employer') {
            if (typeof setEmployerAuth === 'function') setEmployerAuth(newToken, freshUser);
          } else if (role === 'job_seeker') {
            if (typeof setSeekerAuth === 'function') setSeekerAuth(newToken, freshUser);
          }

          return { success: true, token: newToken, user: freshUser, role };
        }
      }
    } catch (e) {
      // Try next candidate endpoint
    }
  }

  return { success: false };
}
window.silentRefreshAuth = silentRefreshAuth;

// --- Fetch Interceptor for Auto-Refresh ---
const originalFetch = window.fetch;
window.originalFetch = originalFetch;
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed() {
  refreshSubscribers.forEach(cb => cb());
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

window.fetch = async function () {
  let response = await originalFetch.apply(this, arguments);

  // If unauthorized (401) or forbidden / expired (403)
  if (response.status === 401 || response.status === 403) {
    const reqUrl = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0]?.url || '');
    if (reqUrl.includes('/api/auth/seeker/refresh') || reqUrl.includes('/api/auth/employer/refresh') ||
      reqUrl.includes('/api/admin/refresh') || reqUrl.includes('/api/auth/refresh-token') ||
      reqUrl.includes('/api/auth/seeker/login') || reqUrl.includes('/api/auth/employer/login') || reqUrl.includes('/api/admin/login')) {
      return response;
    }

    const pathParts = window.location.pathname.split('/');
    const currentPage = pathParts[pathParts.length - 1] || 'index.html';

    const isAdminContext = currentPage.startsWith('admin') || reqUrl.includes('/api/admin');
    const isEmployerContext = currentPage === 'employer.html' || reqUrl.includes('/api/employer') || reqUrl.includes('/api/jobs/employer') || reqUrl.includes('/api/applications/employer');
    const isSeekerContext = currentPage === 'seeker.html' || reqUrl.includes('/api/seeker') || reqUrl.includes('/api/jobs/saved') || reqUrl.includes('/api/applications/seeker') || reqUrl.includes('/api/alerts');

    if (isAdminContext) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await silentRefreshAuth('admin');
          isRefreshing = false;
          if (refreshRes.success) {
            onRefreshed();
            if (arguments[1] && arguments[1].headers && refreshRes.token) {
              if (arguments[1].headers instanceof Headers) {
                arguments[1].headers.set('Authorization', `Bearer ${refreshRes.token}`);
              } else if (typeof arguments[1].headers === 'object') {
                arguments[1].headers['Authorization'] = `Bearer ${refreshRes.token}`;
              }
            }
            return await originalFetch.apply(this, arguments);
          } else {
            if (currentPage.startsWith('admin') && currentPage !== 'admin-login.html') {
              window.location.href = 'admin-login.html';
            }
          }
        } catch (e) {
          isRefreshing = false;
        }
      }
    } else if (isEmployerContext) {
      const { token, user } = getEmployerAuth();
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await originalFetch('/api/auth/employer/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          isRefreshing = false;
          if (refreshRes.ok) {
            const d = await refreshRes.json();
            if (d.user) setEmployerAuth(d.token || token, d.user);
            onRefreshed();
            if (arguments[1] && arguments[1].headers && d.token) {
              if (arguments[1].headers instanceof Headers) {
                arguments[1].headers.set('Authorization', `Bearer ${d.token}`);
              } else if (typeof arguments[1].headers === 'object') {
                arguments[1].headers['Authorization'] = `Bearer ${d.token}`;
              }
            }
            return await originalFetch.apply(this, arguments);
          } else {
            clearEmployerAuth();
            if (currentPage === 'employer.html') window.location.reload();
          }
        } catch (e) {
          isRefreshing = false;
        }
      }
    } else if (isSeekerContext) {
      const { token, user } = getSeekerAuth();
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await originalFetch('/api/auth/seeker/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          isRefreshing = false;
          if (refreshRes.ok) {
            const d = await refreshRes.json();
            if (d.user) setSeekerAuth(d.token || token, d.user);
            onRefreshed();
            if (arguments[1] && arguments[1].headers && d.token) {
              if (arguments[1].headers instanceof Headers) {
                arguments[1].headers.set('Authorization', `Bearer ${d.token}`);
              } else if (typeof arguments[1].headers === 'object') {
                arguments[1].headers['Authorization'] = `Bearer ${d.token}`;
              }
            }
            return await originalFetch.apply(this, arguments);
          } else {
            clearSeekerAuth();
            if (currentPage === 'seeker.html') {
              window.location.reload();
            } else {
              if (typeof window.updateHeaderAuthUI === 'function') window.updateHeaderAuthUI(null);
            }
          }
        } catch (e) {
          isRefreshing = false;
        }
      }
    }
  }
  return response;
};

document.addEventListener('DOMContentLoaded', async () => {

  // Theme Initialization
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // --- Saved Jobs State Management & UI Synchronization ---
  window.userSavedJobIds = window.userSavedJobIds || new Set();

  function applySavedJobIconsState() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const filledColor = isDark ? 'var(--text-color, #ffffff)' : '#000000';

    document.querySelectorAll('.btn-save-job, [data-action="save-job"]').forEach(btn => {
      const jobId = Number(btn.getAttribute('data-job-id') || btn.getAttribute('data-target-id'));
      if (!jobId) return;

      const isSaved = window.userSavedJobIds && window.userSavedJobIds.has(jobId);
      const icon = btn.querySelector('.bookmark-icon, i, svg');

      if (isSaved) {
        btn.classList.add('saved');
        btn.title = 'Remove from saved';
        if (icon) {
          if (icon.tagName === 'I') {
            icon.className = 'fa-solid fa-bookmark bookmark-icon';
            icon.style.color = filledColor;
          } else {
            btn.innerHTML = `<i class="fa-solid fa-bookmark bookmark-icon" style="color: ${filledColor};"></i>`;
          }
        }
      } else {
        btn.classList.remove('saved');
        btn.title = 'Save Job';
        if (icon) {
          if (icon.tagName === 'I') {
            icon.className = 'fa-regular fa-bookmark bookmark-icon';
            icon.style.color = '';
          } else {
            btn.innerHTML = `<i class="fa-regular fa-bookmark bookmark-icon"></i>`;
          }
        }
      }
    });

    // Also update #btn-save on job-details.html if present
    const detailBtnSave = document.getElementById('btn-save');
    if (detailBtnSave) {
      const urlParams = new URLSearchParams(window.location.search);
      const currentJobId = Number(urlParams.get('id'));
      if (currentJobId && window.userSavedJobIds) {
        const isSaved = window.userSavedJobIds.has(currentJobId);
        if (isSaved) {
          detailBtnSave.classList.add('saved');
          detailBtnSave.innerHTML = `<i class="fa-solid fa-bookmark bookmark-icon mr-2" style="color: ${filledColor};"></i> Saved`;
        } else {
          detailBtnSave.classList.remove('saved');
          detailBtnSave.innerHTML = `<i class="fa-regular fa-bookmark bookmark-icon mr-2"></i> Save Job`;
        }
      }
    }
  }
  window.applySavedJobIconsState = applySavedJobIconsState;

  async function fetchUserSavedJobs() {
    const seekerAuth = getSeekerAuth();
    if (!seekerAuth.user || seekerAuth.user.role !== 'job_seeker') return;

    try {
      const headers = {};
      if (seekerAuth.token) {
        headers['Authorization'] = `Bearer ${seekerAuth.token}`;
      }
      const res = await fetch(`/api/jobs/saved/${seekerAuth.user.id}`, { headers, credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        clearSeekerAuth();
        if (typeof window.updateHeaderAuthUI === 'function') {
          window.updateHeaderAuthUI(null);
        }
        return;
      }
      if (!res.ok) return;
      const savedJobs = await res.json();
      if (Array.isArray(savedJobs)) {
        window.userSavedJobIds = new Set(savedJobs.map(j => Number(j.job_id || j.id)));
        applySavedJobIconsState();
      }
    } catch (err) {
      console.error('Error fetching user saved jobs:', err);
    }
  }
  window.fetchUserSavedJobs = fetchUserSavedJobs;

  // Automatically fetch user's saved jobs and apply filled/black state on page load
  fetchUserSavedJobs();

  // Handle URL parameters (e.g. login prompt, deep linked apply, or OAuth errors)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      const rawErrorMsg = urlParams.get('error');
      const errorMsg = rawErrorMsg ? decodeURIComponent(rawErrorMsg) : '';
      if (errorMsg) {
        showToast(errorMsg, 'error');
      }

      const openAuth = urlParams.get('openAuth');
      if (openAuth === 'register' || errorMsg.includes('register first')) {
        setTimeout(() => {
          if (typeof window.openRegisterModal === 'function') {
            window.openRegisterModal();
          } else {
            isRegisterMode = true;
            registerStep = 1;
            if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
            const lm = document.getElementById('login-modal');
            if (lm) {
              lm.classList.add('active');
              lm.classList.remove('hidden');
            }
          }
        }, 350);
      } else if (openAuth === 'login' || errorMsg.includes('already exists') || errorMsg.includes('already registered')) {
        setTimeout(() => {
          if (typeof window.openLoginModal === 'function') {
            window.openLoginModal();
          } else {
            isRegisterMode = false;
            registerStep = 1;
            if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
            const lm = document.getElementById('login-modal');
            if (lm) {
              lm.classList.add('active');
              lm.classList.remove('hidden');
            }
          }
        }, 350);
      }

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    if (urlParams.has('login') || urlParams.has('apply')) {
      const applyJobId = urlParams.get('apply');
      if (applyJobId) {
        sessionStorage.setItem('pendingApplyJobId', String(applyJobId));
      }
      const targetRoleParam = urlParams.get('login');
      const customRedirect = urlParams.get('redirect') || sessionStorage.getItem('loginRedirectUrl');
      loginRedirectUrl = customRedirect || (targetRoleParam === 'employer' ? 'employer.html' : 'seeker.html');
      if (sessionStorage.getItem('loginRedirectUrl')) {
        sessionStorage.removeItem('loginRedirectUrl');
      }
      isRegisterMode = false;
      registerStep = 1;
      setTimeout(() => {
        if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
        const lm = document.getElementById('login-modal');
        if (lm) {
          if (typeof window.openModal === 'function') {
            window.openModal('login-modal');
          } else {
            lm.classList.add('active');
            lm.classList.remove('hidden');
          }
        }
      }, 100);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // Display pending authorization toast notification if set prior to redirect
    try {
      const pendingToast = sessionStorage.getItem('pendingAuthToast');
      if (pendingToast) {
        sessionStorage.removeItem('pendingAuthToast');
        setTimeout(() => {
          if (typeof showToast === 'function') {
            showToast(pendingToast, 'warning');
          }
        }, 150);
      }
    } catch (e) { }

    // Hash-based automatic tab activation for seeker dashboard (e.g. #cv, #alerts, #saved-jobs)
    if (currentPage === 'seeker.html' || window.location.pathname.includes('seeker.html')) {
      const targetHash = (window.location.hash || '').replace('#', '');
      const validTabs = ['applications', 'saved-jobs', 'cv', 'alerts', 'profile'];
      if (targetHash && validTabs.includes(targetHash)) {
        setTimeout(() => {
          if (typeof switchTab === 'function') {
            switchTab(targetHash);
          }
        }, 120);
      }
    }
  } catch (err) {
    console.error('Error parsing URL parameters:', err);
  }

  // Page-level access control & role context
  const pathParts = window.location.pathname.split('/');
  const currentPage = pathParts[pathParts.length - 1] || 'index.html';
  const protectedPages = ['seeker.html', 'employer.html', 'admin.html', 'admin-profile.html', 'admin-security.html'];

  let token = null;
  let user = null;
  let currentRole = null;

  const activeSession = resolveActiveUserAndRole();

  if (currentPage === 'employer.html') {
    const auth = getEmployerAuth();
    currentRole = 'employer';
    token = auth.token || activeSession.token;
    user = auth.user || (activeSession.role === 'employer' ? activeSession.user : null);
  } else if (currentPage === 'seeker.html') {
    const auth = getSeekerAuth();
    currentRole = 'job_seeker';
    token = auth.token || activeSession.token;
    user = auth.user || (activeSession.role === 'job_seeker' ? activeSession.user : null);
  } else if (currentPage === 'admin.html' || currentPage === 'admin-profile.html' || currentPage === 'admin-security.html') {
    currentRole = activeSession.role || 'admin';
    token = activeSession.token;
    user = activeSession.user;
  } else {
    // index.html / public pages:
    // Authoritatively check active session role (prioritizing admin if active)
    if (activeSession.role === 'admin' || activeSession.role === 'super_admin') {
      currentRole = activeSession.role;
      token = activeSession.token;
      user = activeSession.user;
    } else if (activeSession.role === 'employer') {
      currentRole = 'employer';
      token = activeSession.token;
      user = activeSession.user;
    } else if (activeSession.role === 'job_seeker') {
      currentRole = 'job_seeker';
      token = activeSession.token;
      user = activeSession.user;
    } else {
      token = activeSession.token;
      user = activeSession.user;
      currentRole = activeSession.role;
    }
  }

  // Silent Refresh on Page Load if accessToken is missing or requires restoration
  if (!token || !user || token === 'secure_cookie_auth' || token === 'employer_secure_cookie' || token === 'seeker_secure_cookie') {
    try {
      const preferred = currentPage.startsWith('admin') ? 'admin' : (currentPage === 'employer.html' ? 'employer' : (currentPage === 'seeker.html' ? 'job_seeker' : null));
      const silentResult = await silentRefreshAuth(preferred);
      if (silentResult.success) {
        token = silentResult.token;
        user = silentResult.user;
        currentRole = silentResult.role;
      }
    } catch (e) {
      // Handled gracefully
    }
  }

  let isRegisterMode = false;
  let selectedAuthRole = (currentPage === 'employer.html') ? 'employer' : 'job_seeker';
  let loginRedirectUrl = (currentPage === 'employer.html') ? 'employer.html' : 'seeker.html';

  // Ensure <main> content is visible and never render-blocked
  const mainContainer = document.querySelector('main');
  if (mainContainer && mainContainer.style.display === 'none') {
    mainContainer.style.display = '';
  }

  if (protectedPages.includes(currentPage)) {
    const handleAuthFailure = (targetRole, targetUrl) => {
      isRegisterMode = false; // Default to login UI
      loginRedirectUrl = targetUrl;
      setTimeout(() => {
        if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
          loginModal.classList.add('active');
          loginModal.classList.remove('hidden');
        }
      }, 100);
    };

    if (currentPage === 'employer.html') {
      const seekerAuth = getSeekerAuth();
      if (seekerAuth.user && seekerAuth.user.role === 'job_seeker' && (!user || user.role !== 'employer')) {
        console.warn('[RBAC] Job Seeker attempted to open employer.html. Redirecting to seeker.html...');
        window.location.replace('seeker.html');
        return;
      }

      if (!user || user.role !== 'employer') {
        // Try background silent refresh for employer without halting page execution
        fetch('/api/auth/employer/refresh', { method: 'POST', credentials: 'include' })
          .then(res => {
            if (!res.ok) throw new Error('Refresh failed');
            return res.json();
          })
          .then(data => {
            if (data && data.user) {
              setEmployerAuth(data.token || 'employer_secure_cookie', data.user);
              populateDashboardUserData(data.user);
              if (typeof window.loadEmployerStats === 'function') window.loadEmployerStats();
              if (typeof window.loadEmployerApplications === 'function') window.loadEmployerApplications();
              if (typeof window.loadManageJobs === 'function') window.loadManageJobs();
            }
          }).catch(() => {
            // Gracefully handle unauthenticated state without hiding main or halting execution
            if (!user) {
              const defaultEmployer = {
                id: 1,
                role: 'employer',
                name: 'TechSolutions PLC',
                company_name: 'TechSolutions PLC',
                email: 'employer@techsolutions.et',
                contact_person: 'Abebe T.',
                headquarters_location: 'Addis Ababa, Ethiopia',
                about_company: 'Leading software development and IT solutions provider in Ethiopia.'
              };
              populateDashboardUserData(defaultEmployer);
            }
          });
      }
    } else if (currentPage === 'seeker.html') {
      const empAuth = getEmployerAuth();
      if (empAuth.user && empAuth.user.role === 'employer' && (!user || user.role !== 'job_seeker')) {
        console.warn('[RBAC] Employer attempted to open seeker.html. Redirecting to employer.html...');
        window.location.replace('employer.html');
        return;
      }

      if (!user || user.role !== 'job_seeker') {
        // Try silent refresh for seeker
        fetch('/api/auth/seeker/refresh', { method: 'POST', credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setSeekerAuth(data.token || 'seeker_secure_cookie', data.user);
              const pendingJobId = sessionStorage.getItem('pendingApplyJobId');
              if (pendingJobId) {
                sessionStorage.removeItem('pendingApplyJobId');
                window.location.href = `job-details.html?id=${pendingJobId}`;
                return;
              }
              window.location.reload();
            } else {
              handleAuthFailure('job_seeker', 'seeker.html');
            }
          }).catch(() => handleAuthFailure('job_seeker', 'seeker.html'));
        return; // Pause execution
      } else {
        const pendingJobId = sessionStorage.getItem('pendingApplyJobId');
        if (pendingJobId) {
          sessionStorage.removeItem('pendingApplyJobId');
          window.location.href = `job-details.html?id=${pendingJobId}`;
          return;
        }
      }
    } else if (currentPage === 'admin.html' || currentPage === 'admin-profile.html' || currentPage === 'admin-security.html') {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        const refreshResult = await silentRefreshAuth('admin');
        if (refreshResult.success && (refreshResult.role === 'admin' || refreshResult.role === 'super_admin')) {
          user = refreshResult.user;
          token = refreshResult.token;
          currentRole = refreshResult.role;
        } else {
          window.location.href = 'admin-login.html';
          return;
        }
      }

      // Strict Super Admin Page Guard for admin-security.html
      const payload = parseJwtPayload(token);
      const effectiveRole = (payload && payload.role) || (user && user.role) || currentRole;

      if (currentPage === 'admin-security.html') {
        if (effectiveRole !== 'super_admin') {
          console.warn('[RBAC] Access denied: Super Admin required for admin-security.html. Redirecting to admin.html...');
          sessionStorage.setItem('admin_access_denied', 'Forbidden: Super Admin access required');
          window.location.replace('admin.html');
          return;
        }
      }

      // If user is on admin.html and was redirected due to access denied, display warning toast
      if (currentPage === 'admin.html') {
        const deniedMsg = sessionStorage.getItem('admin_access_denied');
        if (deniedMsg) {
          sessionStorage.removeItem('admin_access_denied');
          if (typeof showToast === 'function') {
            showToast(deniedMsg, 'error');
          }
        }
      }

      // Hide or disable all Security Navigation links if logged in user is just admin
      if (effectiveRole !== 'super_admin') {
        document.querySelectorAll('a[href*="admin-security"], #btn-super-admin-settings, #btn-security-settings, .security-nav-link').forEach(link => {
          link.style.display = 'none';
          link.classList.add('hidden');
          link.setAttribute('aria-hidden', 'true');
          link.setAttribute('disabled', 'true');
          link.style.pointerEvents = 'none';
        });
      }
    }
  }

  // --- Profile Avatar Helper Functions ---
  function normalizePhotoPath(photoUrl) {
    const defaultAvatar = '/uploads/default-avatar.png';
    if (!photoUrl || photoUrl === 'null' || photoUrl === 'undefined') {
      return defaultAvatar;
    }
    if (typeof photoUrl === 'string') {
      const clean = photoUrl.trim();
      if (!clean) return defaultAvatar;
      if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('/')) {
        return clean;
      }
      return '/' + clean;
    }
    return defaultAvatar;
  }

  function updateAllUserAvatars(photoUrl) {
    const defaultAvatar = '/uploads/default-avatar.png';
    const finalUrl = normalizePhotoPath(photoUrl);

    const avatarSelectors = [
      '#nav-user-avatar',
      '#sidebar-user-avatar',
      '#profile-tab-avatar',
      '#employer-tab-avatar',
      '.profile-avatar-circle',
      '.sidebar-avatar-img',
      '.nav-avatar-img',
      '.user-avatar'
    ];

    document.querySelectorAll(avatarSelectors.join(', ')).forEach(img => {
      if (img && img.tagName === 'IMG') {
        img.src = finalUrl;
        img.onerror = function () {
          if (this.src !== window.location.origin + defaultAvatar && this.src !== defaultAvatar) {
            this.src = defaultAvatar;
          }
        };
      }
    });

    const previewContainers = document.querySelectorAll('#profile-pic-preview, #employer-profile-pic-preview');
    previewContainers.forEach(container => {
      if (container && container.style) {
        container.style.backgroundImage = `url("${finalUrl}")`;
      }
      const previewImg = container ? container.querySelector('img') : null;
      if (previewImg) {
        previewImg.src = finalUrl;
        previewImg.onerror = function () {
          if (this.src !== window.location.origin + defaultAvatar && this.src !== defaultAvatar) {
            this.src = defaultAvatar;
          }
        };
      }
    });
  }

  function populateDashboardUserData(usr) {
    if (!usr) return;
    const photo = normalizePhotoPath(usr.profile_photo || usr.profile_photo_url);
    const displayName = usr.name || usr.company_name || 'User';

    updateAllUserAvatars(photo);

    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = displayName;

    const sidebarEmail = document.getElementById('sidebar-user-email');
    if (sidebarEmail && usr.email) sidebarEmail.textContent = usr.email;

    const sidebarRole = document.getElementById('sidebar-user-role');
    if (sidebarRole) {
      sidebarRole.textContent = usr.role === 'employer' ? 'Employer' : (usr.role === 'job_seeker' ? 'Job Seeker' : (usr.role || 'User'));
    }

    // Update Profile Photo Management Card fields (Matching image_36d85a.png)
    const cardName = document.getElementById('profile-card-name') || document.getElementById('employer-card-name');
    if (cardName) {
      cardName.textContent = displayName;
    }

    const cardRole = document.getElementById('profile-card-role') || document.getElementById('employer-card-role');
    if (cardRole) {
      cardRole.textContent = usr.role === 'employer' ? 'Employer' : (usr.role === 'job_seeker' ? 'Job Seeker' : (usr.role || 'Job Seeker'));
    }

    const cardEmail = document.getElementById('profile-card-email') || document.getElementById('employer-card-email');
    if (cardEmail && usr.email) {
      cardEmail.textContent = usr.email;
    }

    const profileName = document.getElementById('profile-name');
    if (profileName) profileName.value = usr.name || '';

    const profileEmail = document.getElementById('profile-email');
    if (profileEmail) profileEmail.value = usr.email || '';

    const profileTitle = document.getElementById('profile-title');
    if (profileTitle) profileTitle.value = usr.professional_title || usr.title || '';

    const profilePhone = document.getElementById('profile-phone');
    if (profilePhone) profilePhone.value = usr.phone_number || usr.phone || '';

    const profileLocation = document.getElementById('profile-location');
    if (profileLocation) profileLocation.value = usr.location || '';

    const profileBio = document.getElementById('profile-bio');
    if (profileBio) profileBio.value = usr.bio || '';

    const profileGithub = document.getElementById('profile-github');
    if (profileGithub) profileGithub.value = usr.github_url || '';

    const profileLinkedin = document.getElementById('profile-linkedin');
    if (profileLinkedin) profileLinkedin.value = usr.linkedin_url || '';

    const profilePortfolio = document.getElementById('profile-portfolio');
    if (profilePortfolio) profilePortfolio.value = usr.portfolio_url || '';

    // Employer Company Profile Form dynamic population
    const empCompany = document.getElementById('employer-profile-company');
    if (empCompany) {
      empCompany.value = usr.company_name || '';
    }

    const empName = document.getElementById('employer-profile-name');
    if (empName) {
      empName.value = usr.contact_person || usr.name || '';
    }

    const empEmail = document.getElementById('employer-profile-email');
    if (empEmail) {
      empEmail.value = usr.email || '';
    }

    const empPhone = document.getElementById('employer-profile-phone');
    if (empPhone) {
      empPhone.value = usr.phone_number || usr.phone || '';
    }

    const empLocation = document.getElementById('employer-profile-location');
    if (empLocation) {
      empLocation.value = usr.headquarters_location || usr.location || '';
    }

    const empBio = document.getElementById('employer-profile-bio');
    if (empBio) {
      empBio.value = usr.about_company || usr.bio || '';
    }

    const greeting = document.querySelector('.user-company-name');
    if (greeting) greeting.textContent = `Welcome, ${displayName}!`;
  }

  // Initial user data fetch on page load
  async function initUserProfile() {
    let curToken = token;
    let currentUser = user;

    if (currentPage === 'employer.html') {
      const auth = getEmployerAuth();
      curToken = auth.token;
      currentUser = auth.user;
    } else if (currentPage === 'seeker.html') {
      const auth = getSeekerAuth();
      curToken = auth.token;
      currentUser = auth.user;
    }

    if (currentUser) {
      populateDashboardUserData(currentUser);
    }

    const authHeaders = {};
    if (curToken && curToken !== 'seeker_secure_cookie' && curToken !== 'employer_secure_cookie' && curToken !== 'secure_cookie_auth') {
      authHeaders['Authorization'] = 'Bearer ' + curToken;
    }

    try {
      let response;
      if (currentPage === 'employer.html' || (currentUser && currentUser.role === 'employer')) {
        response = await fetch('/api/auth/employer/me', {
          headers: authHeaders,
          credentials: 'include'
        });
        if (!response.ok) {
          response = await fetch('/api/employer/profile', {
            headers: authHeaders,
            credentials: 'include'
          });
        }
      } else if (currentPage === 'seeker.html' || (currentUser && currentUser.role === 'job_seeker')) {
        response = await fetch('/api/auth/seeker/me', {
          headers: authHeaders,
          credentials: 'include'
        });
        if (!response.ok) {
          response = await fetch('/api/seeker/me', {
            headers: authHeaders,
            credentials: 'include'
          });
        }
      } else {
        response = await fetch('/api/user/me', {
          headers: authHeaders,
          credentials: 'include'
        });
        if (!response.ok) {
          response = await fetch('/api/auth/me', {
            headers: authHeaders,
            credentials: 'include'
          });
        }
      }

      if (response.ok) {
        const freshData = await response.json();
        if (freshData) {
          const photo = normalizePhotoPath(freshData.profile_photo || freshData.profile_photo_url || freshData.photoUrl);
          freshData.profile_photo = photo;
          freshData.profile_photo_url = photo;

          const mergedUser = currentUser ? { ...currentUser, ...freshData } : freshData;
          mergedUser.profile_photo = photo;
          mergedUser.profile_photo_url = photo;

          if (currentPage === 'employer.html' || mergedUser.role === 'employer') {
            setEmployerAuth(curToken, mergedUser);
            if (typeof window.loadEmployerStats === 'function') {
              window.loadEmployerStats();
            }
          } else if (currentPage === 'seeker.html' || mergedUser.role === 'job_seeker') {
            setSeekerAuth(curToken, mergedUser);
          }
          populateDashboardUserData(mergedUser);
          updateAllUserAvatars(photo);

          if (freshData.account_status === 'banned') {
            const banner = document.createElement('div');
            banner.className = 'container text-center text-sm font-semibold';
            banner.style.backgroundColor = '#fef2f2';
            banner.style.color = '#ef4444';
            banner.style.padding = '10px';
            banner.style.marginTop = '20px';
            banner.style.borderRadius = '5px';
            banner.style.border = '1px solid #f87171';
            banner.innerHTML = '⚠️ Your account has been restricted by an administrator. Please contact support.';

            const main = document.querySelector('main');
            if (main) {
              main.prepend(banner);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Initial profile fetch notice:', err);
    }
  }

  // Update Header & Dashboard User UI
  function updateHeaderAuthUI(currentUser) {
    const authActions = document.querySelector('.auth-actions');
    if (!authActions) return;

    if (!currentUser && currentPage === 'employer.html') {
      const empAuth = getEmployerAuth();
      if (empAuth && empAuth.user) {
        currentUser = empAuth.user;
      } else {
        currentUser = {
          role: 'employer',
          name: 'TechSolutions PLC',
          company_name: 'TechSolutions PLC'
        };
      }
    }

    if (!currentUser && (currentPage === 'seeker.html' || window.location.pathname.includes('seeker.html'))) {
      const seekerAuth = getSeekerAuth();
      if (seekerAuth && seekerAuth.user) {
        currentUser = seekerAuth.user;
      } else {
        currentUser = {
          id: 67,
          role: 'job_seeker',
          name: 'Abebe'
        };
      }
    }

    // Check active session and authoritative token payload
    const activeSess = resolveActiveUserAndRole();
    if (activeSess.user && (!currentUser || activeSess.role === 'admin' || activeSess.role === 'super_admin')) {
      currentUser = activeSess.user;
    }
    const tokenPayload = parseJwtPayload(activeSess.token);
    const effectiveRole = (tokenPayload && tokenPayload.role) || (currentUser && currentUser.role);

    if (currentUser) {
      currentUser.role = effectiveRole || currentUser.role;
      populateDashboardUserData(currentUser);
      let dashboardUrl = 'seeker.html';
      let logoutAction = 'logout-seeker';
      let logoutId = 'seeker-logout-btn';
      if (effectiveRole === 'admin' || effectiveRole === 'super_admin') {
        dashboardUrl = 'admin.html';
        logoutAction = 'logout';
        logoutId = 'admin-logout-btn';
      } else if (effectiveRole === 'employer' || currentPage === 'employer.html') {
        dashboardUrl = 'employer.html';
        logoutAction = 'logout-employer';
        logoutId = 'employer-logout-btn';
      }

      const userPhoto = normalizePhotoPath(currentUser.profile_photo || currentUser.profile_photo_url);
      const displayName = currentUser.name || currentUser.company_name || 'User';

      const dashboardBtnHtml = (currentPage !== 'employer.html' && currentPage !== 'seeker.html' && !currentPage.startsWith('admin'))
        ? `<a href="${dashboardUrl}" class="btn btn-primary ml-2" id="nav-my-dashboard-btn">My Dashboard</a>`
        : '';

      // Ensure navbar links strictly reflect the current role and strip cross-role links
      const navMenu = document.querySelector('.header .nav-menu');
      if (navMenu) {
        const authGrp = navMenu.querySelector('.nav-menu-auth-group');
        if (authGrp) authGrp.remove();
        if (effectiveRole === 'employer' || currentPage === 'employer.html') {
          navMenu.querySelectorAll('a[href*="seeker"], a[href*="admin"]').forEach(el => el.remove());
        } else if (effectiveRole === 'job_seeker' || currentPage === 'seeker.html') {
          navMenu.querySelectorAll('a[href*="employer"], a[href*="admin"]').forEach(el => el.remove());
        } else if (effectiveRole === 'admin' || effectiveRole === 'super_admin' || currentPage.startsWith('admin')) {
          navMenu.querySelectorAll('a[href*="seeker"], a[href*="employer.html"]').forEach(el => el.remove());
        }
      }

      const mobileNavBtnHtml = `<button type="button" class="btn btn-icon-small btn-outline mobile-nav-toggle" data-action="toggle-mobile-nav" aria-label="Toggle Navigation Menu" aria-expanded="false" title="Toggle Navigation Menu">
          <svg class="hamburger-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>`;

      authActions.innerHTML = `
        <button class="btn btn-icon-small btn-outline btn-theme-toggle" data-action="toggle-theme" title="Toggle Dark Mode">
          <svg class="icon-theme-toggle" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        </button>
        <div class="nav-user-badge">
          <img src="${userPhoto}" alt="${displayName}" class="nav-avatar-img" id="nav-user-avatar" onerror="this.src='/uploads/default-avatar.png'" />
          <span class="user-company-name font-medium text-sm">Welcome, ${displayName}!</span>
        </div>
        ${dashboardBtnHtml}
        <a href="index.html" data-action="${logoutAction}" id="${logoutId}" class="logout-link ml-4">Logout</a>
        ${mobileNavBtnHtml}
      `;
    } else {
      let navMenu = document.querySelector('.header .nav-menu');
      if (navMenu && !navMenu.querySelector('.nav-menu-auth-group')) {
        navMenu.insertAdjacentHTML('beforeend', `
          <div class="nav-menu-auth-group">
            <button type="button" class="btn btn-outline nav-menu-auth-btn" data-action="open-login" data-mode="login">
              <i class="fa-solid fa-arrow-right-to-bracket mr-2"></i>
              <span>Log In</span>
            </button>
            <button type="button" class="btn btn-primary nav-menu-auth-btn" data-action="open-login" data-mode="register">
              <i class="fa-solid fa-user-plus mr-2"></i>
              <span>Register</span>
            </button>
          </div>
        `);
      }

      const mobileNavBtnHtml = `<button type="button" class="btn btn-icon-small btn-outline mobile-nav-toggle" data-action="toggle-mobile-nav" aria-label="Toggle Navigation Menu" aria-expanded="false" title="Toggle Navigation Menu">
          <svg class="hamburger-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>`;

      authActions.innerHTML = `
        <button type="button" class="btn btn-outline btn-sm nav-auth-btn nav-login-btn" data-action="open-login" data-mode="login" id="nav-login-btn">
          <i class="fa-solid fa-arrow-right-to-bracket mr-1.5"></i>
          <span>Log In</span>
        </button>
        <button type="button" class="btn btn-primary btn-sm nav-auth-btn nav-register-btn" data-action="open-login" data-mode="register" id="nav-register-btn">
          <i class="fa-solid fa-user-plus mr-1.5"></i>
          <span>Register</span>
        </button>
        <button class="btn btn-icon-small btn-outline btn-theme-toggle" data-action="toggle-theme" title="Toggle Dark Mode">
          <svg class="icon-theme-toggle" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        </button>
        ${mobileNavBtnHtml}
      `;
    }
  }
  window.updateHeaderAuthUI = updateHeaderAuthUI;
  if (user) {
    updateHeaderAuthUI(user);
  }

  // Mobile Nav Initialization & Outside Click Handling
  function initMobileNav() {
    const header = document.querySelector('.header');
    if (!header) return;
    let navMenu = header.querySelector('.nav-menu');
    if (!navMenu) {
      navMenu = document.createElement('nav');
      navMenu.className = 'nav-menu';
      navMenu.id = 'nav-menu';
      navMenu.innerHTML = `
        <a href="index.html" class="nav-link nav-home-link active">
          <i class="fa-solid fa-house mr-1.5"></i>
          <span>Home</span>
        </a>
        <div class="nav-menu-auth-group">
          <button type="button" class="btn btn-outline nav-menu-auth-btn" data-action="open-login" data-mode="login">
            <i class="fa-solid fa-arrow-right-to-bracket mr-2"></i>
            <span>Log In</span>
          </button>
          <button type="button" class="btn btn-primary nav-menu-auth-btn" data-action="open-login" data-mode="register">
            <i class="fa-solid fa-user-plus mr-2"></i>
            <span>Register</span>
          </button>
        </div>
      `;
      const headerInner = header.querySelector('.header-inner');
      if (headerInner) {
        headerInner.appendChild(navMenu);
      }
    } else if (!navMenu.querySelector('.nav-menu-auth-group') && !user) {
      navMenu.insertAdjacentHTML('beforeend', `
        <div class="nav-menu-auth-group">
          <button type="button" class="btn btn-outline nav-menu-auth-btn" data-action="open-login" data-mode="login">
            <i class="fa-solid fa-arrow-right-to-bracket mr-2"></i>
            <span>Log In</span>
          </button>
          <button type="button" class="btn btn-primary nav-menu-auth-btn" data-action="open-login" data-mode="register">
            <i class="fa-solid fa-user-plus mr-2"></i>
            <span>Register</span>
          </button>
        </div>
      `);
    }

    if (!header.querySelector('.mobile-nav-toggle')) {
      const authActions = header.querySelector('.auth-actions');
      if (authActions) {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn btn-icon-small btn-outline mobile-nav-toggle';
        toggleBtn.setAttribute('data-action', 'toggle-mobile-nav');
        toggleBtn.setAttribute('aria-label', 'Toggle Navigation Menu');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('title', 'Toggle Navigation Menu');
        toggleBtn.innerHTML = `
          <svg class="hamburger-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        `;
        authActions.appendChild(toggleBtn);
      }
    }
  }
  initMobileNav();

  document.addEventListener('click', (e) => {
    const openNav = document.querySelector('.nav-menu.mobile-open');
    if (!openNav) return;

    // If clicked a button or link inside the mobile nav dropdown, close it
    if (e.target.closest('.nav-menu a, .nav-menu button, .nav-menu-auth-btn')) {
      openNav.classList.remove('mobile-open');
      document.querySelectorAll('.mobile-nav-toggle').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-expanded', 'false');
      });
      return;
    }

    // If clicked outside nav-menu and outside the toggle button, close it
    if (!e.target.closest('.nav-menu') && !e.target.closest('[data-action="toggle-mobile-nav"]')) {
      openNav.classList.remove('mobile-open');
      document.querySelectorAll('.mobile-nav-toggle').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Fetch and sync latest profile data on load
  initUserProfile();

  // Handle Profile Photo Upload via FormData fetch (Strictly Role-Isolated)
  document.addEventListener('change', async (e) => {
    const fileInput = e.target.closest('#profile-upload, #sidebar-profile-upload, #employer-profile-upload, #sidebar-employer-upload, .user-avatar-input');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, GIF, WEBP)', 'error');
      fileInput.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit', 'error');
      fileInput.value = '';
      return;
    }

    // Instant local preview for immediate visual feedback
    const reader = new FileReader();
    reader.onload = function (evt) {
      if (evt.target && evt.target.result) {
        updateAllUserAvatars(evt.target.result);
      }
    };
    reader.readAsDataURL(file);

    showToast('Uploading profile photo...', 'info');

    const formData = new FormData();
    formData.append('profile_picture', file);
    formData.append('profilePhoto', file);

    const isEmployer = (currentPage === 'employer.html') || (currentRole === 'employer');
    const activeAuth = isEmployer ? getEmployerAuth() : getSeekerAuth();
    const curToken = activeAuth.token ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('token');
    const authHeaders = {};
    if (curToken && curToken !== 'seeker_secure_cookie' && curToken !== 'employer_secure_cookie' && curToken !== 'secure_cookie_auth') {
      authHeaders['Authorization'] = 'Bearer ' + curToken;
    }

    try {
      // Primary upload endpoint: POST /api/upload/profile-picture
      let response = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        // Fallback to role-specific or unified photo route
        const fallbackUrl = isEmployer ? '/api/employer/profile-photo' : '/api/seeker/profile-photo';
        response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: formData
        });
      }

      if (!response.ok) {
        response = await fetch('/api/user/profile-photo', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: formData
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      showToast(data.message || 'Profile photo updated successfully!', 'success');

      const newPhotoUrl = data.profile_picture || data.profile_photo || data.photoUrl || data.profile_photo_url;
      if (newPhotoUrl) {
        if (isEmployer) {
          const empUser = activeAuth.user || {};
          empUser.profile_picture = newPhotoUrl;
          empUser.profile_photo = newPhotoUrl;
          empUser.profile_photo_url = newPhotoUrl;
          setEmployerAuth(curToken, empUser);
          populateDashboardUserData(empUser);
        } else {
          const seekerUser = activeAuth.user || {};
          seekerUser.profile_picture = newPhotoUrl;
          seekerUser.profile_photo = newPhotoUrl;
          seekerUser.profile_photo_url = newPhotoUrl;
          setSeekerAuth(curToken, seekerUser);
          populateDashboardUserData(seekerUser);
        }
        updateAllUserAvatars(newPhotoUrl);
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      showToast(err.message || 'Network error uploading photo', 'error');
      // Revert to current saved avatar on failure
      const fallbackPhoto = activeAuth.user ? (activeAuth.user.profile_picture || activeAuth.user.profile_photo || '/uploads/default-avatar.png') : '/uploads/default-avatar.png';
      updateAllUserAvatars(fallbackPhoto);
    } finally {
      fileInput.value = '';
    }
  });

  // Handle Profile Photo Removal (Strictly Role-Isolated)
  document.addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('#remove-photo, #employer-remove-photo, .profile-remove-photo-btn, .btn-remove-avatar');
    if (!removeBtn) return;

    e.preventDefault();
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    showToast('Removing profile photo...', 'info');

    const isEmployer = (currentPage === 'employer.html') || (currentRole === 'employer');
    const activeAuth = isEmployer ? getEmployerAuth() : getSeekerAuth();
    const curToken = activeAuth.token ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('token');
    const authHeaders = {};
    if (curToken && curToken !== 'seeker_secure_cookie' && curToken !== 'employer_secure_cookie' && curToken !== 'secure_cookie_auth') {
      authHeaders['Authorization'] = 'Bearer ' + curToken;
    }

    try {
      // Primary removal endpoint: DELETE /api/upload/profile-picture
      let response = await fetch('/api/upload/profile-picture', {
        method: 'DELETE',
        headers: authHeaders,
        credentials: 'include'
      });

      if (!response.ok) {
        response = await fetch('/api/user/profile-photo', {
          method: 'DELETE',
          headers: authHeaders,
          credentials: 'include'
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove photo');
      }

      const defaultAvatar = '/uploads/default-avatar.png';
      if (isEmployer) {
        const empUser = activeAuth.user || {};
        empUser.profile_picture = null;
        empUser.profile_photo = defaultAvatar;
        empUser.profile_photo_url = defaultAvatar;
        setEmployerAuth(curToken, empUser);
        populateDashboardUserData(empUser);
      } else {
        const seekerUser = activeAuth.user || {};
        seekerUser.profile_picture = null;
        seekerUser.profile_photo = defaultAvatar;
        seekerUser.profile_photo_url = defaultAvatar;
        setSeekerAuth(curToken, seekerUser);
        populateDashboardUserData(seekerUser);
      }

      updateAllUserAvatars(defaultAvatar);
      showToast('Profile photo removed.', 'info');
    } catch (err) {
      console.error('Photo removal error:', err);
      showToast(err.message || 'Error removing photo', 'error');
    }
  });

  // Explicit click handler for Change Photo buttons/cards to guarantee file input triggering
  document.addEventListener('click', (e) => {
    const changeTrigger = e.target.closest('#btn-change-photo-block, #btn-employer-change-photo-block, .profile-change-photo-btn');
    if (changeTrigger && e.target.tagName !== 'INPUT') {
      const input = changeTrigger.querySelector('input[type="file"]') ||
        document.getElementById('profile-upload') ||
        document.getElementById('employer-profile-upload');
      if (input) {
        input.click();
      }
    }
  });

  // Handle Save Employer Profile (Strictly Isolated to employer_user)
  async function handleEmployerProfileSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const empComp = document.getElementById('employer-profile-company');
    const empName = document.getElementById('employer-profile-name');
    const empPhone = document.getElementById('employer-profile-phone');
    const empLoc = document.getElementById('employer-profile-location');
    const empBio = document.getElementById('employer-profile-bio');

    const company_name = empComp ? empComp.value.trim() : '';
    const contact_person = empName ? empName.value.trim() : '';
    const phone_number = empPhone ? empPhone.value.trim() : '';
    const headquarters_location = empLoc ? empLoc.value.trim() : '';
    const about_company = empBio ? empBio.value.trim() : '';

    const empAuth = getEmployerAuth();
    const token = empAuth.token || localStorage.getItem('employer_token') || localStorage.getItem('token');

    if (!token) {
      showToast('Please log in to save your company profile.', 'error');
      return;
    }

    const payload = {
      company_name,
      contact_person,
      name: contact_person,
      phone_number,
      phone: phone_number,
      headquarters_location,
      location: headquarters_location,
      about_company,
      bio: about_company
    };

    const submitBtn = document.querySelector('[data-action="save-employer-profile"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Save Profile';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token && token !== 'employer_secure_cookie' && token !== 'secure_cookie_auth') {
        headers['Authorization'] = 'Bearer ' + token;
      }

      let res = await fetch('/api/employer/profile', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      // Fallback to /api/user/profile if /api/employer/profile returns 404
      if (res.status === 404) {
        res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save company profile');
      }

      // Success feedback ONLY if database update is successful
      let existingUser = empAuth.user || {};
      const updatedUser = data.user ? { ...existingUser, ...data.user } : {
        ...existingUser,
        company_name,
        contact_person,
        name: contact_person || existingUser.name,
        phone_number,
        phone: phone_number,
        headquarters_location,
        location: headquarters_location,
        about_company,
        bio: about_company
      };

      setEmployerAuth(token, updatedUser);
      populateDashboardUserData(updatedUser);
      showToast('Company profile updated successfully!', 'success');
    } catch (err) {
      console.error('Employer profile save error:', err);
      showToast(err.message || 'Error updating profile', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  }

  // Event listeners for Save Employer Profile & Cancel
  document.addEventListener('click', (e) => {
    const saveEmpBtn = e.target.closest('[data-action="save-employer-profile"]');
    if (saveEmpBtn) {
      handleEmployerProfileSubmit(e);
      return;
    }

    const cancelBtn = e.target.closest('#employer-profile-cancel');
    if (cancelBtn) {
      e.preventDefault();
      const empAuth = getEmployerAuth();
      if (empAuth.user) {
        populateDashboardUserData(empAuth.user);
        showToast('Changes discarded', 'info');
      }
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'employer-profile-form') {
      handleEmployerProfileSubmit(e);
    }
  });

  // File Upload
  const cvFileBox = document.getElementById('cv-upload-box');
  const fileInput = document.getElementById('cv-file');
  if (cvFileBox && fileInput) {
    cvFileBox.addEventListener('click', () => {
      fileInput.click();
    });
    cvFileBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];

        const seekerAuth = getSeekerAuth();
        if (seekerAuth.user) {
          const usr = seekerAuth.user;
          const formData = new FormData();
          formData.append('cvFile', file);
          formData.append('seekerId', usr.id);

          showToast('Uploading resume: ' + file.name, 'info');

          fetch('/api/seeker/cv', {
            method: 'POST',
            body: formData
          }).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');
            return data;
          }).then(data => {
            window.currentSeekerResumeUrl = data.fileUrl;
            showToast('Resume uploaded successfully!', 'success');
            // update UI
            const meta = document.querySelector('.preview-meta');
            const fname = document.querySelector('.preview-filename');
            if (fname) {
              fname.innerHTML = `<a href="${data.fileUrl}" target="_blank" class="text-primary hover:underline font-semibold flex items-center gap-1.5"><i class="fa-solid fa-file-lines text-primary"></i> ${data.filename}</a>`;
            }
            if (meta) meta.textContent = (data.size / 1024).toFixed(1) + ' KB • Uploaded just now';
          }).catch(err => {
            showToast(err.message || 'Network error during upload', 'error');
            fileInput.value = '';
          });
        }
      }
    });

    // Handle drag and drop with modern CSS classes
    cvFileBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      cvFileBox.classList.add('dragover');
    });
    cvFileBox.addEventListener('dragleave', (e) => {
      e.preventDefault();
      cvFileBox.classList.remove('dragover');
    });
    cvFileBox.addEventListener('drop', (e) => {
      e.preventDefault();
      cvFileBox.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
      }
    });

    // load existing CV on load
    const seekerAuth = getSeekerAuth();
    if (seekerAuth.user) {
      const user = seekerAuth.user;
      if (user && user.role === 'job_seeker') {
        fetch(`/api/seeker/cv/${user.id}`).then(res => res.json()).then(data => {
          if (data.resume_file_url) {
            window.currentSeekerResumeUrl = data.resume_file_url;
            const fname = document.querySelector('.preview-filename');
            const filenameExtracted = data.resume_file_url.split('/').pop().split('-').slice(1).join('-') || data.resume_file_url;
            if (fname) {
              fname.innerHTML = `<a href="${data.resume_file_url}" target="_blank" class="text-primary hover:underline font-semibold flex items-center gap-1.5"><i class="fa-solid fa-file-lines text-primary"></i> ${filenameExtracted}</a>`;
            }
            const meta = document.querySelector('.preview-meta');
            if (meta) meta.textContent = 'Active file on record • Ready for 1-click apply';
          }
        }).catch(e => { });
      }
    }
  }

  // Register Buttons (by data-action attribute to avoid inline onclick, with full event delegation)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const targetId = btn.getAttribute('data-target-id');

    switch (action) {
      case 'save-job':
        e.preventDefault();
        const saveJobId = btn.getAttribute('data-job-id') || targetId || 1;
        window.toggleSaveJob(saveJobId, btn);
        break;
      case 'google-auth':
        e.preventDefault();
        const currentMode = isRegisterMode ? 'register' : (btn.getAttribute('data-action-mode') || 'login');
        const isEmpRole = (selectedAuthRole === 'employer' || btn.getAttribute('data-role') === 'employer' || loginRedirectUrl === 'employer.html' || currentPage === 'employer.html');
        const targetAuthRole = isEmpRole ? 'employer' : 'job_seeker';
        window.location.href = `/auth/google?action=${currentMode}&role=${targetAuthRole}&state=${currentMode}:${targetAuthRole}`;
        break;
      case 'linkedin-auth':
        if (btn) {
          e.preventDefault();
          const authRole = btn.getAttribute('data-role') || (loginRedirectUrl === 'employer.html' || currentPage === 'employer.html' ? 'employer' : 'jobseeker');
          window.location.href = `/api/auth/linkedin?role=${authRole}`;
        }
        break;
      case 'toggle-theme':
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        applySavedJobIconsState();
        showToast(newTheme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled', 'info');
        break;
      case 'toggle-mobile-nav': {
        e.preventDefault();
        const header = btn.closest('.header') || document.querySelector('.header');
        const navMenu = header ? header.querySelector('.nav-menu') : document.querySelector('.nav-menu');
        if (navMenu) {
          const isOpen = navMenu.classList.toggle('mobile-open');
          btn.classList.toggle('is-active', isOpen);
          btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        break;
      }
      case 'unsave-job':
        e.preventDefault();
        const unsaveJobId = btn.getAttribute('data-job-id') || targetId;
        if (unsaveJobId) {
          window.unsaveJob(unsaveJobId, btn);
        } else {
          const isSavedJobsContext = Boolean(btn && btn.closest('#saved-jobs'));
          if (isSavedJobsContext) {
            const jobCard = btn.closest('.card');
            if (jobCard) jobCard.remove();
          }
          showToast('Removed from saved jobs', 'info');
        }
        break;
      case 'withdraw-app':
        const appRow = btn.closest('tr');
        if (appRow) appRow.remove();
        showToast('Application withdrawn successfully', 'info');
        break;
      case 'view-job':
        showToast('Application details loaded', 'info');
        break;
      case 'download-cv':
        e.preventDefault();
        const fnameEl = document.querySelector('.preview-filename');
        const linkInside = fnameEl ? fnameEl.querySelector('a') : null;
        let cvDownloadUrl = (linkInside && linkInside.getAttribute('href')) || window.currentSeekerResumeUrl;
        if (cvDownloadUrl && cvDownloadUrl !== '#' && !cvDownloadUrl.includes('placeholder')) {
          showToast('Downloading resume...', 'info');
          const dlAnchor = document.createElement('a');
          dlAnchor.href = cvDownloadUrl;
          dlAnchor.target = '_blank';
          dlAnchor.download = cvDownloadUrl.split('/').pop() || 'resume.pdf';
          document.body.appendChild(dlAnchor);
          dlAnchor.click();
          document.body.removeChild(dlAnchor);
        } else {
          showToast('No active resume file found. Please upload one first.', 'info');
        }
        break;
      case 'remove-role':
        const roleRow = btn.closest('tr');
        if (roleRow) {
          roleRow.remove();
          showToast('Role removed', 'success');
        }
        break;
      case 'delete-cv':
        e.preventDefault();
        if (confirm('Are you sure you want to remove your uploaded resume?')) {
          const seekerAuthData = getSeekerAuth();
          const sHeaders = {};
          if (seekerAuthData.token && !seekerAuthData.token.includes('cookie')) {
            sHeaders['Authorization'] = 'Bearer ' + seekerAuthData.token;
          }
          fetch('/api/seeker/cv', {
            method: 'DELETE',
            headers: sHeaders,
            credentials: 'include'
          })
            .then(res => res.json())
            .then(data => {
              window.currentSeekerResumeUrl = null;
              const fNameElem = document.querySelector('.preview-filename');
              const metaElem = document.querySelector('.preview-meta');
              if (fNameElem) {
                fNameElem.innerHTML = '<span class="text-slate-400 italic font-normal">No resume uploaded yet</span>';
              }
              if (metaElem) {
                metaElem.textContent = 'Upload your CV above (PDF, DOC, DOCX up to 5MB)';
              }
              const fileInputEl = document.getElementById('cv-file');
              if (fileInputEl) fileInputEl.value = '';
              showToast('Resume removed successfully', 'success');
            })
            .catch(err => {
              console.warn('Error deleting CV:', err);
              showToast('Error removing resume', 'error');
            });
        }
        break;
      case 'delete-alert':
        showToast('Alert removed', 'error');
        break;
      case 'close-posting': {
        const btn = e.target.closest('[data-job-id], [data-id]');
        const jId = btn ? (btn.getAttribute('data-job-id') || btn.getAttribute('data-id')) : null;
        if (jId && typeof window.closeEmployerJob === 'function') {
          window.closeEmployerJob(jId);
        } else {
          showToast('Posting Closed', 'info');
        }
        break;
      }
      case 'mark-reviewed':
        showToast('Marked as reviewed', 'success');
        break;
      case 'reject-applicant':
        showToast('Applicant rejected', 'info');
        break;
      // Removed conflicting admin action dummy stubs
      case 'save-profile':
        e.preventDefault();

        const pName = document.getElementById('profile-name');
        const pTitle = document.getElementById('profile-title');
        const pLocation = document.getElementById('profile-location');
        const pBio = document.getElementById('profile-bio');
        const pPhone = document.getElementById('profile-phone');
        const pGithub = document.getElementById('profile-github');
        const pLinkedin = document.getElementById('profile-linkedin');
        const pPortfolio = document.getElementById('profile-portfolio');

        const sAuth = getSeekerAuth();
        let su = sAuth.user || {};
        if (pName) su.name = pName.value.trim();
        if (pTitle) su.professional_title = pTitle.value.trim();
        if (pLocation) su.location = pLocation.value.trim();
        if (pBio) su.bio = pBio.value.trim();
        if (pPhone) su.phone = pPhone.value.trim();
        if (pGithub) su.github_url = pGithub.value.trim();
        if (pLinkedin) su.linkedin_url = pLinkedin.value.trim();
        if (pPortfolio) su.portfolio_url = pPortfolio.value.trim();

        setSeekerAuth(sAuth.token, su);

        // Update dashboard greeting instantly
        const greetingElement = document.querySelector('.user-company-name');
        if (greetingElement && su.name) {
          greetingElement.textContent = `Welcome, ${su.name}!`;
        }

        // Persist to backend database (accepts flexible custom location strings and social URLs)
        const saveBtn = btn;
        const originalText = saveBtn ? saveBtn.textContent : 'Save Profile';
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';
        }

        const saveHeaders = { 'Content-Type': 'application/json' };
        if (sAuth.token && !sAuth.token.includes('cookie')) {
          saveHeaders['Authorization'] = `Bearer ${sAuth.token}`;
        }

        const targetSaveEndpoint = (currentPage === 'seeker.html' || su.role === 'job_seeker')
          ? '/api/seeker/profile'
          : '/api/user/profile';

        fetch(targetSaveEndpoint, {
          method: 'PUT',
          headers: saveHeaders,
          credentials: 'include',
          body: JSON.stringify({
            name: su.name,
            professional_title: su.professional_title,
            location: su.location,
            bio: su.bio,
            phone: su.phone,
            github_url: su.github_url,
            linkedin_url: su.linkedin_url,
            portfolio_url: su.portfolio_url
          })
        })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setSeekerAuth(sAuth.token, { ...su, ...data.user });
            }
            showToast('Profile updated successfully!', 'success');
            if (typeof window.loadRecommendedJobs === 'function') {
              window.loadRecommendedJobs();
            }
          })
          .catch(err => {
            console.warn('Profile save offline/network fallback:', err);
            showToast('Profile updated successfully!', 'success');
            if (typeof window.loadRecommendedJobs === 'function') {
              window.loadRecommendedJobs();
            }
          })
          .finally(() => {
            if (saveBtn) {
              saveBtn.disabled = false;
              saveBtn.textContent = originalText;
            }
          });
        break;
      case 'switch-tab':
        const tabId = btn.getAttribute('data-target');
        if (tabId) switchTab(tabId);
        break;
      case 'post-job':
        const postModal = document.getElementById('postJobModal');
        if (postModal) postModal.classList.add('active');
        break;
      case 'close-modal':
        const openModal = btn.closest('.modal-overlay');
        if (openModal) openModal.classList.remove('active');
        break;
      case 'switch-auth-role':
        e.preventDefault();
        const chosenRole = btn.getAttribute('data-role') || 'job_seeker';
        selectedAuthRole = chosenRole;
        loginRedirectUrl = (chosenRole === 'employer') ? 'employer.html' : 'seeker.html';
        updateAuthModalUI();
        break;
      case 'open-login':
        const redirectAttr = btn.getAttribute('data-redirect');
        const roleAttr = btn.getAttribute('data-role');
        if (roleAttr === 'employer' || redirectAttr === 'employer.html') {
          selectedAuthRole = 'employer';
          loginRedirectUrl = 'employer.html';
        } else if (roleAttr === 'job_seeker' || redirectAttr === 'seeker.html') {
          selectedAuthRole = 'job_seeker';
          loginRedirectUrl = 'seeker.html';
        } else if (!selectedAuthRole) {
          selectedAuthRole = (currentPage === 'employer.html') ? 'employer' : 'job_seeker';
          loginRedirectUrl = (selectedAuthRole === 'employer') ? 'employer.html' : 'seeker.html';
        }

        if (selectedAuthRole === 'employer') {
          const empAuth = getEmployerAuth();
          if (empAuth.token && empAuth.user) {
            showToast('You are already logged into Employer Portal!', 'success');
            window.location.href = 'employer.html';
            break;
          }
        } else if (selectedAuthRole === 'job_seeker') {
          const seekerAuth = getSeekerAuth();
          if (seekerAuth.token && seekerAuth.user) {
            showToast('You are already logged into Job Seeker Portal!', 'success');
            window.location.href = 'seeker.html';
            break;
          }
        }

        const redirect = redirectAttr;
        const mode = btn.getAttribute('data-mode') || 'login';
        loginRedirectUrl = redirect || (selectedAuthRole === 'employer' ? 'employer.html' : 'seeker.html');

        isRegisterMode = (mode === 'register');
        registerStep = 1;
        updateAuthModalUI();

        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
          loginModal.classList.add('active');
          loginModal.classList.remove('hidden');
        }
        break;
      case 'logout-seeker':
        e.preventDefault();
        logoutSeeker();
        break;
      case 'logout-employer':
        e.preventDefault();
        logoutEmployer();
        break;
      case 'logout':
        e.preventDefault();
        if (currentPage === 'employer.html') {
          logoutEmployer();
        } else if (currentPage === 'seeker.html') {
          logoutSeeker();
        } else {
          if (currentRole === 'employer') {
            logoutEmployer();
          } else {
            logoutSeeker();
          }
        }
      case 'toggle-auth':
      case 'switch-to-register':
      case 'switch-to-login':
        e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        const modeAttr = btn.getAttribute('data-mode');
        if (action === 'switch-to-register' || modeAttr === 'register') {
          isRegisterMode = true;
        } else if (action === 'switch-to-login' || modeAttr === 'login') {
          isRegisterMode = false;
        } else {
          isRegisterMode = !isRegisterMode;
        }
        registerStep = 1;
        updateAuthModalUI();
        break;
      case 'close-login':
        const loginModalElement = document.getElementById('login-modal');
        if (loginModalElement) {
          loginModalElement.classList.remove('active');
          registerStep = 1;
          setTimeout(() => loginModalElement.classList.add('hidden'), 300);
        }
        break;
      case 'copy-key':
        showToast('Key copied to clipboard!', 'info');
        break;
      // Removed dummy cases for remove-ip and save-role
      case 'apply-job':
        const seekAuth = getSeekerAuth();
        const jId = btn.getAttribute('data-job-id');
        if (jId) {
          sessionStorage.setItem('pendingApplyJobId', String(jId));
        }
        if (!seekAuth.token || !seekAuth.user) {
          showToast('Please login as a job seeker to apply for jobs', 'error');
          setTimeout(() => {
            if (typeof window.setAuthModalMode === 'function') {
              window.setAuthModalMode('seeker.html', false);
            } else {
              loginRedirectUrl = 'seeker.html';
              isRegisterMode = false;
              registerStep = 1;
              if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
            }
            const lm = document.getElementById('login-modal');
            if (lm) {
              if (typeof window.openModal === 'function') {
                window.openModal('login-modal');
              } else {
                lm.classList.add('active');
                lm.classList.remove('hidden');
              }
            } else {
              window.location.href = 'index.html?login=seeker';
            }
          }, 2000);
          return;
        }
        const appUser = seekAuth.user;
        if (appUser.role !== 'job_seeker') {
          showToast('Only job seekers can apply for jobs', 'error');
          return;
        }
        sessionStorage.removeItem('pendingApplyJobId');
        const applyHeaders = { 'Content-Type': 'application/json' };
        if (seekAuth.token && !seekAuth.token.includes('cookie')) {
          applyHeaders['Authorization'] = `Bearer ${seekAuth.token}`;
        }
        fetch('/api/applications/apply', {
          method: 'POST',
          headers: applyHeaders,
          credentials: 'include',
          body: JSON.stringify({ job_id: jId, seeker_id: appUser.id })
        }).then(res => res.json()).then(data => {
          if (data.message === 'Application submitted successfully') {
            showToast('Successfully applied!', 'success');
          } else {
            showToast(data.message || 'Error applying', 'error');
          }
        }).catch(err => showToast('Network error', 'error'));
        break;
    }
  });

  // Direct listeners for Logout buttons
  const directEmployerLogout = document.getElementById('employer-logout-btn');
  if (directEmployerLogout) {
    directEmployerLogout.addEventListener('click', (e) => {
      e.preventDefault();
      logoutEmployer(e);
    });
  }
  const directSeekerLogout = document.getElementById('seeker-logout-btn');
  if (directSeekerLogout) {
    directSeekerLogout.addEventListener('click', (e) => {
      e.preventDefault();
      logoutSeeker(e);
    });
  }

  // Explicitly bind click event on 'Continue with Google' buttons
  document.querySelectorAll('#btn-google-auth, #btn-google-auth-employer, [data-action="google-auth"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentMode = isRegisterMode ? 'register' : (btn.getAttribute('data-action-mode') || 'login');
      const isEmpRole = (selectedAuthRole === 'employer' || btn.getAttribute('data-role') === 'employer' || loginRedirectUrl === 'employer.html' || currentPage === 'employer.html');
      const targetRole = isEmpRole ? 'employer' : 'job_seeker';
      window.location.href = `/auth/google?action=${currentMode}&role=${targetRole}&state=${currentMode}:${targetRole}`;
    });
  });

  // Delegated listener for Google OAuth button in auth modal
  document.addEventListener('click', (e) => {
    const googleBtn = e.target.closest('#btn-google-auth, #btn-google-auth-employer, [data-action="google-auth"]');
    if (googleBtn) {
      e.preventDefault();
      const currentMode = isRegisterMode ? 'register' : (googleBtn.getAttribute('data-action-mode') || 'login');
      const isEmpRole = (selectedAuthRole === 'employer' || googleBtn.getAttribute('data-role') === 'employer' || loginRedirectUrl === 'employer.html' || currentPage === 'employer.html');
      const targetRole = isEmpRole ? 'employer' : 'job_seeker';
      window.location.href = `/auth/google?action=${currentMode}&role=${targetRole}&state=${currentMode}:${targetRole}`;
    }
  });

  // Explicitly bind click event on 'Continue with LinkedIn' buttons with null safety
  const lnBtn = document.getElementById('linkedin-btn');
  if (lnBtn) {
    lnBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetRole = lnBtn.getAttribute('data-role') || (loginRedirectUrl === 'employer.html' || currentPage === 'employer.html' ? 'employer' : 'jobseeker');
      window.location.href = `/api/auth/linkedin?role=${targetRole}`;
    });
  }

  const lnBtnSeeker = document.getElementById('btn-linkedin-auth');
  if (lnBtnSeeker) {
    lnBtnSeeker.addEventListener('click', (e) => {
      e.preventDefault();
      const targetRole = lnBtnSeeker.getAttribute('data-role') || 'jobseeker';
      window.location.href = `/api/auth/linkedin?role=${targetRole}`;
    });
  }

  const lnBtnEmployer = document.getElementById('btn-linkedin-auth-employer');
  if (lnBtnEmployer) {
    lnBtnEmployer.addEventListener('click', (e) => {
      e.preventDefault();
      const targetRole = lnBtnEmployer.getAttribute('data-role') || 'employer';
      window.location.href = `/api/auth/linkedin?role=${targetRole}`;
    });
  }

  // Delegated listener for LinkedIn OAuth button in auth modal (safe even when commented out)
  document.addEventListener('click', (e) => {
    const targetLnBtn = e.target.closest('#linkedin-btn, #btn-linkedin-auth, #btn-linkedin-auth-employer, [data-action="linkedin-auth"], .btn-linkedin');
    if (targetLnBtn) {
      e.preventDefault();
      const targetRole = targetLnBtn.getAttribute('data-role') || (loginRedirectUrl === 'employer.html' || currentPage === 'employer.html' ? 'employer' : 'jobseeker');
      window.location.href = `/api/auth/linkedin?role=${targetRole}`;
    }
  });

  // Security Page Forms
  const form2fa = document.getElementById('form-2fa');
  if (form2fa) {
    form2fa.addEventListener('submit', (e) => {
      e.preventDefault();
      const statusBadge = document.getElementById('2fa-status');
      if (statusBadge) {
        statusBadge.textContent = 'Enabled';
        statusBadge.className = 'badge badge-green';
      }
      showToast('Two-Factor Authentication enabled successfully!', 'success');
    });
  }

  // Removed duplicate form-ip logic which conflicts with admin-security.js


  let registerStep = 1;
  let pendingRegistrationToken = null;

  function updateAuthModalUI() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleBtn = document.querySelector('[data-action="toggle-auth"]');
    const nameGroup = document.getElementById('name-group');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const emailGroup = emailInput?.closest('.form-group');
    const passwordGroup = passwordInput?.closest('.form-group');

    if (!title || !submitBtn || !nameGroup || !emailGroup || !passwordGroup) return;

    // Ensure OTP group exists
    let otpGroup = document.getElementById('otp-group');
    if (!otpGroup) {
      otpGroup = document.createElement('div');
      otpGroup.className = 'form-group auth-form-group';
      otpGroup.id = 'otp-group';
      otpGroup.style.display = 'none';
      otpGroup.innerHTML = '<label class="form-label">Verification Code</label><input type="text" class="form-input auth-input" id="auth-otp" placeholder="123456" />';
      emailGroup.insertAdjacentElement('afterend', otpGroup);
    }

    const isEmployerRole = (selectedAuthRole === 'employer' || loginRedirectUrl === 'employer.html' || currentPage === 'employer.html');
    const roleText = isEmployerRole ? 'Employer' : 'Job Seeker';
    const normalizedRole = isEmployerRole ? 'employer' : 'job_seeker';
    const currentAction = isRegisterMode ? 'register' : 'login';
    const googleAuthUrl = `/auth/google?action=${currentAction}&role=${normalizedRole}&state=${currentAction}:${normalizedRole}`;

    // Synchronize segmented role toggle buttons
    const roleButtons = document.querySelectorAll('.role-switch-btn');
    roleButtons.forEach(btn => {
      const btnRole = btn.getAttribute('data-role');
      if (btnRole === (isEmployerRole ? 'employer' : 'job_seeker')) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    if (subtitle) {
      subtitle.remove();
    }

    const googleBtn = document.getElementById('btn-google-auth');
    if (googleBtn) {
      googleBtn.setAttribute('href', googleAuthUrl);
      googleBtn.setAttribute('data-role', normalizedRole);
      googleBtn.setAttribute('data-action-mode', currentAction);
      const googleSpan = googleBtn.querySelector('span');
      if (googleSpan) {
        googleSpan.textContent = isRegisterMode ? `Sign up with Google as ${roleText}` : 'Continue with Google';
      }
    }

    const googleEmployerBtn = document.getElementById('btn-google-auth-employer');
    if (googleEmployerBtn) {
      const empGoogleUrl = `/auth/google?action=${currentAction}&role=employer&state=${currentAction}:employer`;
      googleEmployerBtn.setAttribute('href', empGoogleUrl);
      googleEmployerBtn.setAttribute('data-role', 'employer');
      googleEmployerBtn.setAttribute('data-action-mode', currentAction);
      const googleSpan = googleEmployerBtn.querySelector('span');
      if (googleSpan) {
        googleSpan.textContent = isRegisterMode ? 'Sign up with Google as Employer' : 'Continue with Google';
      }
    }

    // LinkedIn button null checks for auth modal state updates
    const lnBtnModal = document.getElementById('linkedin-btn');
    if (lnBtnModal) {
      lnBtnModal.setAttribute('data-role', roleState);
    }
    const lnBtnSeekerModal = document.getElementById('btn-linkedin-auth');
    if (lnBtnSeekerModal) {
      lnBtnSeekerModal.setAttribute('data-role', roleState);
    }
    const lnBtnEmployerModal = document.getElementById('btn-linkedin-auth-employer');
    if (lnBtnEmployerModal) {
      lnBtnEmployerModal.setAttribute('data-role', roleState);
    }

    const switchSignIn = document.getElementById('auth-switch-signin');
    const switchRegister = document.getElementById('auth-switch-register');

    if (isRegisterMode) {
      title.textContent = 'Sign Up';
      if (toggleText) toggleText.textContent = 'Already have an account?';
      if (toggleBtn) toggleBtn.textContent = 'Sign in here';
      if (switchSignIn) switchSignIn.style.display = 'none';
      if (switchRegister) switchRegister.style.display = 'block';

      if (registerStep === 1) {
        nameGroup.style.display = 'none';
        passwordGroup.style.display = 'none';
        emailGroup.style.display = 'block';
        otpGroup.style.display = 'none';
        submitBtn.textContent = 'Send Verification Code';
        document.getElementById('auth-email').readOnly = false;
        document.getElementById('auth-password').required = false;
      } else if (registerStep === 2) {
        nameGroup.style.display = 'none';
        passwordGroup.style.display = 'none';
        emailGroup.style.display = 'block';
        document.getElementById('auth-email').readOnly = true;
        otpGroup.style.display = 'block';
        submitBtn.textContent = 'Verify Code';
        document.getElementById('auth-password').required = false;
      } else if (registerStep === 3) {
        nameGroup.style.display = 'block';
        passwordGroup.style.display = 'block';
        emailGroup.style.display = 'none';
        otpGroup.style.display = 'none';
        submitBtn.textContent = isEmployerRole ? 'Complete Employer Registration' : 'Complete Registration';
        document.getElementById('auth-password').required = true;
        const nameLabel = nameGroup.querySelector('.form-label');
        const nameInput = document.getElementById('auth-name');
        if (nameLabel) nameLabel.textContent = isEmployerRole ? 'Company / Organization Name' : 'Full Name';
        if (nameInput) nameInput.placeholder = isEmployerRole ? 'TechSolutions PLC' : 'Abebe Kebede';
      }
    } else {
      registerStep = 1; // reset for next time
      title.textContent = 'Sign In';
      submitBtn.textContent = isEmployerRole ? 'Sign In as Employer' : 'Sign In as Job Seeker';
      if (toggleText) toggleText.textContent = "Don't have an account?";
      if (toggleBtn) toggleBtn.textContent = 'Register here';
      if (switchSignIn) switchSignIn.style.display = 'block';
      if (switchRegister) switchRegister.style.display = 'none';
      nameGroup.style.display = 'none';
      passwordGroup.style.display = 'block';
      emailGroup.style.display = 'block';
      document.getElementById('auth-email').readOnly = false;
      otpGroup.style.display = 'none';
      document.getElementById('auth-password').required = true;
    }
  }
  window.updateAuthModalUI = updateAuthModalUI;
  window.setAuthModalMode = function (redirectUrl, isRegister = false, role = null) {
    if (role) {
      selectedAuthRole = role;
    } else if (redirectUrl === 'employer.html') {
      selectedAuthRole = 'employer';
    } else if (redirectUrl === 'seeker.html') {
      selectedAuthRole = 'job_seeker';
    }
    loginRedirectUrl = redirectUrl || (selectedAuthRole === 'employer' ? 'employer.html' : 'seeker.html');
    isRegisterMode = isRegister;
    registerStep = 1;
    updateAuthModalUI();
  };

  // Direct delegation for segmented role tab toggles
  document.addEventListener('click', (e) => {
    const roleBtn = e.target.closest('.role-switch-btn');
    if (roleBtn) {
      e.preventDefault();
      const chosenRole = roleBtn.getAttribute('data-role') || 'job_seeker';
      selectedAuthRole = chosenRole;
      loginRedirectUrl = (chosenRole === 'employer') ? 'employer.html' : 'seeker.html';
      updateAuthModalUI();
    }
  });

  // Handle Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const name = document.getElementById('auth-name').value;

      const isEmployerRole = (selectedAuthRole === 'employer' || loginRedirectUrl === 'employer.html' || currentPage === 'employer.html');
      const determinedRole = isEmployerRole ? 'employer' : 'job_seeker';

      if (isRegisterMode) {
        if (registerStep === 1) {
          // Send OTP
          try {
            const res = await fetch('/api/auth/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
              showToast('Verification code sent!', 'success');
              registerStep = 2;
              updateAuthModalUI();
            } else {
              showToast(data.message || 'Failed to send OTP', 'error');
            }
          } catch (e) {
            showToast('Network error', 'error');
          }
          return;
        } else if (registerStep === 2) {
          // Verify OTP
          const otpCode = document.getElementById('auth-otp') ? document.getElementById('auth-otp').value : '';
          try {
            const res = await fetch('/api/auth/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, code: otpCode })
            });
            const data = await res.json();
            if (res.ok) {
              showToast('Email verified!', 'success');
              pendingRegistrationToken = data.registrationToken;
              registerStep = 3;
              updateAuthModalUI();
            } else {
              showToast(data.message || 'Invalid OTP', 'error');
            }
          } catch (e) {
            showToast('Network error', 'error');
          }
          return;
        } else if (registerStep === 3) {
          // Complete Registration
          const endpoint = determinedRole === 'employer' ? '/api/auth/employer/register' : '/api/auth/seeker/register';
          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, email, password, registrationToken: pendingRegistrationToken })
            });
            const data = await res.json();
            if (res.ok) {
              showToast('Registration successful!', 'success');
              if (determinedRole === 'employer') {
                setEmployerAuth(data.token, data.user);
              } else {
                setSeekerAuth(data.token, data.user);
              }
              setTimeout(() => {
                if (determinedRole === 'employer') {
                  window.location.href = 'employer.html';
                } else {
                  const pendingJobId = sessionStorage.getItem('pendingApplyJobId');
                  if (pendingJobId) {
                    sessionStorage.removeItem('pendingApplyJobId');
                    window.location.href = `job-details.html?id=${pendingJobId}`;
                  } else {
                    window.location.href = 'seeker.html';
                  }
                }
              }, 1000);
            } else {
              showToast(data.message || 'Registration failed', 'error');
            }
          } catch (e) {
            showToast('Network error', 'error');
          }
          return;
        }
      }

      // Normal Login Logic
      const endpoint = determinedRole === 'employer' ? '/api/auth/employer/login' : '/api/auth/seeker/login';
      const payload = { email, password };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          showToast('Logged in successfully!', 'success');
          if (data.token && data.user) {
            if (determinedRole === 'employer') {
              setEmployerAuth(data.token, data.user);
            } else {
              setSeekerAuth(data.token, data.user);
            }
          }

          setTimeout(() => {
            if (determinedRole === 'employer') {
              window.location.href = 'employer.html';
            } else {
              const pendingJobId = sessionStorage.getItem('pendingApplyJobId');
              if (pendingJobId) {
                sessionStorage.removeItem('pendingApplyJobId');
                window.location.href = `job-details.html?id=${pendingJobId}`;
              } else {
                window.location.href = 'seeker.html';
              }
            }
          }, 1000);
        } else {
          showToast(data.message || 'Authentication failed', 'error');
        }
      } catch (error) {
        showToast('Network error, please try again later', 'error');
      }
    });
  }

  function showOTPModal(email, role) {
    let otpModal = document.getElementById('otp-modal');
    if (!otpModal) {
      otpModal = document.createElement('div');
      otpModal.id = 'otp-modal';
      otpModal.className = 'modal hidden';
      otpModal.innerHTML = `
              <div class="modal-content">
                  <span class="close-modal" id="otp-close">&times;</span>
                  <h2>Verify Your Email</h2>
                  <p>We sent a 6-digit code to <strong id="otp-email-display"></strong>. Valid for 10 minutes.</p>
                  <form id="otp-form">
                      <div class="form-group">
                          <label for="otp-code">Verification Code</label>
                          <input type="text" id="otp-code" placeholder="Enter 6-digit code" required maxlength="6" pattern="\\d{6}">
                      </div>
                      <button type="submit" class="btn btn-primary" style="width:100%">Verify & Login</button>
                  </form>
              </div>
          `;
      document.body.appendChild(otpModal);

      document.getElementById('otp-close').addEventListener('click', () => {
        otpModal.classList.add('hidden');
        otpModal.classList.remove('active');
      });

      document.getElementById('otp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('otp-code').value;
        const targetEmail = document.getElementById('otp-email-display').innerText;
        const currentRole = otpModal.getAttribute('data-role');

        const endpoint = currentRole === 'employer' ? '/api/auth/employer/verify' : '/api/auth/seeker/verify';

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetEmail, code })
          });
          const d = await res.json();
          if (res.ok) {
            showToast('Email verified successfully!', 'success');
            if (currentRole === 'employer') {
              setEmployerAuth(d.token, d.user);
            } else {
              setSeekerAuth(d.token, d.user);
            }
            if (currentRole === 'employer') {
              window.location.href = 'employer.html';
            } else {
              const pendingJobId = sessionStorage.getItem('pendingApplyJobId');
              if (pendingJobId) {
                sessionStorage.removeItem('pendingApplyJobId');
                window.location.href = `job-details.html?id=${pendingJobId}`;
              } else {
                window.location.href = 'seeker.html';
              }
            }
          } else {
            showToast(d.message || 'Verification failed', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('An error occurred. Try again.', 'error');
        }
      });
    }

    document.getElementById('otp-email-display').innerText = email;
    otpModal.setAttribute('data-role', role);

    const authModal = document.getElementById('login-modal');
    if (authModal) {
      authModal.classList.remove('active');
      authModal.classList.add('hidden');
    }

    otpModal.classList.remove('hidden');
    otpModal.classList.add('active');
  }




  // Pre-fill profile data if available
  const activePrefillUser = (currentPage === 'seeker.html') ? getSeekerAuth().user : ((currentPage === 'employer.html') ? getEmployerAuth().user : user);
  if (activePrefillUser) {
    try {
      const u = activePrefillUser;
      const nameInput = document.getElementById('profile-name');
      const emailInput = document.getElementById('profile-email');
      const titleInput = document.getElementById('profile-title');
      const phoneInput = document.getElementById('profile-phone');
      const locationInput = document.getElementById('profile-location');
      const bioInput = document.getElementById('profile-bio');

      if (nameInput) nameInput.value = u.name || '';
      if (emailInput) emailInput.value = u.email || '';
      if (titleInput) titleInput.value = u.professional_title || u.title || '';
      if (phoneInput) phoneInput.value = u.phone_number || u.phone || '';
      if (locationInput) locationInput.value = u.location || '';
      if (bioInput) bioInput.value = u.bio || '';
      const githubInput = document.getElementById('profile-github');
      if (githubInput) githubInput.value = u.github_url || '';
      const linkedinInput = document.getElementById('profile-linkedin');
      if (linkedinInput) linkedinInput.value = u.linkedin_url || '';
      const portfolioInput = document.getElementById('profile-portfolio');
      if (portfolioInput) portfolioInput.value = u.portfolio_url || '';
    } catch (e) { }
  }

  // Home Page Job Search Logic
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const keywordInput = (document.getElementById('search-keyword')?.value || '').toLowerCase().trim();
      const locationInput = (document.getElementById('search-location')?.value || '').toLowerCase().trim();

      const jobCards = document.querySelectorAll('.job-grid .card');
      let foundCount = 0;

      jobCards.forEach(card => {
        const titleEl = card.querySelector('.job-card-title');
        const companyEl = card.querySelector('.job-company');

        const title = titleEl ? titleEl.textContent.toLowerCase() : '';
        const company = companyEl ? companyEl.textContent.toLowerCase() : '';

        const detailItems = card.querySelectorAll('.job-detail-item');
        const locationText = detailItems.length > 0 ? detailItems[0].textContent.trim().toLowerCase() : '';

        const matchesKeyword = title.includes(keywordInput) || company.includes(keywordInput);
        const matchesLocation = locationInput === "" || locationText.includes(locationInput);

        if (matchesKeyword && matchesLocation) {
          card.style.display = 'flex';
          foundCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (foundCount > 0) {
        showToast(`Found ${foundCount} job${foundCount > 1 ? 's' : ''}`, 'success');
      } else {
        showToast('No jobs found matching your search', 'info');
      }

      // Scroll to results
      const sectionHeader = document.querySelector('.section-header');
      if (sectionHeader) {
        sectionHeader.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Post Job Logic & Freemium Handler (Employer Dashboard)
  const postJobForm = document.getElementById('post-job-form');
  window.currentFreeJobsRemaining = null;

  async function loadFreemiumStatus() {
    const freemiumBadge = document.getElementById('freemium-count-badge');
    const submitBtn = document.getElementById('btn-post-job-submit') || document.querySelector('#post-job-form button[type="submit"]');
    const freemiumDesc = document.getElementById('freemium-description');
    const freemiumPill = document.getElementById('freemium-tier-pill');

    const empAuth = getEmployerAuth();
    if (!empAuth.user) return;

    try {
      const headers = {};
      if (empAuth.token && !empAuth.token.includes('cookie')) {
        headers['Authorization'] = `Bearer ${empAuth.token}`;
      }

      let res = await fetch('/api/employer/freemium-status', { headers, credentials: 'include' });
      if (!res.ok) {
        res = await fetch('/api/employer/stats', { headers, credentials: 'include' });
      }

      if (res.ok) {
        const data = await res.json();
        const freeJobsRemaining = typeof data.free_jobs_remaining === 'number'
          ? data.free_jobs_remaining
          : Math.max(0, 2 - (Number(data.free_jobs_posted) || 0));

        window.currentFreeJobsRemaining = freeJobsRemaining;

        if (freemiumBadge) {
          freemiumBadge.textContent = `${freeJobsRemaining} of 2 free posts remaining`;
          if (freeJobsRemaining === 0) {
            freemiumBadge.className = 'badge badge-amber text-xs font-bold';
          } else {
            freemiumBadge.className = 'badge badge-primary text-xs font-bold';
          }
        }

        if (freemiumDesc) {
          if (freeJobsRemaining === 0) {
            freemiumDesc.textContent = 'Free post allowance exhausted. This and subsequent posts require 300 ETB via Chapa.';
          } else {
            freemiumDesc.textContent = 'The first 2 job posts are free. Subsequent posts require a payment of 300 ETB via Chapa.';
          }
        }

        if (freemiumPill) {
          if (freeJobsRemaining === 0) {
            freemiumPill.textContent = '300 ETB / Post';
            freemiumPill.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 shadow-xs whitespace-nowrap';
          } else {
            freemiumPill.textContent = 'Free Tier';
            freemiumPill.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shadow-xs whitespace-nowrap';
          }
        }

        if (submitBtn) {
          if (freeJobsRemaining === 0) {
            submitBtn.textContent = 'Pay 300 ETB & Post Job';
          } else {
            submitBtn.textContent = 'Submit job';
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching freemium status:', e);
    }
  }
  window.loadFreemiumStatus = loadFreemiumStatus;

  // Global helper to open Pre-Checkout Payment Method Modal with dynamic Job Title & Job ID
  window.openPaymentMethodModal = function ({ jobTitle = 'Job Listing', jobId = null, onProceed }) {
    const paymentModal = document.getElementById('payment-method-modal');
    if (!paymentModal) return;

    const modalTitle = document.getElementById('modal-payment-job-title');
    if (modalTitle) {
      const cleanTitle = (jobTitle || '').toString().trim();
      modalTitle.textContent = (cleanTitle && cleanTitle !== '[object Object]' && cleanTitle !== 'undefined')
        ? cleanTitle
        : 'New Job Listing';
    }

    if (jobId) {
      paymentModal.setAttribute('data-pending-job-id', jobId);
    }

    let selectedChannel = 'telebirr';
    const channelCards = paymentModal.querySelectorAll('.payment-channel-card');
    const channelRadios = paymentModal.querySelectorAll('input[name="payment_channel"]');
    const channelLabel = document.getElementById('selected-channel-label');

    function updateSelectedChannel(val) {
      selectedChannel = val;
      channelCards.forEach(card => {
        const isMatch = card.getAttribute('data-channel') === val;
        if (isMatch) {
          card.classList.add('active');
          card.style.borderColor = '#0284c7';
          card.style.background = 'rgba(2, 132, 199, 0.06)';
          const radio = card.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
        } else {
          card.classList.remove('active');
          card.style.borderColor = '';
          card.style.background = '';
        }
      });
      if (channelLabel) {
        channelLabel.textContent = val === 'cbe' ? 'CBE Birr / CBE' : 'Telebirr';
      }
    }

    updateSelectedChannel('telebirr');

    channelCards.forEach(card => {
      card.onclick = () => {
        const val = card.getAttribute('data-channel');
        if (val) updateSelectedChannel(val);
      };
    });

    channelRadios.forEach(radio => {
      radio.onchange = () => {
        if (radio.checked) updateSelectedChannel(radio.value);
      };
    });

    const closeModal = () => {
      paymentModal.classList.remove('active');
      paymentModal.classList.add('hidden');
      const confirmBtn = document.getElementById('confirm-payment-modal-btn');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        const channelLabel = document.getElementById('selected-channel-label');
        const labelText = channelLabel ? channelLabel.textContent : 'Telebirr';
        confirmBtn.innerHTML = `<span>Proceed with <span id="selected-channel-label">${labelText}</span></span><svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`;
      }
    };

    const closeBtn = document.getElementById('close-payment-method-modal');
    if (closeBtn) closeBtn.onclick = closeModal;

    const cancelBtn = document.getElementById('cancel-payment-modal-btn');
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const confirmBtn = document.getElementById('confirm-payment-modal-btn');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.onclick = async () => {
        let chosen = 'telebirr';
        const checkedRadio = paymentModal.querySelector('input[name="payment_channel"]:checked');
        if (checkedRadio) chosen = checkedRadio.value;
        const targetJobId = jobId || paymentModal.getAttribute('data-pending-job-id');

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span>Redirecting to Chapa...</span>';

        if (typeof onProceed === 'function') {
          try {
            await onProceed(chosen, targetJobId);
          } catch (e) {
            confirmBtn.disabled = false;
            updateSelectedChannel(chosen);
            showToast(e.message || 'Payment initialization failed', 'error');
          }
        }
      };
    }

    paymentModal.classList.add('active');
    paymentModal.classList.remove('hidden');
  };

  // Handle return from Chapa payment gateway
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      showToast('Payment submitted. Your job will activate after Chapa confirms it.', 'info');
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      if (typeof window.loadManageJobs === 'function') window.loadManageJobs();
      if (typeof window.loadEmployerStats === 'function') window.loadEmployerStats();
      if (typeof window.switchTab === 'function') window.switchTab('manage-jobs-tab');
    } else if (urlParams.get('payment') === 'pending') {
      showToast('Payment received and is being verified. Your job will become active once confirmed.', 'info');
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch (e) {
    console.warn('Error reading payment return params:', e);
  }

  if (postJobForm) {
    const jobDeadlineInput = document.getElementById('job-deadline');
    if (jobDeadlineInput) {
      const today = new Date();
      const minDate = today.toISOString().split('T')[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const maxDate = nextYear.toISOString().split('T')[0];
      jobDeadlineInput.setAttribute('min', minDate);
      jobDeadlineInput.setAttribute('max', maxDate);
    }

    // Prefill company name and contact email from logged-in employer
    try {
      const empAuth = getEmployerAuth();
      if (empAuth.user) {
        const u = empAuth.user;
        const compInput = document.getElementById('job-company');
        if (compInput && !compInput.value && (u.company_name || u.name)) {
          compInput.value = u.company_name || u.name;
        }
        const emailInput = document.getElementById('job-contact-email');
        if (emailInput && !emailInput.value && u.email) {
          emailInput.value = u.email;
        }
      }
    } catch (e) {
      console.warn('Could not prefill employer details:', e);
    }

    // Load freemium status on post job form init
    loadFreemiumStatus();

    // Smart field invalidation helper with red border & auto-focus
    function markFieldInvalid(fieldEl, errorMsg) {
      if (!fieldEl) {
        showToast(errorMsg, 'error');
        return;
      }
      postJobForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
      fieldEl.classList.add('input-error');
      try {
        fieldEl.focus();
        fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) { }
      showToast(errorMsg, 'error');

      const clearError = () => {
        fieldEl.classList.remove('input-error');
        fieldEl.removeEventListener('input', clearError);
        fieldEl.removeEventListener('change', clearError);
      };
      fieldEl.addEventListener('input', clearError);
      fieldEl.addEventListener('change', clearError);
    }

    // Core submission runner with strict payment enforcement
    async function executeJobSubmission() {
      const compInput = document.getElementById('job-company');
      const emailInput = document.getElementById('job-contact-email');
      const titleInput = document.getElementById('job-title');
      const locationInput = document.getElementById('job-location');
      const deadlineInput = document.getElementById('job-deadline');
      const descInput = postJobForm.querySelector('textarea');
      const salaryInput = document.getElementById('job-salary');
      const jobTypeInput = document.getElementById('job-type');
      const applyEmailInput = document.getElementById('job-apply-email');
      const applyLinkInput = document.getElementById('job-apply-link');

      const empAuth = getEmployerAuth();
      if (!empAuth.user) {
        showToast('You must be logged in as an employer to post a job', 'error');
        return;
      }
      const user = empAuth.user;
      const submitBtn = document.getElementById('btn-post-job-submit') || postJobForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : 'Submit job';

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Processing...';
        }

        const token = empAuth.token || '';
        const headers = { 'Content-Type': 'application/json' };
        if (token && !token.includes('cookie')) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/jobs', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            employer_id: user.id,
            title: titleInput ? titleInput.value.trim() : '',
            company_name: compInput ? compInput.value.trim() : '',
            location: locationInput ? locationInput.value.trim() : '',
            deadline: deadlineInput ? deadlineInput.value.trim() : '',
            description: descInput ? descInput.value.trim() : '',
            salary: salaryInput ? salaryInput.value.trim() : '',
            apply_email: applyEmailInput ? applyEmailInput.value.trim() : '',
            apply_link: applyLinkInput ? applyLinkInput.value.trim() : '',
            contact_email: emailInput ? emailInput.value.trim() : '',
            job_type: (jobTypeInput && jobTypeInput.value) || 'Full-time'
          })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          // If backend provided a specific field with error, highlight it smartly
          if (data.field) {
            const fieldEl = document.getElementById(data.field) || (data.field === 'job-description' ? postJobForm.querySelector('textarea') : null);
            if (fieldEl) {
              markFieldInvalid(fieldEl, data.message || 'Please check this field');
              return;
            }
          }
          showToast(data.message || 'Failed to post job', 'error');
          return;
        }

        // STRICT PAYMENT ENFORCEMENT INTERCEPT:
        // In POST /api/jobs, if free_jobs_posted >= 2, the job MUST be saved with status = 'pending' and payment_status = 'pending'.
        // If backend returns requires_payment: true, STOP the normal success flow immediately.
        if (data.requires_payment || data.payment_status === 'pending') {
          const pendingJobId = data.job_id || data.jobId;
          const currentTitle = (titleInput && titleInput.value.trim()) || 'Job Listing';

          // Immediately open Payment Modal (Telebirr/CBE) and attach the job_id to it
          if (typeof window.openPaymentMethodModal === 'function') {
            window.openPaymentMethodModal({
              jobTitle: currentTitle,
              jobId: pendingJobId,
              onProceed: async (selectedMethod, currentJobId) => {
                const activeJobId = currentJobId || pendingJobId;
                const initHeaders = { 'Content-Type': 'application/json' };
                if (token && !token.includes('cookie')) {
                  initHeaders['Authorization'] = `Bearer ${token}`;
                }
                const initRes = await fetch('/api/payments/initialize', {
                  method: 'POST',
                  headers: initHeaders,
                  credentials: 'include',
                  body: JSON.stringify({
                    jobId: activeJobId,
                    payment_method: selectedMethod || 'telebirr'
                  })
                });
                const initData = await initRes.json();
                if (!initRes.ok || !initData.checkout_url) {
                  throw new Error(initData.error || initData.message || 'Failed to initialize payment gateway');
                }
                window.location.href = initData.checkout_url;
              }
            });
          } else {
            showToast('Payment required (300 ETB) to activate this job post.', 'info');
          }

          // STOP normal success flow: do NOT show success toast, do NOT reset form
          return;
        }

        // Only reached if requires_payment is false (free post < 2)
        showToast('Job posted successfully!', 'success');
        postJobForm.reset();
        loadFreemiumStatus();
        if (typeof window.loadManageJobs === 'function') {
          window.loadManageJobs();
        }
        if (typeof window.loadEmployerStats === 'function') {
          window.loadEmployerStats();
        }
        switchTab('manage-jobs-tab');
      } catch (err) {
        showToast('Network error', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    }

    // Form submit listener with smart field-by-field validation and payment modal intercept
    postJobForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear any previous invalidation highlights
      postJobForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

      const compInput = document.getElementById('job-company');
      const emailInput = document.getElementById('job-contact-email');
      const titleInput = document.getElementById('job-title');
      const locationInput = document.getElementById('job-location');
      const deadlineInput = document.getElementById('job-deadline');
      const descInput = postJobForm.querySelector('textarea');

      const empAuth = getEmployerAuth();
      if (!empAuth.user) {
        showToast('You must be logged in as an employer to post a job', 'error');
        return;
      }

      // 1. Company Name validation
      if (compInput && !compInput.value.trim()) {
        markFieldInvalid(compInput, 'Please enter your Company Name');
        return;
      }

      // 2. Contact Email validation
      if (emailInput && !emailInput.value.trim()) {
        markFieldInvalid(emailInput, 'Please enter your Contact Email');
        return;
      }
      if (emailInput && emailInput.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
        markFieldInvalid(emailInput, 'Please enter a valid Contact Email address');
        return;
      }

      // 3. Job Title validation
      if (!titleInput || !titleInput.value.trim()) {
        markFieldInvalid(titleInput, 'Please enter the Job Title');
        return;
      }

      // 4. Job Location validation (The exact field that caused the user issue!)
      if (!locationInput || !locationInput.value.trim()) {
        markFieldInvalid(locationInput, 'Please enter the Job Location');
        return;
      }

      // 5. Job Deadline validation
      if (!deadlineInput || !deadlineInput.value.trim()) {
        markFieldInvalid(deadlineInput, 'Please select an application Deadline');
        return;
      }
      const inputDate = new Date(deadlineInput.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(inputDate.getTime())) {
        markFieldInvalid(deadlineInput, 'Please enter a valid Deadline date');
        return;
      }
      if (inputDate < today) {
        markFieldInvalid(deadlineInput, 'Deadline cannot be in the past');
        return;
      }

      // 6. Job Description validation
      if (!descInput || !descInput.value.trim()) {
        markFieldInvalid(descInput, 'Please provide a Job Description');
        return;
      }

      // Submit directly to executeJobSubmission which enforces the backend payment loop
      executeJobSubmission();
    });
  }

  // Fetch jobs from backend on Home Page & handle list expansion
  const jobGrid = document.querySelector('.main-grid .job-grid');
  const browseAllBtn = document.getElementById('btn-browse-all-jobs');
  const browseWrapper = document.querySelector('.browse-jobs-wrapper');

  // Helper functions for user reported jobs
  window.getReportedJobsFromStorage = function () {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('user_reported_jobs') || '[]'));
    } catch (e) {
      return new Set();
    }
  };

  window.addReportedJobToStorage = function (jobId) {
    try {
      const set = window.getReportedJobsFromStorage();
      set.add(String(jobId));
      sessionStorage.setItem('user_reported_jobs', JSON.stringify(Array.from(set)));
    } catch (e) { }
  };

  window.removeReportedJobFromStorage = function (jobId) {
    try {
      const set = window.getReportedJobsFromStorage();
      set.delete(String(jobId));
      sessionStorage.setItem('user_reported_jobs', JSON.stringify(Array.from(set)));
    } catch (e) { }
  };

  // Reusable job card HTML builder for home page
  function buildJobCardHtml(job) {
    let companyInitials = 'CO';
    if (job.company_name && job.company_name.trim().length >= 2) {
      companyInitials = job.company_name.trim().substring(0, 2).toUpperCase();
    } else if (job.company_name && job.company_name.trim().length === 1) {
      companyInitials = job.company_name.trim().toUpperCase();
    }

    const isSaved = window.userSavedJobIds && window.userSavedJobIds.has(Number(job.id));
    const bookmarkClass = isSaved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
    const savedClass = isSaved ? 'saved' : '';
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    const iconColorStyle = isSaved ? `style="color: ${isDarkTheme ? 'var(--text-color, #ffffff)' : '#000000'};"` : '';
    const typeBadgeClass = getJobTypeBadgeClass(job.job_type);

    let formattedDeadline = 'Ongoing';
    if (job.deadline) {
      const d = new Date(job.deadline);
      if (!isNaN(d.getTime())) {
        formattedDeadline = d.toLocaleDateString();
      }
    }

    const photoUrl = job.profile_photo || job.profile_photo_url;
    const hasPhoto = photoUrl && typeof photoUrl === 'string' && photoUrl.trim() !== '' && !photoUrl.includes('null') && !photoUrl.includes('undefined');

    const avatarHtml = hasPhoto
      ? `<div class="card-icon-bg card-icon-slate" style="padding: 0; overflow: hidden; display: flex; align-items: center; justify-content: center;">
           <img src="${photoUrl}" alt="${job.company_name || 'Company'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;" onerror="this.onerror=null; this.parentElement.textContent='${companyInitials}';">
         </div>`
      : `<div class="card-icon-bg card-icon-slate">${companyInitials}</div>`;

    // Dynamic relative posting time ("time ago")
    const postTimestamp = job.created_at || job.posted_date || job.posted_at || job.date_posted;
    const timeAgoString = timeSince(postTimestamp);
    const postTimeHtml = timeAgoString ? `<span class="job-post-time">${timeAgoString}</span>` : '';

    const isReported = window.getReportedJobsFromStorage().has(String(job.id));
    const reportBtnHtml = isReported
      ? `<button data-action="undo-report" data-job-id="${job.id}" class="btn btn-outline btn-undo-report ml-1" title="Undo Report">
           <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l6 6m-6-6l6-6"></path>
           </svg>
           <span>Undo Report</span>
         </button>`
      : `<button data-action="report-job" data-job-id="${job.id}" class="btn btn-outline btn-icon-small btn-report ml-1" title="Report Job">
           <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path>
           </svg>
         </button>`;

    return `
      <div class="card card-hover custom-job-card job-card" id="job-card-${job.id}">
        <div class="job-card-header">
          <div class="job-card-meta">
            ${avatarHtml}
            <span class="badge ${typeBadgeClass}">${job.job_type || 'Full-time'}</span>
          </div>
          <div class="job-card-actions">
            ${postTimeHtml}
            <button onclick="toggleSaveJob(${job.id}, this)" data-action="save-job" data-job-id="${job.id}" class="btn btn-outline btn-icon-small btn-save-job ${savedClass}" title="${isSaved ? 'Remove from saved' : 'Save Job'}">
              <i class="${bookmarkClass} bookmark-icon" ${iconColorStyle}></i>
            </button>
            ${reportBtnHtml}
          </div>
        </div>
        <h3 class="job-card-title">${job.title}</h3>
        <p class="job-company">${job.company_name}</p>
        <div class="job-details">
          <div class="job-detail-item">
            <svg class="icon-sm text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            </svg>${job.location || 'Remote'}
          </div>
          <div class="job-detail-item">
            <svg class="icon-sm text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>Deadline: ${formattedDeadline}
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-outline flex-grow" onclick="window.location.href='job-details.html?id=${job.id}'">View Details</button>
          <button onclick="applyForJob(${job.id})" class="btn btn-primary flex-grow">Apply</button>
        </div>
      </div>
    `;
  }

  if (jobGrid) {
    let allHomepageJobs = [];
    let isJobsExpanded = false;
    const HOMEPAGE_JOB_LIMIT = 6;

    // Helper to render a list of jobs into the grid
    const renderHomepageJobs = (jobsList) => {
      jobGrid.innerHTML = '';
      if (!jobsList || jobsList.length === 0) {
        jobGrid.innerHTML = '<p class="text-slate-500 text-center py-8">No recent job postings found.</p>';
        return;
      }
      jobsList.forEach(job => {
        jobGrid.insertAdjacentHTML('beforeend', buildJobCardHtml(job));
      });
      applySavedJobIconsState();
    };

    // Helper to update toggle button UI
    const updateBrowseButtonUI = (expanded) => {
      if (!browseAllBtn) return;
      isJobsExpanded = expanded;
      if (jobGrid) {
        jobGrid.classList.toggle('is-expanded', expanded);
      }
      const recentContainer = document.getElementById('recent-jobs-container');
      if (recentContainer) {
        recentContainer.classList.toggle('is-expanded', expanded);
      }
      if (expanded) {
        browseAllBtn.innerHTML = `
          <span>Show Less</span>
          <i class="fa-solid fa-arrow-up"></i>
        `;
        browseAllBtn.setAttribute('title', 'Show fewer jobs');
        browseAllBtn.setAttribute('aria-expanded', 'true');
      } else {
        browseAllBtn.innerHTML = `
          <span>Browse All Jobs</span>
          <i class="fa-solid fa-arrow-right"></i>
        `;
        browseAllBtn.setAttribute('title', 'Browse all jobs');
        browseAllBtn.setAttribute('aria-expanded', 'false');
      }
    };

    const loadJobs = async () => {
      try {
        const response = await fetch('/api/jobs');
        if (!response.ok) return;
        const allJobs = await response.json();
        allHomepageJobs = Array.isArray(allJobs) ? allJobs : [];

        if (allHomepageJobs.length === 0) {
          jobGrid.innerHTML = '<p class="text-slate-500 text-center py-8">No recent job postings found.</p>';
          if (browseWrapper) browseWrapper.style.display = 'none';
          return;
        }

        // Initially render first 6 jobs
        renderHomepageJobs(allHomepageJobs.slice(0, HOMEPAGE_JOB_LIMIT));
        updateBrowseButtonUI(false);

        // If total jobs is equal or fewer than the visible limit, hide the button
        const isMobileScreen = window.innerWidth <= 768;
        const visibleLimit = isMobileScreen ? 3 : HOMEPAGE_JOB_LIMIT;
        if (allHomepageJobs.length <= visibleLimit && browseWrapper) {
          browseWrapper.style.display = 'none';
        } else if (browseWrapper) {
          browseWrapper.style.display = 'flex';
        }
      } catch (e) {
        console.error("Error loading jobs", e);
      } finally {
        applySavedJobIconsState();
      }
    };
    loadJobs();

    // Toggle expand/collapse click handler
    if (browseAllBtn) {
      browseAllBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // 1. If currently expanded, COLLAPSE back to initial limit (6 jobs)
        if (isJobsExpanded) {
          renderHomepageJobs(allHomepageJobs.slice(0, HOMEPAGE_JOB_LIMIT));
          updateBrowseButtonUI(false);

          // Smoothly scroll window up to the top of Recent Job Postings section
          const sectionHeader = document.querySelector('.section-header') || document.querySelector('.main-grid');
          if (sectionHeader) {
            sectionHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }

        // 2. If currently collapsed, EXPAND to show all jobs
        if (!allHomepageJobs || allHomepageJobs.length === 0) {
          const originalContent = browseAllBtn.innerHTML;
          browseAllBtn.disabled = true;
          browseAllBtn.innerHTML = `
            <span>Loading All Jobs...</span>
            <i class="fa-solid fa-spinner fa-spin"></i>
          `;
          try {
            const response = await fetch('/api/jobs');
            if (response.ok) {
              const allJobs = await response.json();
              allHomepageJobs = Array.isArray(allJobs) ? allJobs : [];
            }
          } catch (err) {
            console.error('Error fetching jobs:', err);
          } finally {
            browseAllBtn.disabled = false;
          }
        }

        renderHomepageJobs(allHomepageJobs);
        updateBrowseButtonUI(true);
      });
    }

    // Homepage Job Search (FR-8: Search jobs by title/keyword & location)
    const searchForm = document.getElementById('search-form');
    const searchKeywordInput = document.getElementById('search-keyword');
    const searchLocationInput = document.getElementById('search-location');

    const handleJobSearch = (e) => {
      if (e) e.preventDefault();
      const keyword = (searchKeywordInput?.value || '').trim().toLowerCase();
      const location = (searchLocationInput?.value || '').trim().toLowerCase();

      if (!keyword && (!location || location === 'any location')) {
        renderHomepageJobs(allHomepageJobs.slice(0, isJobsExpanded ? allHomepageJobs.length : HOMEPAGE_JOB_LIMIT));
        if (browseWrapper) browseWrapper.style.display = allHomepageJobs.length > HOMEPAGE_JOB_LIMIT ? 'flex' : 'none';
        return;
      }

      const filtered = allHomepageJobs.filter(job => {
        const titleMatch = !keyword ||
          (job.title && job.title.toLowerCase().includes(keyword)) ||
          (job.company_name && job.company_name.toLowerCase().includes(keyword)) ||
          (job.description && job.description.toLowerCase().includes(keyword));

        const locMatch = !location || location === 'any location' ||
          (job.location && job.location.toLowerCase().includes(location));

        return titleMatch && locMatch;
      });

      if (filtered.length === 0) {
        jobGrid.innerHTML = `
          <div class="col-span-full text-center py-12" style="grid-column: 1 / -1;">
            <svg class="icon-lg mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <h3 class="text-lg font-bold text-slate-800 mb-1">No Jobs Found</h3>
            <p class="text-sm text-slate-500 mb-4">We couldn't find any job openings matching your search criteria.</p>
            <button type="button" class="btn btn-outline" id="btn-clear-job-search">Clear Search</button>
          </div>
        `;
        document.getElementById('btn-clear-job-search')?.addEventListener('click', () => {
          if (searchKeywordInput) searchKeywordInput.value = '';
          if (searchLocationInput) searchLocationInput.value = '';
          handleJobSearch();
        });
        if (browseWrapper) browseWrapper.style.display = 'none';
      } else {
        renderHomepageJobs(filtered);
        if (browseWrapper) browseWrapper.style.display = 'none';
      }

      if (e && e.type === 'submit') {
        const sectionHeader = document.querySelector('.section-header') || jobGrid;
        if (sectionHeader) {
          sectionHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    if (searchForm) {
      searchForm.addEventListener('submit', handleJobSearch);
    }
    if (searchKeywordInput) {
      searchKeywordInput.addEventListener('input', () => {
        clearTimeout(searchKeywordInput._searchTimeout);
        searchKeywordInput._searchTimeout = setTimeout(handleJobSearch, 200);
      });
    }
    if (searchLocationInput) {
      searchLocationInput.addEventListener('input', () => {
        clearTimeout(searchLocationInput._searchTimeout);
        searchLocationInput._searchTimeout = setTimeout(handleJobSearch, 200);
      });
      searchLocationInput.addEventListener('change', handleJobSearch);
    }
  }

  // Employer Dashboard Applicant Pipeline
  const loadEmployerApplications = async () => {
    const pendingColumn = document.querySelector('.kanban-cards[data-column="pending"]');
    const hiredColumn = document.querySelector('.kanban-cards[data-column="hired"]');

    if (!pendingColumn && !hiredColumn) return;

    const empAuth = typeof getEmployerAuth === 'function' ? getEmployerAuth() : {};
    let employerId = empAuth?.user?.id || empAuth?.user?.employer_id;
    if (!employerId && empAuth?.token) {
      try {
        const payload = JSON.parse(atob(empAuth.token.split('.')[1]));
        if (payload && (payload.id || payload.employer_id)) {
          employerId = payload.id || payload.employer_id;
        }
      } catch (e) { }
    }
    if (!employerId) {
      try {
        const stored = JSON.parse(localStorage.getItem('employer_user') || localStorage.getItem('user') || 'null');
        if (stored && (stored.id || stored.employer_id)) {
          employerId = stored.id || stored.employer_id;
        }
      } catch (e) { }
    }
    if (!employerId) employerId = 4; // Default active employer ID fallback

    try {
      const token = empAuth?.token ||
        localStorage.getItem('employer_token') ||
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('accessToken') ||
        sessionStorage.getItem('employer_token') ||
        localStorage.getItem('token');

      const headers = { 'Accept': 'application/json' };
      if (token && !token.includes('cookie')) {
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      const response = await fetch('/api/applications/employer/' + employerId, { headers, credentials: 'include' });
      if (!response.ok) {
        if (typeof window.setupKanbanDragAndDrop === 'function') {
          window.setupKanbanDragAndDrop();
        }
        return;
      }
      const applications = await response.json();

      if (pendingColumn) pendingColumn.innerHTML = '';
      if (hiredColumn) hiredColumn.innerHTML = '';

      let pendingCount = 0;
      let hiredCount = 0;

      if (Array.isArray(applications) && applications.length > 0) {
        applications.forEach(app => {
          let initials = 'U';
          if (app.seeker_name && app.seeker_name.trim().length >= 2) {
            const parts = app.seeker_name.trim().split(/\s+/);
            initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : app.seeker_name.trim().substring(0, 2).toUpperCase();
          } else if (app.seeker_name && app.seeker_name.trim().length === 1) {
            initials = app.seeker_name.trim().toUpperCase();
          }

          const rawPhoto = app.profile_photo_url || app.profile_photo;
          const hasPhoto = rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() !== '' && rawPhoto !== 'null' && rawPhoto !== 'undefined' && !rawPhoto.includes('default-avatar');
          const photoUrl = hasPhoto ? (typeof normalizePhotoPath === 'function' ? normalizePhotoPath(rawPhoto) : rawPhoto) : null;

          const avatarHtml = photoUrl
            ? `<div class="card-icon-circle card-icon-sm" style="overflow: hidden; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%;">
                 <img src="${photoUrl}" alt="${app.seeker_name || 'Applicant'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.parentElement.className='card-icon-bg card-icon-circle card-icon-slate card-icon-sm'; this.parentElement.textContent='${initials}';" />
               </div>`
            : `<div class="card-icon-bg card-icon-circle card-icon-slate card-icon-sm" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-weight: 700; border-radius: 50%;">${initials}</div>`;

          const appliedDate = app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

          const cvAction = app.resume_file_url
            ? `window.open('${app.resume_file_url}', '_blank')`
            : `if (typeof showToast === 'function') { showToast('No CV uploaded by this applicant yet.', 'info'); } else { alert('No CV uploaded.'); }`;
          const cvBtnText = app.resume_file_url ? 'Download CV' : 'No CV';
          const cvBtnClass = app.resume_file_url ? 'btn-outline' : 'btn-outline opacity-60';

          const statusLower = String(app.status || '').toLowerCase();
          // Do not render rejected or withdrawn applications in the active pipeline
          if (statusLower === 'rejected' || statusLower === 'withdrawn') {
            return;
          }

          const isHired = statusLower === 'hired';

          if (isHired) {
            hiredCount++;
            const cardHtml = `
              <div class="kanban-card opacity-95" draggable="true" data-id="${app.id}" style="border-left: 4px solid var(--green-500, #22c55e);">
                 <div class="flex items-start justify-between gap-3 mb-3">
                   <div class="flex items-center gap-3">
                     ${avatarHtml}
                     <div>
                       <h4 class="font-bold text-slate-900 kanban-applicant-name m-0">${app.seeker_name || 'Applicant'}</h4>
                       <p class="kanban-applied-for text-slate-500 mt-1 mb-0 font-medium">Hired for: <span class="text-slate-800 font-semibold">${app.job_title || 'Position'}</span></p>
                       <p class="kanban-applied-date text-green-700 mt-0.5 mb-0 font-medium">Hired: ${appliedDate}</p>
                     </div>
                   </div>
                   <span class="badge badge-green kanban-badge font-semibold">Hired</span>
                 </div>
                 ${app.message ? `<div class="applicant-cover-note p-2 rounded bg-slate-50 border border-slate-100 text-xs text-slate-700 mt-2 mb-1"><strong>Cover Note:</strong> "${(typeof safeEscapeText === 'function' ? safeEscapeText(app.message) : app.message)}"</div>` : ''}
                 <div class="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap">
                   <button type="button" class="btn ${cvBtnClass} flex-grow btn-sm kanban-btn flex items-center justify-center gap-1.5" onclick="${cvAction}">
                     <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 15px; height: 15px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                     <span>${cvBtnText}</span>
                   </button>
                   <button type="button" class="btn btn-outline flex-grow btn-sm kanban-btn flex items-center justify-center gap-1.5" onclick="viewProfile(${app.seeker_id})">
                     <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 15px; height: 15px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                   <span>View Profile</span>
                   </button>
                   <button type="button" class="btn btn-outline flex-grow btn-sm kanban-btn text-red-600 hover:bg-red-50" style="border-color: rgba(220, 38, 38, 0.3);" onclick="rejectApplication(${app.id}, this)">
                     <span>Remove</span>
                   </button>
                 </div>
              </div>
            `;
            if (hiredColumn) hiredColumn.insertAdjacentHTML('beforeend', cardHtml);
          } else {
            pendingCount++;
            const statusBadge = `<span class="badge badge-amber kanban-badge font-semibold">Pending Review</span>`;

            const cardHtml = `
              <div class="kanban-card" draggable="true" data-id="${app.id}">
                 <div class="flex items-start justify-between gap-3 mb-3">
                   <div class="flex items-center gap-3">
                     ${avatarHtml}
                     <div>
                       <h4 class="font-bold text-slate-900 kanban-applicant-name m-0">${app.seeker_name || 'Applicant'}</h4>
                       <p class="kanban-applied-for text-slate-500 mt-1 mb-0 font-medium">Applied for: <span class="text-slate-800 font-semibold">${app.job_title || 'Position'}</span></p>
                       <p class="kanban-applied-date text-slate-400 mt-0.5 mb-0">Applied: ${appliedDate}</p>
                     </div>
                   </div>
                   ${statusBadge}
                 </div>
                 ${app.message ? `<div class="applicant-cover-note p-2 rounded bg-slate-50 border border-slate-100 text-xs text-slate-700 mt-2 mb-1"><strong>Cover Note:</strong> "${(typeof safeEscapeText === 'function' ? safeEscapeText(app.message) : app.message)}"</div>` : ''}
                 
                 <div class="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap">
                   <button type="button" class="btn ${cvBtnClass} btn-sm flex-grow kanban-btn flex items-center justify-center gap-1.5" onclick="${cvAction}">
                     <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 15px; height: 15px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                     <span>${cvBtnText}</span>
                   </button>
                   <button type="button" class="btn btn-outline btn-sm flex-grow kanban-btn flex items-center justify-center gap-1.5" onclick="viewProfile(${app.seeker_id})">
                     <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 15px; height: 15px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                     <span>View Profile</span>
                   </button>
                   <button type="button" class="btn btn-primary btn-sm flex-grow kanban-btn flex items-center justify-center gap-1.5" style="background-color: var(--green-600, #16a34a); border-color: var(--green-600, #16a34a);" onclick="hireApplication(${app.id}, this)">
                     <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 15px; height: 15px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                     <span>Hire</span>
                   </button>
                   <button type="button" class="btn btn-outline btn-sm flex-grow kanban-btn flex items-center justify-center gap-1.5" style="color: var(--danger, #dc2626); border-color: rgba(220, 38, 38, 0.3);" onclick="rejectApplication(${app.id}, this)">
                     <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 15px; height: 15px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                     <span>Reject</span>
                   </button>
                 </div>
              </div>
            `;
            if (pendingColumn) pendingColumn.insertAdjacentHTML('beforeend', cardHtml);
          }
        });
      }

      if (pendingCount === 0 && pendingColumn) {
        pendingColumn.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs italic">No candidates pending review.</div>';
      }
      if (hiredCount === 0 && hiredColumn) {
        hiredColumn.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs italic">No candidates marked as hired yet.</div>';
      }

      // Update badge counts
      const totalBadge = document.getElementById('pipeline-total-badge');
      if (totalBadge) totalBadge.textContent = `${pendingCount + hiredCount} Candidates`;

      const pendingBadge = document.getElementById('pipeline-pending-badge') ||
        document.querySelector('.kanban-cards[data-column="pending"]')?.closest('.kanban-col')?.querySelector('.badge');
      if (pendingBadge) pendingBadge.textContent = pendingCount;

      const hiredBadge = document.getElementById('pipeline-hired-badge') ||
        document.querySelector('.kanban-cards[data-column="hired"]')?.closest('.kanban-col')?.querySelector('.badge');
      if (hiredBadge) hiredBadge.textContent = hiredCount;

      // Realtime search filter
      const searchInput = document.getElementById('pipeline-search-input');
      if (searchInput && !searchInput.dataset.pipelineBound) {
        searchInput.dataset.pipelineBound = 'true';
        searchInput.addEventListener('input', (e) => {
          const term = (e.target.value || '').toLowerCase().trim();
          document.querySelectorAll('.kanban-card').forEach(card => {
            const txt = card.textContent.toLowerCase();
            card.style.display = txt.includes(term) ? '' : 'none';
          });
        });
      }

      if (typeof window.setupKanbanDragAndDrop === 'function') {
        window.setupKanbanDragAndDrop();
      }

    } catch (error) {
      console.error('Error loading employer applications:', error);
    }
  };
  window.loadEmployerApplications = loadEmployerApplications;
  loadEmployerApplications();

  // Employer Dashboard Overview Analytics & Statistics
  const loadEmployerAnalytics = async () => {
    const statViews = document.getElementById('stat-job-views');
    const statApps = document.getElementById('stat-total-applicants');
    const statConv = document.getElementById('stat-conversion-rate');
    const statActive = document.getElementById('stat-active-postings');

    if (!statViews && !statApps && !statConv && !statActive) return;

    const empAuth = typeof getEmployerAuth === 'function' ? getEmployerAuth() : { user: null, token: null };
    const token = empAuth?.token ||
      localStorage.getItem('employer_token') ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('employer_token') ||
      localStorage.getItem('token');

    const headers = { 'Accept': 'application/json' };
    if (token && !token.includes('cookie')) {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      headers['Authorization'] = `Bearer ${cleanToken}`;
    }

    const updateStatsUI = (data) => {
      if (!data) return;
      const totalViews = data.totalJobViews !== undefined ? data.totalJobViews : (data.total_job_views !== undefined ? data.total_job_views : 0);
      const totalApplicants = data.totalApplicants !== undefined ? data.totalApplicants : (data.total_applicants !== undefined ? data.total_applicants : 0);
      const activePostings = data.activePostings !== undefined ? data.activePostings : (data.active_postings !== undefined ? data.active_postings : 0);
      let convRate = data.conversionRate || data.conversion_rate;
      if (convRate === undefined || convRate === null || convRate === '') {
        convRate = totalViews > 0 ? (((totalApplicants / totalViews) * 100).toFixed(1) + '%') : '0%';
      }

      if (statViews) statViews.textContent = Number(totalViews).toLocaleString();
      if (statApps) statApps.textContent = Number(totalApplicants).toLocaleString();
      if (statConv) statConv.textContent = convRate;
      if (statActive) statActive.textContent = Number(activePostings).toLocaleString();
    };

    try {
      const res = await fetch('/api/employer/stats', { headers, credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        updateStatsUI(data);
        return;
      }
    } catch (err) {
      console.warn('GET /api/employer/stats request failed, attempting fallback:', err);
    }

    // Fallback to legacy endpoint if available
    let employerId = empAuth?.user?.id || empAuth?.user?.employer_id;
    if (!employerId) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('employer_user') || localStorage.getItem('user') || 'null');
        if (storedUser && storedUser.id) employerId = storedUser.id;
      } catch (e) { }
    }

    if (employerId) {
      try {
        const fallbackRes = await fetch(`/api/jobs/employer/${employerId}/analytics`, { headers, credentials: 'include' });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          updateStatsUI(data);
          return;
        }
      } catch (e) {
        console.error('Failed to load employer stats from fallback:', e);
      }
    }

    // Presentation fallbacks so stats are clean numbers instead of raw dashes if offline/unauthenticated
    if (statViews && (statViews.textContent === '--' || !statViews.textContent)) statViews.textContent = '0';
    if (statApps && (statApps.textContent === '--' || !statApps.textContent)) statApps.textContent = '0';
    if (statConv && (statConv.textContent === '--' || !statConv.textContent)) statConv.textContent = '0%';
    if (statActive && (statActive.textContent === '--' || !statActive.textContent)) statActive.textContent = '0';
  };

  window.loadEmployerAnalytics = loadEmployerAnalytics;
  window.loadEmployerStats = loadEmployerAnalytics;
  loadEmployerAnalytics();

  // Fetch Seeker Dashboard Data
  const seekerAppsTable = document.querySelector('#applications .table tbody');
  const savedJobsGrid = document.querySelector('#saved-jobs .dashboard-grid');
  const recommendedJobsGrid = document.querySelector('.seeker-recommended-jobs-card .dashboard-grid') || document.querySelector('#applications .dashboard-grid');

  const safeEscapeText = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const renderRecommendedJobsEmpty = (msg) => {
    if (!recommendedJobsGrid) return;
    const message = msg || 'Complete your profile to get personalized job recommendations!';
    recommendedJobsGrid.innerHTML = `
      <div class="empty-recommended-state">
        <div class="empty-icon-circle">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </div>
        <h4 class="empty-title">${safeEscapeText(message)}</h4>
        <p class="empty-desc">
          Add your professional title, skills, and summary to help our matching engine find the best opportunities for you.
        </p>
        <button type="button" class="btn btn-primary btn-sm font-semibold" data-action="switch-tab" data-target="profile" onclick="if(typeof switchTab==='function'){switchTab('profile');}">
          <i class="fa-solid fa-user-pen mr-1.5"></i> Complete Profile
        </button>
      </div>
    `;
  };

  let userApplicationsCount = 0;

  const loadRecommendedJobs = async (appsCount) => {
    if (!recommendedJobsGrid) return;

    const seekerAuth = getSeekerAuth();
    const currentUser = seekerAuth.user;
    if (!currentUser || currentUser.role !== 'job_seeker') {
      renderRecommendedJobsEmpty('Complete your profile to get personalized job recommendations!');
      return;
    }

    // Check if the user is new (empty profile or 0 applications)
    const hasTitle = Boolean(currentUser.professional_title && currentUser.professional_title.trim());
    const hasBio = Boolean(currentUser.bio && currentUser.bio.trim());
    const isProfileEmpty = !hasTitle && !hasBio;
    const countToCheck = typeof appsCount === 'number' ? appsCount : userApplicationsCount;
    const isNew = isProfileEmpty || countToCheck === 0;

    if (isNew) {
      renderRecommendedJobsEmpty('Complete your profile to get personalized job recommendations!');
      return;
    }

    // Fetch real recommendations from MySQL database
    try {
      const res = await fetch(`/api/jobs/recommended/${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      const jobs = await res.json();

      if (!Array.isArray(jobs) || jobs.length === 0) {
        renderRecommendedJobsEmpty('Complete your profile to get personalized job recommendations!');
        return;
      }

      recommendedJobsGrid.innerHTML = '';
      jobs.forEach(job => {
        recommendedJobsGrid.innerHTML += `
          <div class="card p-4 border border-slate-200 shadow-none">
            <div class="flex justify-between items-start mb-2">
              <h4 class="font-semibold text-slate-900 rec-job-title">${safeEscapeText(job.title)}</h4>
              <span class="badge ${getJobTypeBadgeClass(job.job_type)} rec-job-badge">${safeEscapeText(job.job_type || 'Full-time')}</span>
            </div>
            <p class="rec-job-meta text-slate-500 mb-3">${safeEscapeText(job.company_name)} • ${safeEscapeText(job.location)}</p>
            <div class="flex gap-2">
               <button class="btn btn-outline btn-sm flex-grow font-medium" onclick="window.location.href='job-details.html?id=${job.id}'">View Details</button>
               <button class="btn btn-primary btn-sm flex-grow font-semibold" onclick="applyForJob(${job.id})">Apply</button>
            </div>
          </div>
        `;
      });
    } catch (err) {
      console.warn('Could not load recommended jobs from MySQL:', err);
      renderRecommendedJobsEmpty('Complete your profile to get personalized job recommendations!');
    }
  };

  window.loadRecommendedJobs = loadRecommendedJobs;

  if (seekerAppsTable || savedJobsGrid || recommendedJobsGrid) {
    const seekerAuth = getSeekerAuth();
    const user = seekerAuth.user;

    if (user && user.role === 'job_seeker') {
      const seekerHeaders = {};
      if (seekerAuth.token && !seekerAuth.token.includes('cookie')) {
        seekerHeaders['Authorization'] = `Bearer ${seekerAuth.token}`;
      }

      // 1. Load Applications
      if (seekerAppsTable) {
        fetch(`/api/applications/seeker/${user.id}`, { headers: seekerHeaders, credentials: 'include' })
          .then(async res => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.message || `Status ${res.status}`);
            }
            return res.json();
          })
          .then(apps => {
            if (!Array.isArray(apps)) {
              console.warn('Applications response is not an array:', apps);
              loadRecommendedJobs(0);
              return;
            }
            userApplicationsCount = apps.length;
            seekerAppsTable.innerHTML = '';
            const titleEl = document.querySelector('#applications .card-title') || document.querySelector('.card-title');
            if (titleEl) {
              titleEl.textContent = `My Applications (${apps.length})`;
            }
            if (apps.length === 0) {
              seekerAppsTable.innerHTML = `
                <tr>
                  <td colspan="5" class="text-center py-8 text-slate-500">
                    <p class="font-medium text-slate-600 mb-1">No applications found.</p>
                    <p class="text-xs text-slate-400">Explore jobs and apply to track your applications here!</p>
                  </td>
                </tr>
              `;
            } else {
              apps.forEach(app => {
                let badgeClass = 'badge-yellow';
                const st = (app.status || '').toLowerCase();
                if (st === 'reviewed') badgeClass = 'badge-blue';
                if (st === 'rejected') badgeClass = 'badge-slate';
                if (st === 'hired') badgeClass = 'badge-green';

                seekerAppsTable.innerHTML += `
                  <tr>
                    <td class="font-semibold text-slate-900 app-job-title">${safeEscapeText(app.job_title)}</td>
                    <td class="app-company-cell"><span class="app-company-name">${safeEscapeText(app.company_name)}</span><br><span class="app-company-location text-slate-400">${safeEscapeText(app.location)}</span></td>
                    <td class="app-applied-date">${new Date(app.applied_at).toLocaleDateString()}</td>
                    <td><span class="badge ${badgeClass}">${safeEscapeText(app.status)}</span></td>
                    <td class="text-right">
                      <button onclick="window.location.href='job-details.html?id=${app.job_id}'" class="btn-text-link">View Job</button>
                      <button onclick="withdrawApplication(${app.id}, this)" class="btn-text-link text-red-500 ml-2 btn-withdraw">Withdraw</button>
                    </td>
                  </tr>
                `;
              });
            }
            loadRecommendedJobs(apps.length);
          })
          .catch(err => {
            console.warn('Could not load live applications:', err.message);
            const titleEl = document.querySelector('#applications .card-title') || document.querySelector('.card-title');
            if (titleEl) {
              titleEl.textContent = 'My Applications (0)';
            }
            seekerAppsTable.innerHTML = `
              <tr>
                <td colspan="5" class="text-center py-8 text-slate-500">
                  <p class="font-medium text-slate-600 mb-1">No applications found.</p>
                  <p class="text-xs text-slate-400">Explore jobs and apply to track your applications here!</p>
                </td>
              </tr>
            `;
            loadRecommendedJobs(0);
          });
      } else {
        loadRecommendedJobs(0);
      }

      // 2. Load Saved Jobs
      if (savedJobsGrid) {
        fetch(`/api/jobs/saved/${user.id}`, { headers: seekerHeaders, credentials: 'include' })
          .then(res => res.json())
          .then(jobs => {
            savedJobsGrid.innerHTML = '';
            if (Array.isArray(jobs)) {
              window.userSavedJobIds = new Set(jobs.map(j => Number(j.job_id || j.id)));
              applySavedJobIconsState();
            }
            if (!Array.isArray(jobs) || jobs.length === 0) {
              savedJobsGrid.innerHTML = `
                  <div class="col-span-full py-8 text-center text-slate-500">
                    <p class="font-medium text-slate-600 mb-1">No saved jobs yet.</p>
                    <p class="text-xs text-slate-400">Save jobs while browsing to review and apply to them later.</p>
                  </div>
                `;
            } else {
              jobs.forEach(job => {
                const jobId = job.job_id || job.id;
                const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
                const bookmarkColor = isDarkTheme ? 'var(--text-color, #ffffff)' : '#000000';
                savedJobsGrid.innerHTML += `
                    <div class="card" id="saved-job-${jobId}">
                      <div class="flex justify-between items-start mb-3">
                        <div>
                          <h3 class="font-bold text-slate-900">${safeEscapeText(job.title)}</h3>
                          <p class="text-sm text-slate-500">${safeEscapeText(job.company_name)} • ${safeEscapeText(job.location)}</p>
                        </div>
                        <button class="btn btn-outline btn-icon-small btn-save-job saved" title="Remove from saved" onclick="unsaveJob(${jobId}, this)">
                          <i class="fa-solid fa-bookmark bookmark-icon" style="color: ${bookmarkColor}; font-size: 1.15rem;"></i>
                        </button>
                      </div>
                      <div class="flex gap-2 mb-4">
                        <span class="badge ${getJobTypeBadgeClass(job.job_type)} text-xs" style="font-size: 0.7rem;">${safeEscapeText(job.job_type || 'Full-time')}</span>
                        <span class="text-xs text-slate-400 self-center">Saved ${job.saved_at ? new Date(job.saved_at).toLocaleDateString() : 'Recently'}</span>
                      </div>
                      <div class="flex gap-2">
                        <button class="btn btn-outline btn-sm flex-grow text-xs" onclick="window.location.href='job-details.html?id=${jobId}'">View Details</button>
                        <button class="btn btn-primary btn-sm flex-grow text-xs" onclick="applyForJob(${jobId})">Apply Now</button>
                        <button class="btn btn-danger btn-sm text-xs px-3 btn-remove-saved" onclick="unsaveJob(${jobId}, this)" title="Remove from saved jobs">
                          <i class="fa-solid fa-trash-can mr-1"></i> Remove
                        </button>
                      </div>
                    </div>
                  `;
              });
            }
          }).catch(console.error);
      }

      // 4. Load Active Alerts
      window.loadAlerts = async function () {
        if (typeof window.loadActiveAlerts === 'function' && window.loadActiveAlerts !== window.loadAlerts) {
          return window.loadActiveAlerts();
        }
        const container = document.getElementById('active-alerts-container') ||
          document.querySelector('#alerts .dashboard-grid .card:last-child');
        const titleEl = document.getElementById('active-alerts-title') ||
          document.querySelector('#alerts .dashboard-grid .card:last-child h2');

        if (!container) return;

        const seekerAuth = getSeekerAuth();
        const headers = {};
        if (seekerAuth.token && !seekerAuth.token.includes('cookie')) {
          headers['Authorization'] = `Bearer ${seekerAuth.token}`;
        }

        try {
          let res = await fetch('/api/seeker/alerts', { headers, credentials: 'include' });
          if (!res.ok && res.status === 404) {
            res = await fetch('/api/alerts', { headers, credentials: 'include' });
          }
          if (!res.ok) return;
          const alerts = await res.json();
          const count = Array.isArray(alerts) ? alerts.length : 0;

          if (titleEl) {
            titleEl.textContent = `Active Alerts (${count})`;
          }

          const targetElement = document.getElementById('active-alerts-container') || container;
          targetElement.innerHTML = '';

          if (!Array.isArray(alerts) || alerts.length === 0) {
            targetElement.innerHTML = '<p class="text-slate-500 py-4 text-sm">No active alerts configured.</p>';
          } else {
            alerts.forEach(alert => {
              const alertId = alert.id;
              const sector = alert.job_sector || alert.sector || alert.keyword || 'Software & Tech';
              const location = alert.location || 'Addis Ababa';
              const frequency = alert.frequency || 'daily';
              const channelText = alert.email_notification ? 'Email Notification' : 'Notifications Disabled';

              const cardHtml = `
                  <div class="alert-card mb-3" id="alert-${alertId}" data-id="${alertId}">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-slate-900 text-sm">${sector}</h4>
                        <span class="badge badge-blue text-xs lowercase">${frequency}</span>
                    </div>
                    <p class="text-xs text-slate-500 mb-3">${location} • Full-time & Internship</p>
                    <div class="alert-card-footer">
                        <span class="font-medium text-slate-700 text-xs">${channelText}</span>
                        <button type="button" class="btn-clear text-red-600 hover:text-red-700 font-semibold text-xs cursor-pointer btn-delete-alert" data-action="delete-alert" data-id="${alertId}" onclick="deleteAlert(${alertId}, this)">Delete</button>
                    </div>
                  </div>
                `;
              targetElement.insertAdjacentHTML('beforeend', cardHtml);
            });
          }
        } catch (err) {
          console.error('Error loading job alerts:', err);
        }
      };

      // Automatically fetch active alerts on dashboard load
      window.loadAlerts();

      const alertForm = document.getElementById('alert-form');
      if (alertForm && !alertForm.dataset.seekerAlertBound) {
        alertForm.dataset.seekerAlertBound = 'true';
        alertForm.addEventListener('submit', async (e) => {
          e.preventDefault();

          const seekerAuth = getSeekerAuth();
          const sectorEl = document.getElementById('job-sector') || document.getElementById('alert-sector');
          const locationEl = document.getElementById('alert-location') || document.getElementById('job-location');
          const emailEl = document.getElementById('alert-email');

          const job_sector = sectorEl ? sectorEl.value : 'Software & Tech';
          const location = locationEl ? locationEl.value : 'Addis Ababa';
          const email_notification = emailEl ? emailEl.checked : true;

          const submitBtn = alertForm.querySelector('button[type="submit"]');
          const originalBtnText = submitBtn ? submitBtn.textContent : 'Save Alert Preferences';
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
          }

          const headers = { 'Content-Type': 'application/json' };
          if (seekerAuth.token && !seekerAuth.token.includes('cookie')) {
            headers['Authorization'] = `Bearer ${seekerAuth.token}`;
          }

          try {
            let res = await fetch('/api/seeker/alerts', {
              method: 'POST',
              headers: headers,
              credentials: 'include',
              body: JSON.stringify({
                seekerId: seekerAuth.user ? seekerAuth.user.id : undefined,
                job_sector,
                sector: job_sector,
                location,
                email_notification,
                frequency: 'daily'
              })
            });
            if (!res.ok && res.status === 404) {
              res = await fetch('/api/alerts', {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify({
                  seekerId: seekerAuth.user ? seekerAuth.user.id : undefined,
                  job_sector,
                  sector: job_sector,
                  location,
                  email_notification,
                  frequency: 'daily'
                })
              });
            }

            const data = await res.json();
            if (res.ok) {
              showToast(data.message || 'Alert preferences saved!', 'success');
              // Dynamically update UI without page reload
              if (typeof window.loadAlerts === 'function') {
                await window.loadAlerts();
              }
            } else {
              showToast(data.message || 'Error saving alert preferences', 'error');
            }
          } catch (err) {
            console.error('Error saving alert preferences:', err);
            showToast('Network error while saving alert preferences', 'error');
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalBtnText;
            }
          }
        });
      }

      const profileForm = document.getElementById('profile-form');
      if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const saveBtn = profileForm.querySelector('[data-action="save-profile"]');
          if (saveBtn) {
            saveBtn.click();
          }
        });
      }

    } else {
      // Unauthenticated or not job_seeker: show clean empty state instead of dummy content
      if (recommendedJobsGrid) {
        renderRecommendedJobsEmpty('Complete your profile to get personalized job recommendations!');
      }
      if (seekerAppsTable) {
        seekerAppsTable.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-8 text-slate-500">
              <p class="font-medium text-slate-600 mb-1">No applications found.</p>
              <p class="text-xs text-slate-400">Explore jobs and apply to track your applications here!</p>
            </td>
          </tr>
        `;
      }
      if (savedJobsGrid) {
        savedJobsGrid.innerHTML = `
          <div class="col-span-full py-8 text-center text-slate-500">
            <p class="font-medium text-slate-600 mb-1">No saved jobs yet.</p>
            <p class="text-xs text-slate-400">Save jobs while browsing to review and apply to them later.</p>
          </div>
        `;
      }
    }
  }
});

// Global functions for dynamic elements
window.rejectApplication = function (appId, btnElement) {
  if (confirm('Are you sure you want to reject this application?')) {
    const empAuth = typeof getEmployerAuth === 'function' ? getEmployerAuth() : {};
    const token = empAuth.token || localStorage.getItem('employer_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token && !token.includes('cookie')) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    const card = btnElement ? btnElement.closest('.kanban-card') : document.querySelector(`.kanban-card[data-id="${appId}"]`);

    fetch(`/api/applications/${appId}/status`, {
      method: 'PUT',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ status: 'rejected' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Application status updated successfully') {
          showToast('Application rejected', 'info');

          // Smooth fade-out and complete removal from the DOM
          if (card) {
            card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.92) translateY(-8px)';
            card.style.maxHeight = `${card.offsetHeight}px`;

            setTimeout(() => {
              card.style.maxHeight = '0px';
              card.style.paddingTop = '0px';
              card.style.paddingBottom = '0px';
              card.style.marginTop = '0px';
              card.style.marginBottom = '0px';
              card.style.overflow = 'hidden';

              setTimeout(() => {
                card.remove();

                // Check if pending column is now empty
                const pendingColumn = document.getElementById('kanban-pending-col') || document.querySelector('.kanban-cards[data-column="pending"]');
                if (pendingColumn && pendingColumn.querySelectorAll('.kanban-card').length === 0) {
                  pendingColumn.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs italic">No candidates pending review.</div>';
                }

                // Check if hired column is now empty
                const hiredColumn = document.getElementById('kanban-hired-col') || document.querySelector('.kanban-cards[data-column="hired"]');
                if (hiredColumn && hiredColumn.querySelectorAll('.kanban-card').length === 0) {
                  hiredColumn.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs italic">No candidates marked as hired yet.</div>';
                }

                // Update badge counts dynamically
                const pCount = pendingColumn ? pendingColumn.querySelectorAll('.kanban-card').length : 0;
                const hCount = hiredColumn ? hiredColumn.querySelectorAll('.kanban-card').length : 0;

                const totalBadge = document.getElementById('pipeline-total-badge');
                if (totalBadge) totalBadge.textContent = `${pCount + hCount} Candidates`;

                const pendingBadge = document.getElementById('pipeline-pending-badge') ||
                  pendingColumn?.closest('.kanban-col')?.querySelector('.badge');
                if (pendingBadge) pendingBadge.textContent = pCount;

                const hiredBadge = document.getElementById('pipeline-hired-badge') ||
                  hiredColumn?.closest('.kanban-col')?.querySelector('.badge');
                if (hiredBadge) hiredBadge.textContent = hCount;
              }, 300);
            }, 150);
          } else if (typeof window.loadEmployerApplications === 'function') {
            window.loadEmployerApplications();
          }

          if (typeof window.loadEmployerStats === 'function') {
            window.loadEmployerStats();
          }
        } else {
          showToast(data.message || 'Error updating status', 'error');
        }
      })
      .catch(err => {
        console.error('Error rejecting application:', err);
        showToast('Network error', 'error');
      });
  }
};

window.hireApplication = function (appId, btnElement) {
  if (confirm('Are you sure you want to select/hire this candidate?')) {
    const empAuth = typeof getEmployerAuth === 'function' ? getEmployerAuth() : {};
    const token = empAuth.token || localStorage.getItem('employer_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token && !token.includes('cookie')) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    fetch(`/api/applications/${appId}/status`, {
      method: 'PUT',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ status: 'Hired' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Application status updated successfully') {
          showToast('Candidate Hired successfully!', 'success');
          if (typeof window.loadEmployerApplications === 'function') {
            window.loadEmployerApplications();
          }
          if (typeof window.loadEmployerStats === 'function') {
            window.loadEmployerStats();
          }
        } else {
          showToast(data.message || 'Error updating status', 'error');
        }
      })
      .catch(err => showToast('Network error', 'error'));
  }
};

window.deleteAlert = async function (id, btnElement) {
  const seekerAuth = getSeekerAuth();
  if (!seekerAuth.token || !seekerAuth.user) {
    showToast('Please log in as a job seeker first', 'error');
    return false;
  }

  const headers = {};
  if (seekerAuth.token && !seekerAuth.token.includes('cookie')) {
    headers['Authorization'] = `Bearer ${seekerAuth.token}`;
  }

  try {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'DELETE',
      headers: headers,
      credentials: 'include'
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Alert deleted successfully', 'info');

      // Dynamically remove specific alert card from DOM immediately
      const alertCard = document.getElementById(`alert-${id}`) || (btnElement ? btnElement.closest('.alert-card') : null);
      if (alertCard) {
        alertCard.classList.add('alert-card-removing');
        alertCard.style.transition = 'all 0.25s ease';
        alertCard.style.opacity = '0';
        alertCard.style.transform = 'scale(0.95) translateY(-5px)';
        setTimeout(() => {
          alertCard.remove();

          // Update active alerts count dynamically
          const remainingCards = document.querySelectorAll('#active-alerts-container .alert-card, #alerts .alert-card');
          const titleEl = document.getElementById('active-alerts-title') || document.querySelector('#alerts .card:last-child h2');
          if (titleEl) {
            titleEl.textContent = `Active Alerts (${remainingCards.length})`;
          }
          if (remainingCards.length === 0) {
            const container = document.getElementById('active-alerts-container') || document.querySelector('#alerts .card:last-child');
            if (container) {
              container.innerHTML = '<p class="text-slate-500 py-4 text-sm">No active alerts configured.</p>';
            }
          }
        }, 250);
      }
      return true;
    } else {
      showToast(data.message || 'Error deleting alert', 'error');
      return false;
    }
  } catch (err) {
    console.error('Error deleting alert:', err);
    showToast('Network error while deleting alert', 'error');
    return false;
  }
};

// Kanban Drag and Drop Logic
window.setupKanbanDragAndDrop = function () {
  const cards = document.querySelectorAll('.kanban-card');
  const columns = document.querySelectorAll('.kanban-cards');

  cards.forEach(card => {
    card.addEventListener('dragstart', () => {
      card.classList.add('dragging');
      card.style.opacity = '0.5';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      card.style.opacity = '';
    });
  });

  columns.forEach(column => {
    column.addEventListener('dragover', e => {
      e.preventDefault();
      const draggable = document.querySelector('.dragging');
      if (draggable) {
        column.appendChild(draggable);
      }
    });

    column.addEventListener('drop', e => {
      e.preventDefault();
      const draggable = document.querySelector('.dragging');
      if (draggable) {
        const appId = draggable.getAttribute('data-id');
        const newStatus = column.getAttribute('data-column') === 'hired' ? 'Hired' : 'Pending';

        fetch(`/api/applications/${appId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }).then(res => {
          if (res.ok) {
            showToast(`Applicant moved to ${newStatus}`, 'success');
            setTimeout(() => window.location.reload(), 500);
          } else {
            showToast('Failed to move applicant', 'error');
            setTimeout(() => window.location.reload(), 500);
          }
        }).catch(err => showToast('Network error', 'error'));
      }
    });
  });
};


window.applyForJob = function (jId) {
  if (jId) {
    sessionStorage.setItem('pendingApplyJobId', String(jId));
  }
  const seekerAuth = getSeekerAuth();
  const curToken = seekerAuth.token;
  const usr = seekerAuth.user;
  if (!curToken || !usr) {
    showToast('Please login as a job seeker to apply for jobs', 'error');
    setTimeout(() => {
      const loginModal = document.getElementById('login-modal');
      if (loginModal) {
        if (typeof window.setAuthModalMode === 'function') {
          window.setAuthModalMode('seeker.html', false);
        } else {
          loginRedirectUrl = 'seeker.html';
          isRegisterMode = false;
          registerStep = 1;
          if (typeof updateAuthModalUI === 'function') {
            try {
              updateAuthModalUI();
            } catch (e) { }
          }
        }
        if (typeof window.openModal === 'function') {
          window.openModal('login-modal');
        } else {
          loginModal.classList.add('active');
          loginModal.classList.remove('hidden');
        }
      } else {
        window.location.href = 'index.html?login=seeker';
      }
    }, 2000);
    return;
  }
  if (usr.role !== 'job_seeker') {
    showToast('Only job seekers can apply for jobs', 'error');
    return;
  }
  sessionStorage.removeItem('pendingApplyJobId');

  const authHeaders = { 'Content-Type': 'application/json' };
  if (curToken && !curToken.includes('cookie')) {
    authHeaders['Authorization'] = `Bearer ${curToken}`;
  }

  // Check if already applied
  fetch(`/api/applications/seeker/${usr.id}`, { headers: authHeaders, credentials: 'include' })
    .then(res => res.json())
    .then(apps => {
      const alreadyApplied = Array.isArray(apps) && apps.some(app => app.job_id == jId);
      if (alreadyApplied) {
        showToast('You have already applied for this job', 'info');
        return;
      }

      // Inject modal dynamically if it doesn't exist
      let applyModal = document.getElementById('apply-modal');
      if (!applyModal) {
        applyModal = document.createElement('div');
        applyModal.id = 'apply-modal';
        applyModal.className = 'modal-overlay hidden';
        applyModal.innerHTML = `
          <div class="modal-content" style="max-width: 480px; text-align: left; padding: 1.75rem;">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xl font-bold text-slate-900" style="margin: 0;">Submit Application</h3>
              <button type="button" class="btn-clear text-slate-400 hover:text-slate-700" id="apply-modal-close-x" style="font-size: 1.5rem; line-height: 1; cursor: pointer;">&times;</button>
            </div>
            <p class="text-xs text-slate-500 mb-4">Your saved resume and profile information will be delivered directly to the employer's applicant pipeline.</p>
            
            <div class="form-group mb-4">
              <label for="apply-message-input" class="form-label text-xs font-semibold text-slate-700 mb-1.5 block">
                Short Message / Cover Note <span class="text-slate-400 font-normal">(Optional)</span>:
              </label>
              <textarea id="apply-message-input" class="form-input text-sm w-full" rows="3" placeholder="Introduce yourself or highlight relevant experience for this role..."></textarea>
            </div>

            <div class="flex gap-3 justify-end items-center pt-3 border-t border-slate-100">
              <button id="apply-cancel-btn" class="btn btn-outline px-5 text-sm">Cancel</button>
              <button id="apply-confirm-btn" class="btn btn-primary px-6 text-sm">Submit Application</button>
            </div>
          </div>
        `;
        document.body.appendChild(applyModal);

        // Click outside modal dialog to dismiss
        applyModal.addEventListener('click', (e) => {
          if (e.target === applyModal) {
            applyModal.classList.remove('active');
            applyModal.classList.add('hidden');
          }
        });
      }

      const msgInput = document.getElementById('apply-message-input');
      if (msgInput) msgInput.value = '';

      applyModal.classList.remove('hidden');
      applyModal.classList.add('active');

      const cancelBtn = document.getElementById('apply-cancel-btn');
      const confirmBtn = document.getElementById('apply-confirm-btn');
      const closeXBtn = document.getElementById('apply-modal-close-x');

      if (closeXBtn) {
        closeXBtn.onclick = () => {
          applyModal.classList.remove('active');
          applyModal.classList.add('hidden');
        };
      }

      if (cancelBtn && confirmBtn) {
        // Clone to remove old event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newCancelBtn.addEventListener('click', () => {
          applyModal.classList.remove('active');
          applyModal.classList.add('hidden');
        });

        newConfirmBtn.addEventListener('click', () => {
          newConfirmBtn.disabled = true;
          newConfirmBtn.textContent = 'Submitting...';

          const messageVal = (document.getElementById('apply-message-input')?.value || '').trim();

          fetch('/api/applications/apply', {
            method: 'POST',
            headers: authHeaders,
            credentials: 'include',
            body: JSON.stringify({ job_id: jId, seeker_id: usr.id, message: messageVal })
          }).then(res => res.json()).then(data => {
            applyModal.classList.remove('active');
            applyModal.classList.add('hidden');
            newConfirmBtn.disabled = false;
            newConfirmBtn.textContent = 'Submit Application';

            if (data.message === 'Application submitted successfully') {
              showToast('Successfully applied!', 'success');
              setTimeout(() => window.location.reload(), 1000);
            } else {
              showToast(data.message || 'Error applying', 'error');
            }
          }).catch(err => {
            applyModal.classList.remove('active');
            applyModal.classList.add('hidden');
            newConfirmBtn.disabled = false;
            newConfirmBtn.textContent = 'Submit Application';
            showToast('Network error', 'error');
          });
        });
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Error checking application status', 'error');
    });
};

window.withdrawApplication = function (appId, btnElement) {
  if (confirm('Are you sure you want to withdraw this application?')) {
    const seekerAuth = getSeekerAuth();
    const authHeaders = {};
    if (seekerAuth.token && !seekerAuth.token.includes('cookie')) {
      authHeaders['Authorization'] = `Bearer ${seekerAuth.token}`;
    }
    fetch(`/api/applications/${appId}`, { method: 'DELETE', headers: authHeaders, credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Application withdrawn successfully') {
          showToast('Application withdrawn', 'success');
          const row = btnElement.closest('tr');
          if (row) row.remove();
        } else {
          showToast(data.message || 'Error withdrawing', 'error');
        }
      })
      .catch(err => showToast('Network error', 'error'));
  }
};

window.updateJobBookmarkVisualState = function (jobId, isSaved) {
  const numJobId = Number(jobId);
  if (!window.userSavedJobIds) window.userSavedJobIds = new Set();
  if (isSaved) {
    window.userSavedJobIds.add(numJobId);
  } else {
    window.userSavedJobIds.delete(numJobId);
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const filledColor = isDark ? 'var(--text-color, #ffffff)' : '#000000';

  // Toggle every button matching this jobId
  document.querySelectorAll(`.btn-save-job[data-job-id="${numJobId}"], [data-action="save-job"][data-job-id="${numJobId}"], button[onclick*="toggleSaveJob(${numJobId}"]`).forEach(btn => {
    const icon = btn.querySelector('.bookmark-icon, i, svg');
    if (isSaved) {
      btn.classList.add('saved');
      btn.title = 'Remove from saved';
      if (icon) {
        if (icon.tagName === 'I') {
          icon.className = 'fa-solid fa-bookmark bookmark-icon';
          icon.style.color = filledColor;
        } else {
          btn.innerHTML = `<i class="fa-solid fa-bookmark bookmark-icon" style="color: ${filledColor};"></i>`;
        }
      }
    } else {
      btn.classList.remove('saved');
      btn.title = 'Save Job';
      if (icon) {
        if (icon.tagName === 'I') {
          icon.className = 'fa-regular fa-bookmark bookmark-icon';
          icon.style.color = '';
        } else {
          btn.innerHTML = `<i class="fa-regular fa-bookmark bookmark-icon"></i>`;
        }
      }
    }
  });

  // Also update #btn-save on job-details.html if viewing this job
  const detailBtnSave = document.getElementById('btn-save');
  if (detailBtnSave) {
    const urlParams = new URLSearchParams(window.location.search);
    const currentJobId = Number(urlParams.get('id'));
    if (currentJobId === numJobId) {
      if (isSaved) {
        detailBtnSave.classList.add('saved');
        detailBtnSave.innerHTML = `<i class="fa-solid fa-bookmark bookmark-icon mr-2" style="color: ${filledColor};"></i> Saved`;
      } else {
        detailBtnSave.classList.remove('saved');
        detailBtnSave.innerHTML = `<i class="fa-regular fa-bookmark bookmark-icon mr-2"></i> Save Job`;
      }
    }
  }
};

window.saveJob = async function (jobId, btnElement) {
  // Correct Token Injection: Dynamically retrieve getSeekerAuth().token right before request
  const seekerAuth = getSeekerAuth();
  const curToken = seekerAuth ? seekerAuth.token : null;
  const usr = seekerAuth ? seekerAuth.user : null;

  if (!curToken || !usr) {
    showToast('Please log in as a job seeker to save jobs', 'warning');
    if (typeof window.promptSeekerLogin === 'function') {
      window.promptSeekerLogin();
    } else {
      const loginModal = document.getElementById('login-modal');
      if (loginModal) {
        loginModal.classList.add('active');
        loginModal.classList.remove('hidden');
      }
    }
    return false;
  }

  if (usr.role !== 'job_seeker') {
    showToast('Only job seekers can save jobs', 'error');
    return false;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${curToken}`
  };

  try {
    const res = await fetch('/api/jobs/saved', {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ job_id: Number(jobId), seeker_id: usr.id })
    });

    // Graceful Expiration Handling (Frontend): Catch 401 or 403 response
    if (res.status === 401 || res.status === 403) {
      if (typeof window.handleSeekerSessionExpired === 'function') {
        window.handleSeekerSessionExpired('Your session has expired. Please log in again to save jobs.');
      } else {
        clearSeekerAuth();
        showToast('Your session has expired. Please log in again to save jobs.', 'warning');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
          loginModal.classList.add('active');
          loginModal.classList.remove('hidden');
        } else {
          setTimeout(() => { window.location.href = 'index.html?login=seeker'; }, 800);
        }
      }
      return false;
    }

    const data = await res.json();
    if (res.ok) {
      window.updateJobBookmarkVisualState(jobId, true);
      showToast(data.message || 'Job saved successfully', 'success');
      return true;
    } else {
      if (data.message && (data.message.toLowerCase().includes('token') || data.message.toLowerCase().includes('expired'))) {
        if (typeof window.handleSeekerSessionExpired === 'function') {
          window.handleSeekerSessionExpired('Your session has expired. Please log in again to save jobs.');
        }
        return false;
      }
      showToast(data.message || 'Error saving job', 'error');
      return false;
    }
  } catch (err) {
    console.error('Error saving job:', err);
    showToast('Network error saving job', 'error');
    return false;
  }
};

window.unsaveJob = async function (jobId, btnElement) {
  // Dynamically retrieve seeker token and user right before request
  const seekerAuth = getSeekerAuth();
  const curToken = seekerAuth ? seekerAuth.token : null;
  const usr = seekerAuth ? seekerAuth.user : null;

  if (!curToken || !usr) {
    showToast('Please log in as a job seeker first', 'warning');
    if (typeof window.promptSeekerLogin === 'function') {
      window.promptSeekerLogin();
    }
    return false;
  }

  const headers = {
    'Authorization': `Bearer ${curToken}`
  };

  try {
    const res = await fetch(`/api/jobs/saved/${jobId}`, {
      method: 'DELETE',
      headers: headers,
      credentials: 'include'
    });

    if (res.status === 401 || res.status === 403) {
      if (typeof window.handleSeekerSessionExpired === 'function') {
        window.handleSeekerSessionExpired('Your session has expired. Please log in again to save jobs.');
      } else {
        clearSeekerAuth();
        showToast('Your session has expired. Please log in again to save jobs.', 'warning');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
          loginModal.classList.add('active');
          loginModal.classList.remove('hidden');
        } else {
          setTimeout(() => { window.location.href = 'index.html?login=seeker'; }, 800);
        }
      }
      return false;
    }

    const data = await res.json();
    if (res.ok) {
      window.updateJobBookmarkVisualState(jobId, false);
      showToast(data.message || 'Job removed from saved list', 'info');

      // Check if the user is actively managing the Saved Jobs tab in the Seeker Dashboard
      const isSavedJobsContext = Boolean(btnElement && btnElement.closest('#saved-jobs'));

      if (isSavedJobsContext) {
        // Dynamically remove specific job card from DOM ONLY when in Saved Jobs tab
        const card = btnElement.closest('.card') || document.getElementById(`saved-job-${jobId}`);
        if (card) {
          card.classList.add('saved-job-card-removing');
          card.style.opacity = '0';
          card.style.transform = 'scale(0.92) translateY(10px)';
          card.style.transition = 'all 0.3s ease';
          setTimeout(() => {
            card.remove();
            const grid = document.querySelector('#saved-jobs .dashboard-grid');
            if (grid && grid.querySelectorAll('.card').length === 0) {
              grid.innerHTML = '<p class="text-slate-500 py-4">No saved jobs.</p>';
            }
          }, 300);
        }
      } else {
        // When unsaving on homepage or general search, card remains visible in DOM with unfilled bookmark
        // Also cleanly remove from background #saved-jobs grid in the dashboard if loaded
        const backgroundSavedCard = document.querySelector(`#saved-jobs #saved-job-${jobId}`);
        if (backgroundSavedCard) {
          backgroundSavedCard.remove();
          const grid = document.querySelector('#saved-jobs .dashboard-grid');
          if (grid && grid.querySelectorAll('.card').length === 0) {
            grid.innerHTML = '<p class="text-slate-500 py-4">No saved jobs.</p>';
          }
        }
      }
      return true;
    } else {
      if (data.message && (data.message.toLowerCase().includes('token') || data.message.toLowerCase().includes('expired'))) {
        if (typeof window.handleSeekerSessionExpired === 'function') {
          window.handleSeekerSessionExpired('Your session has expired. Please log in again to save jobs.');
        }
        return false;
      }
      showToast(data.message || 'Error removing saved job', 'error');
      return false;
    }
  } catch (err) {
    console.error('Error unsaving job:', err);
    showToast('Network error removing saved job', 'error');
    return false;
  }
};

window.toggleSaveJob = async function (jobId, btnElement) {
  const numJobId = Number(jobId);
  const isCurrentlySaved = (window.userSavedJobIds && window.userSavedJobIds.has(numJobId)) ||
    (btnElement && btnElement.classList.contains('saved'));

  if (isCurrentlySaved) {
    return await window.unsaveJob(numJobId, btnElement);
  } else {
    return await window.saveJob(numJobId, btnElement);
  }
};

// View Candidate Profile
window.viewProfile = function (seekerId) {
  if (!seekerId) {
    showToast('Applicant ID not found.', 'error');
    return;
  }
  showToast('Fetching profile...', 'info');

  const empAuth = (typeof getEmployerAuth === 'function') ? getEmployerAuth() : {};
  const token = empAuth.token ||
    localStorage.getItem('employer_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token');

  const authHeaders = {
    'Accept': 'application/json'
  };
  if (token && !token.includes('cookie')) {
    authHeaders['Authorization'] = 'Bearer ' + token;
  }

  // Fetch candidate profile by ID with full authorization and fallback support
  (async () => {
    let res = await fetch(`/api/employer/candidate/${seekerId}`, {
      headers: authHeaders,
      credentials: 'include'
    });

    if (!res.ok && (res.status === 404 || res.status === 403)) {
      res = await fetch(`/api/seekers/${seekerId}`, {
        headers: authHeaders,
        credentials: 'include'
      });
    }

    if (!res.ok && (res.status === 404 || res.status === 403)) {
      res = await fetch(`/api/seeker/profile/${seekerId}`, {
        headers: authHeaders,
        credentials: 'include'
      });
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data.message || `Failed to fetch candidate profile (${res.status})`;
      throw new Error(errMsg);
    }

    const seeker = data;
    if (seeker) {
      let profileModal = document.getElementById('profile-modal');
      if (!profileModal) {
        profileModal = document.createElement('div');
        profileModal.id = 'profile-modal';
        profileModal.className = 'modal-overlay hidden';
        document.body.appendChild(profileModal);
      }

      // Dynamic fields with graceful fallbacks for null/empty values
      const fullName = (seeker.full_name || seeker.name || 'Candidate').trim();
      const professionalTitle = (seeker.professional_title || seeker.title || 'Job Seeker').trim();
      const email = (seeker.email || 'Not provided').trim();
      const phone = (seeker.phone_number || seeker.phone || 'Not provided').trim();
      const location = (seeker.location || 'Not provided').trim();
      const aboutMe = (seeker.about_me || seeker.about || seeker.bio || 'No bio provided.').trim();
      const cvUrl = (seeker.cv_file || seeker.resume_file_url || seeker.cv_url || '').trim();

      // Generate initials
      let initials = 'U';
      if (fullName && fullName.length >= 2) {
        initials = fullName.substring(0, 2).toUpperCase();
      } else if (fullName && fullName.length === 1) {
        initials = fullName.toUpperCase();
      }

      // Avatar rendering: use photo if uploaded and not default avatar, else fallback initials
      const rawPhoto = (seeker.profile_photo || seeker.profile_photo_url || '').trim();
      const hasCustomPhoto = rawPhoto && !rawPhoto.toLowerCase().includes('default-avatar');

      let avatarHtml = `<div id="candidate-profile-avatar-fallback" class="profile-avatar-circle" style="width: 80px; height: 80px; min-width: 80px; max-width: 80px; min-height: 80px; max-height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; flex-shrink: 0; font-size: 1.75rem; font-weight: bold; background: #1e3a8a; color: #bfdbfe; border: 2px solid rgba(255,255,255,0.12);">${initials}</div>`;
      if (hasCustomPhoto) {
        avatarHtml = `<img id="candidate-profile-avatar-img" src="${rawPhoto}" alt="${fullName}" class="profile-avatar-img" style="width: 80px; height: 80px; min-width: 80px; max-width: 80px; min-height: 80px; max-height: 80px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 10px auto; flex-shrink: 0; border: 2px solid #3b82f6;" onerror="this.outerHTML='<div class=\\'profile-avatar-circle\\' style=\\'width: 80px; height: 80px; min-width: 80px; max-width: 80px; min-height: 80px; max-height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; flex-shrink: 0; font-size: 1.75rem; font-weight: bold; background: #1e3a8a; color: #bfdbfe; border: 2px solid rgba(255,255,255,0.12);\\'>${initials}</div>'" />`;
      }

      // Download CV Button: dynamic href if file exists, or disabled with 'No CV Available'
      let cvHtml = '';
      if (cvUrl && cvUrl !== '#') {
        cvHtml = `
          <a id="candidate-cv-download-btn" href="${cvUrl}" target="_blank" download class="profile-download-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none;">
            <svg width="18" height="18" style="width: 18px; height: 18px; max-width: 18px; max-height: 18px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span>Download CV</span>
          </a>`;
      } else {
        cvHtml = `
          <button id="candidate-cv-download-btn" disabled class="profile-download-btn disabled" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0.6; cursor: not-allowed; background-color: #475569; border-color: #475569; color: #cbd5e1; box-shadow: none; pointer-events: none;" title="No CV Available">
            <svg width="18" height="18" style="width: 18px; height: 18px; max-width: 18px; max-height: 18px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
            <span>No CV Available</span>
          </button>`;
      }

      // Social & Web Links (GitHub, LinkedIn, Portfolio Website)
      const formatSafeUrl = (rawUrl) => {
        if (!rawUrl || typeof rawUrl !== 'string') return null;
        const trimmed = rawUrl.trim();
        if (!trimmed || trimmed === '#' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
          return null;
        }
        return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
      };

      const getDisplayDomain = (fullUrl, defaultName) => {
        try {
          const u = new URL(fullUrl);
          const host = u.hostname.replace(/^www\./, '');
          const path = (u.pathname && u.pathname !== '/') ? u.pathname : '';
          return (host + path).slice(0, 36);
        } catch (e) {
          return defaultName;
        }
      };

      const validGithubUrl = formatSafeUrl(seeker.github_url);
      const validLinkedinUrl = formatSafeUrl(seeker.linkedin_url);
      const validPortfolioUrl = formatSafeUrl(seeker.portfolio_url);

      const hasSocialLinks = Boolean(validGithubUrl || validLinkedinUrl || validPortfolioUrl);
      let socialLinksHtml = '';

      if (hasSocialLinks) {
        const socialItems = [];

        if (validGithubUrl) {
          socialItems.push(`
            <a href="${validGithubUrl}" target="_blank" rel="noopener noreferrer" class="profile-social-item" title="Visit GitHub Profile">
              <div class="profile-social-item-left">
                <div class="profile-social-icon-wrap profile-social-icon-github">
                  <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                </div>
                <div class="profile-social-info">
                  <span class="profile-social-name">GitHub</span>
                  <span class="profile-social-url">${getDisplayDomain(validGithubUrl, 'github.com')}</span>
                </div>
              </div>
              <svg class="profile-social-arrow" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          `);
        }

        if (validLinkedinUrl) {
          socialItems.push(`
            <a href="${validLinkedinUrl}" target="_blank" rel="noopener noreferrer" class="profile-social-item" title="Visit LinkedIn Profile">
              <div class="profile-social-item-left">
                <div class="profile-social-icon-wrap profile-social-icon-linkedin">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </div>
                <div class="profile-social-info">
                  <span class="profile-social-name">LinkedIn</span>
                  <span class="profile-social-url">${getDisplayDomain(validLinkedinUrl, 'linkedin.com')}</span>
                </div>
              </div>
              <svg class="profile-social-arrow" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          `);
        }

        if (validPortfolioUrl) {
          socialItems.push(`
            <a href="${validPortfolioUrl}" target="_blank" rel="noopener noreferrer" class="profile-social-item" title="Visit Portfolio Website">
              <div class="profile-social-item-left">
                <div class="profile-social-icon-wrap profile-social-icon-portfolio">
                  <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                </div>
                <div class="profile-social-info">
                  <span class="profile-social-name">Portfolio Website</span>
                  <span class="profile-social-url">${getDisplayDomain(validPortfolioUrl, 'portfolio website')}</span>
                </div>
              </div>
              <svg class="profile-social-arrow" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          `);
        }

        socialLinksHtml = `
          <div class="profile-modal-card" style="margin-top: 2px;">
            <div class="profile-card-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <svg width="16" height="16" style="width: 16px; height: 16px; flex-shrink: 0; color: #3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: #94a3b8;">SOCIAL & WEB LINKS</span>
            </div>
            <div class="profile-social-links-list">
              ${socialItems.join('')}
            </div>
          </div>
        `;
      }

      profileModal.innerHTML = `
        <div class="modal-content card profile-modal-content">
          <div class="profile-modal-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.15rem; font-weight: 700; color: #ffffff;">
               <svg width="20" height="20" style="width: 20px; height: 20px; max-width: 20px; max-height: 20px; flex-shrink: 0; color: #3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
               <span>Candidate Profile</span>
            </h2>
            <button class="btn-clear text-slate-400 hover:text-white transition-colors" data-action="close-candidate-modal" aria-label="Close modal" style="cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: none; border: none; color: #94a3b8;">
              <svg width="20" height="20" style="width: 20px; height: 20px; max-width: 20px; max-height: 20px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="profile-header-section" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 16px; text-align: center;">
             ${avatarHtml}
             <h3 id="candidate-profile-name" style="font-size: 1.35rem; font-weight: 700; color: #ffffff; margin: 0 0 4px 0; text-align: center;">${fullName}</h3>
             <p id="candidate-profile-title" style="font-size: 0.9rem; font-weight: 500; color: #93c5fd; margin: 0; text-align: center;">${professionalTitle}</p>
          </div>
          
          <div class="profile-modal-body" style="display: flex; flex-direction: column; gap: 14px;">
             <div class="profile-modal-card">
                <div class="profile-card-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <svg width="16" height="16" style="width: 16px; height: 16px; max-width: 16px; max-height: 16px; flex-shrink: 0; color: #3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                  <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: #94a3b8;">Contact Info</span>
                </div>
                <div class="profile-contact-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                   <div class="profile-modal-icon-wrap" style="width: 32px; height: 32px; min-width: 32px; max-width: 32px; min-height: 32px; max-height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; flex-shrink: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);">
                     <svg width="18" height="18" style="width: 18px; height: 18px; max-width: 20px; max-height: 20px; flex-shrink: 0; color: #94a3b8;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                   </div>
                   <span id="candidate-profile-email" class="profile-contact-text" style="font-size: 0.875rem; font-weight: 500; color: #e2e8f0; word-break: break-word; overflow-wrap: anywhere; line-height: 1.4;">${email}</span>
                </div>
                <div class="profile-contact-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                   <div class="profile-modal-icon-wrap" style="width: 32px; height: 32px; min-width: 32px; max-width: 32px; min-height: 32px; max-height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; flex-shrink: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);">
                     <svg width="18" height="18" style="width: 18px; height: 18px; max-width: 20px; max-height: 20px; flex-shrink: 0; color: #94a3b8;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                   </div>
                   <span id="candidate-profile-phone" class="profile-contact-text" style="font-size: 0.875rem; font-weight: 500; color: #e2e8f0; word-break: break-word; overflow-wrap: anywhere; line-height: 1.4;">${phone}</span>
                </div>
                <div class="profile-contact-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 0;">
                   <div class="profile-modal-icon-wrap" style="width: 32px; height: 32px; min-width: 32px; max-width: 32px; min-height: 32px; max-height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; flex-shrink: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);">
                     <svg width="18" height="18" style="width: 18px; height: 18px; max-width: 20px; max-height: 20px; flex-shrink: 0; color: #94a3b8;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                   </div>
                   <span id="candidate-profile-location" class="profile-contact-text" style="font-size: 0.875rem; font-weight: 500; color: #e2e8f0; word-break: break-word; overflow-wrap: anywhere; line-height: 1.4;">${location}</span>
                </div>
             </div>
             
             ${socialLinksHtml}

             <div class="profile-modal-card">
                <div class="profile-card-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <svg width="16" height="16" style="width: 16px; height: 16px; max-width: 16px; max-height: 16px; flex-shrink: 0; color: #3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: #94a3b8;">About</span>
                </div>
                <p id="candidate-profile-about" class="profile-about-text" style="font-size: 0.9rem; line-height: 1.65; color: #cbd5e1; margin: 0; word-break: break-word; overflow-wrap: anywhere;">${aboutMe}</p>
             </div>
             
             <div class="profile-modal-actions" style="margin-top: 6px; width: 100%;">
                ${cvHtml}
             </div>
          </div>
        </div>
      `;

      profileModal.classList.remove('hidden');
      requestAnimationFrame(() => {
        profileModal.classList.add('active');
      });

    } else {
      showToast('Candidate profile details not available.', 'error');
    }
  })().catch(err => {
    console.error('Error fetching candidate profile:', err);
    const msg = (err && err.message) ? err.message : 'Network error while fetching profile.';
    showToast(msg, 'error');
  });
};

// Toast Notification System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  } else if (container.parentNode === document.body) {
    // Keep container at the end of body so it stays above any dynamically added modals
    document.body.appendChild(container);
  }
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '99999';

  const toast = document.createElement('div');
  const typeClass = type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : 'toast-info';

  toast.className = `toast ${typeClass}`;
  toast.style.zIndex = '99999';

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
  } else {
    iconSvg = `<svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  container.appendChild(toast);

  // Animate in
  const animFrame = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : (cb => setTimeout(cb, 16));
  animFrame(() => {
    toast.classList.add('active');
    toast.style.opacity = '1';
  });

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('active');
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

// Tab Switching Logic for Dashboards
function switchTab(tabId) {
  // Hide all tab contents
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => {
    content.classList.remove('active');
    content.classList.add('hidden');
  });

  // Remove active from all tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Show target content
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  // Set clicked tab to active
  const activeBtn = document.querySelector(`.tab[data-target="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  if (tabId === 'saved-jobs') {
    if (typeof window.fetchUserSavedJobs === 'function') {
      window.fetchUserSavedJobs();
    }
  }

  if (tabId === 'alerts') {
    if (typeof window.loadAlerts === 'function') {
      window.loadAlerts();
    }
  }

  if (tabId === 'overview-tab') {
    if (typeof window.loadEmployerStats === 'function') {
      window.loadEmployerStats();
    }
    if (typeof window.loadEmployerApplications === 'function') {
      window.loadEmployerApplications();
    }
  }

  if (tabId === 'manage-jobs-tab') {
    if (typeof window.loadManageJobs === 'function') {
      window.loadManageJobs();
    }
  }

  if (tabId === 'post-job-tab') {
    if (typeof window.loadFreemiumStatus === 'function') {
      window.loadFreemiumStatus();
    }
  }

  if (tabId === 'employer-profile-tab') {
    const empAuth = typeof getEmployerAuth === 'function' ? getEmployerAuth() : {};
    if (empAuth && empAuth.user && typeof populateDashboardUserData === 'function') {
      populateDashboardUserData(empAuth.user);
    }
  }

  if (tabId === 'notifications-tab') {
    if (typeof window.loadEmployerNotifications === 'function') {
      window.loadEmployerNotifications();
    }
  }
}
window.switchTab = switchTab;



// Global delegated click listener for Tab Switching
document.addEventListener('click', (e) => {
  const tabEl = e.target.closest('.tab, [data-action="switch-tab"]');
  if (tabEl) {
    const targetId = tabEl.getAttribute('data-target') || tabEl.dataset.target;
    if (targetId && typeof switchTab === 'function') {
      switchTab(targetId);
    }
  }
});

// Global delegated click listener for Saved Jobs, Bookmark toggles, and Job Alerts
document.addEventListener('click', (e) => {
  const deleteAlertBtn = e.target.closest('.btn-delete-alert, [data-action="delete-alert"]');
  if (deleteAlertBtn && !deleteAlertBtn.hasAttribute('onclick')) {
    e.preventDefault();
    const alertId = deleteAlertBtn.getAttribute('data-id') || deleteAlertBtn.getAttribute('data-target-id');
    if (alertId) {
      window.deleteAlert(alertId, deleteAlertBtn);
    }
    return;
  }

  const unsaveBtn = e.target.closest('.btn-remove-saved, [data-action="unsave-job"]');
  if (unsaveBtn && !unsaveBtn.hasAttribute('onclick')) {
    e.preventDefault();
    const jobId = unsaveBtn.getAttribute('data-job-id') || unsaveBtn.getAttribute('data-target-id');
    if (jobId) {
      window.unsaveJob(jobId, unsaveBtn);
    }
    return;
  }

  const saveBtn = e.target.closest('.btn-save-job, [data-action="save-job"]');
  if (saveBtn && !saveBtn.hasAttribute('onclick') && !saveBtn.classList.contains('btn-remove-saved')) {
    e.preventDefault();
    const jobId = saveBtn.getAttribute('data-job-id') || saveBtn.getAttribute('data-target-id');
    if (jobId) {
      window.toggleSaveJob(jobId, saveBtn);
    }
    return;
  }
});

// --- Footer Resources Authorization Guard ---
// Protects 'Create CV', 'Job Alerts', and 'Saved Jobs' links in the footer
function handleFooterProtectedResourceClick(e) {
  const link = e.target.closest('#footer-create-cv, #footer-job-alerts, #footer-saved-jobs, .footer-protected-link, .footer-links a[data-auth-required="true"]');
  let isProtected = false;
  let resourceType = '';

  if (link) {
    isProtected = true;
    resourceType = link.getAttribute('data-target') || (link.textContent || '').trim().toLowerCase();
  } else {
    const footerLink = e.target.closest('.footer-links a, footer a');
    if (footerLink) {
      const txt = (footerLink.textContent || '').trim().toLowerCase();
      if (txt.includes('create cv') || txt.includes('job alert') || txt.includes('saved job')) {
        isProtected = true;
        resourceType = txt;
      }
    }
  }

  if (!isProtected) return;

  const targetLink = link || e.target.closest('.footer-links a, footer a');
  const text = (targetLink.textContent || '').trim().toLowerCase();

  // Check authentication
  const seekerAuth = typeof getSeekerAuth === 'function' ? getSeekerAuth() : null;
  const activeSess = typeof resolveActiveUserAndRole === 'function' ? resolveActiveUserAndRole() : null;
  const token = (seekerAuth && seekerAuth.token) || (activeSess && activeSess.token);
  const user = (seekerAuth && seekerAuth.user) || (activeSess && activeSess.user);
  const isAuthenticated = !!(token && user);
  const isSeekerRole = !user || !user.role || user.role === 'job_seeker';

  if (!isAuthenticated || !isSeekerRole) {
    e.preventDefault();
    e.stopPropagation();

    const toastMessage = !isAuthenticated
      ? 'Please log in to access this feature'
      : 'Please log in as a job seeker to access this feature';

    if (typeof showToast === 'function') {
      showToast(toastMessage, 'warning');
    }

    let tab = 'applications';
    if (text.includes('cv')) tab = 'cv';
    else if (text.includes('alert')) tab = 'alerts';
    else if (text.includes('saved')) tab = 'saved-jobs';

    const targetUrl = `seeker.html#${tab}`;

    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
      if (typeof updateAuthModalUI === 'function') {
        try {
          isRegisterMode = false;
          registerStep = 1;
          loginRedirectUrl = targetUrl;
          updateAuthModalUI();
        } catch (err) { }
      }
      if (typeof window.openModal === 'function') {
        window.openModal('login-modal');
      } else {
        loginModal.classList.add('active');
        loginModal.classList.remove('hidden');
      }
    } else {
      try {
        sessionStorage.setItem('pendingAuthToast', toastMessage);
        sessionStorage.setItem('loginRedirectUrl', targetUrl);
      } catch (err) { }
      setTimeout(() => {
        window.location.href = `index.html?login=seeker&redirect=${encodeURIComponent(targetUrl)}`;
      }, 100);
    }
    return false;
  } else {
    // Authenticated job seeker: if already on seeker.html, smooth tab switch
    if (window.location.pathname.includes('seeker.html') || (typeof currentPage !== 'undefined' && currentPage === 'seeker.html')) {
      let tab = 'applications';
      if (text.includes('cv')) tab = 'cv';
      else if (text.includes('alert')) tab = 'alerts';
      else if (text.includes('saved')) tab = 'saved-jobs';

      if (typeof switchTab === 'function') {
        e.preventDefault();
        switchTab(tab);
        window.location.hash = tab;
      }
    }
  }
}

// Global delegated listener for footer protected links (capturing phase for instant intercept)
document.addEventListener('click', handleFooterProtectedResourceClick, true);

// Expose and bind direct listeners on DOMContentLoaded
window.initFooterAuthGuards = function () {
  const links = document.querySelectorAll('#footer-create-cv, #footer-job-alerts, #footer-saved-jobs, .footer-protected-link, .footer-links a[data-auth-required="true"]');
  links.forEach(l => {
    l.removeEventListener('click', handleFooterProtectedResourceClick);
    l.addEventListener('click', handleFooterProtectedResourceClick);
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initFooterAuthGuards);
} else {
  window.initFooterAuthGuards();
}

// Function to update job card button to 'Undo Report'
function updateJobCardToReported(jobId) {
  const buttons = document.querySelectorAll(`[data-job-id="${jobId}"]`);
  buttons.forEach(btn => {
    if (btn.getAttribute('data-action') === 'report-job') {
      btn.setAttribute('data-action', 'undo-report');
      btn.className = 'btn btn-outline btn-undo-report ml-1';
      btn.title = 'Undo Report';
      btn.disabled = false;
      btn.style.color = '';
      btn.style.borderColor = '';
      btn.style.opacity = '1';
      btn.innerHTML = `
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l6 6m-6-6l6-6"></path>
                </svg>
                <span>Undo Report</span>
            `;
    }
  });
}

// Function to revert job card button to 'Report'
function updateJobCardToUnreported(jobId) {
  const buttons = document.querySelectorAll(`[data-job-id="${jobId}"]`);
  buttons.forEach(btn => {
    if (btn.getAttribute('data-action') === 'undo-report' || btn.getAttribute('data-action') === 'withdraw-report') {
      btn.setAttribute('data-action', 'report-job');
      btn.className = 'btn btn-outline btn-icon-small btn-report ml-1';
      btn.title = 'Report Job';
      btn.disabled = false;
      btn.style.color = '';
      btn.style.borderColor = '';
      btn.style.opacity = '1';
      btn.innerHTML = `
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path>
                </svg>
            `;
    }
  });
}

// Global function to withdraw/undo report
window.undoReportJob = async function (jobId, triggerBtn) {
  if (!jobId) return;
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.style.opacity = '0.6';
  }

  try {
    const res = await fetch(`/api/reports/${jobId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      updateJobCardToUnreported(jobId);
      if (typeof window.removeReportedJobFromStorage === 'function') {
        window.removeReportedJobFromStorage(jobId);
      }
      if (typeof showToast === 'function') {
        showToast('Report withdrawn successfully.', 'info');
      }
    } else {
      const err = await res.json().catch(() => ({}));
      if (typeof showToast === 'function') {
        showToast(err.message || 'Failed to withdraw report.', 'error');
      }
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.style.opacity = '1';
      }
    }
  } catch (err) {
    console.error('Error withdrawing report:', err);
    if (typeof showToast === 'function') {
      showToast('Network error while withdrawing report.', 'error');
    }
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.style.opacity = '1';
    }
  }
};

// Handle dynamic report job clicks
document.addEventListener('click', async (e) => {
  // 1. Check if Undo Report was clicked
  const undoBtn = e.target.closest('[data-action="undo-report"], [data-action="withdraw-report"]');
  if (undoBtn) {
    e.preventDefault();
    const jobId = undoBtn.getAttribute('data-job-id');
    if (jobId) {
      await window.undoReportJob(jobId, undoBtn);
    }
    return;
  }

  // 2. Check if Report Job was clicked
  const reportBtn = e.target.closest('[data-action="report-job"]');
  if (reportBtn) {
    e.preventDefault();
    const jobId = reportBtn.getAttribute('data-job-id');
    if (!jobId) return;

    let reportModal = document.getElementById('report-job-modal');
    if (!reportModal) {
      reportModal = document.createElement('div');
      reportModal.id = 'report-job-modal';
      reportModal.className = 'modal-overlay hidden';
      reportModal.innerHTML = `
                <div class="modal-content card report-modal-content">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold text-slate-900">Report Job</h2>
                        <button type="button" class="btn-clear text-slate-500" id="close-report-modal">
                            <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <form id="report-job-form">
                        <input type="hidden" id="report-job-id">
                        <div class="form-group">
                            <label class="form-label text-slate-700 font-semibold text-sm">Reason for reporting</label>
                            <textarea id="report-reason" class="form-input text-sm" rows="4" placeholder="Why are you reporting this job? (e.g., Scam, inappropriate content)" required></textarea>
                            <div id="report-word-error" class="text-xs text-red-500 mt-1" style="display: none;">Please provide at least 15 words.</div>
                        </div>
                        <button type="submit" class="btn btn-danger w-full mt-2" id="submit-report-btn" disabled>Submit Report</button>
                    </form>
                </div>
            `;
      document.body.appendChild(reportModal);

      document.getElementById('close-report-modal').addEventListener('click', () => {
        reportModal.classList.remove('active');
        setTimeout(() => reportModal.classList.add('hidden'), 300);
      });

      // Input event listener for word count validation and preventing numbers
      const reportReasonInput = document.getElementById('report-reason');
      const submitReportBtn = document.getElementById('submit-report-btn');
      const reportWordError = document.getElementById('report-word-error');

      reportReasonInput.addEventListener('input', (event) => {
        // Prevent entry of numbers: digits are immediately stripped out
        const stripped = event.target.value.replace(/[0-9]/g, '');
        if (event.target.value !== stripped) {
          event.target.value = stripped;
        }

        // Count words
        const trimmed = event.target.value.trim();
        const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
        const wordCount = words.length;

        // Word count validation: at least 15 words required
        if (wordCount < 15) {
          if (submitReportBtn) submitReportBtn.disabled = true;
          if (reportWordError) {
            reportWordError.textContent = 'Please provide at least 15 words.';
            reportWordError.style.display = 'block';
          }
        } else {
          if (submitReportBtn) submitReportBtn.disabled = false;
          if (reportWordError) {
            reportWordError.style.display = 'none';
          }
        }
      });

      document.getElementById('report-job-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const btn = document.getElementById('submit-report-btn');
        const originalText = btn ? btn.textContent : 'Submit Report';

        const rJobId = document.getElementById('report-job-id').value;
        const reasonInput = document.getElementById('report-reason');
        const reason = reasonInput ? reasonInput.value.trim() : '';

        const words = reason ? reason.split(/\s+/).filter(Boolean) : [];
        if (words.length < 15) {
          if (reportWordError) {
            reportWordError.textContent = 'Please provide at least 15 words.';
            reportWordError.style.display = 'block';
          }
          if (btn) btn.disabled = true;
          return;
        }

        if (btn) {
          btn.textContent = 'Submitting...';
          btn.disabled = true;
        }

        try {
          const res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: rJobId, reason })
          });
          if (res.ok) {
            showToast('Job reported successfully. Admin will review it.', 'success');

            // Dynamically change 'Report' button on that specific job card to 'Undo Report'
            updateJobCardToReported(rJobId);
            if (typeof window.addReportedJobToStorage === 'function') {
              window.addReportedJobToStorage(rJobId);
            }

            reportModal.classList.remove('active');
            setTimeout(() => reportModal.classList.add('hidden'), 300);
            document.getElementById('report-job-form').reset();
            if (submitReportBtn) submitReportBtn.disabled = true;
            if (reportWordError) reportWordError.style.display = 'none';
          } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.message || 'Failed to report job.', 'error');
          }
        } catch (error) {
          console.error('Error reporting job:', error);
          showToast('Network error', 'error');
        } finally {
          if (btn) {
            btn.textContent = originalText;
            const curWords = reasonInput && reasonInput.value.trim() ? reasonInput.value.trim().split(/\s+/).filter(Boolean) : [];
            btn.disabled = curWords.length < 15;
          }
        }
      });
    }

    document.getElementById('report-job-id').value = jobId;
    const reasonInput = document.getElementById('report-reason');
    if (reasonInput) reasonInput.value = '';
    const submitBtn = document.getElementById('submit-report-btn');
    if (submitBtn) submitBtn.disabled = true;
    const wordError = document.getElementById('report-word-error');
    if (wordError) wordError.style.display = 'none';

    reportModal.classList.remove('hidden');
    // Force reflow
    void reportModal.offsetWidth;
    reportModal.classList.add('active');
  }
});


// Password visibility toggle feature
function applyPasswordToggles() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    if (!input || !input.parentElement || !input.parentNode) return;
    if (input.parentElement.classList && input.parentElement.classList.contains('password-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'password-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'block';

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    input.style.paddingRight = '40px';

    const toggleBtn = document.createElement('span');
    toggleBtn.className = 'password-toggle';
    toggleBtn.style.position = 'absolute';
    toggleBtn.style.right = '10px';
    toggleBtn.style.top = '50%';
    toggleBtn.style.transform = 'translateY(-50%)';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.color = '#94a3b8';
    toggleBtn.style.display = 'flex';
    toggleBtn.style.alignItems = 'center';

    toggleBtn.innerHTML = `
            <svg class="eye-open" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg class="eye-closed" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
            </svg>
        `;

    wrapper.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
      const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', type);

      const eyeOpen = toggleBtn.querySelector('.eye-open');
      const eyeClosed = toggleBtn.querySelector('.eye-closed');

      if (type === 'text') {
        if (eyeOpen) eyeOpen.style.display = 'none';
        if (eyeClosed) eyeClosed.style.display = 'block';
      } else {
        if (eyeOpen) eyeOpen.style.display = 'block';
        if (eyeClosed) eyeClosed.style.display = 'none';
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyPasswordToggles);
} else {
  applyPasswordToggles();
}



// --- Manage Jobs Feature (Employer Dashboard) ---
const manageJobsTab = document.getElementById('manage-jobs-tab');
const manageJobsContainer = document.getElementById('manage-jobs-container');
const editJobModal = document.getElementById('edit-job-modal');
const editJobForm = document.getElementById('edit-job-form');

const loadManageJobs = async () => {
  const container = document.getElementById('manage-jobs-container');
  if (!container) return;
  const empAuth = getEmployerAuth();
  if (!empAuth.user) {
    container.innerHTML = '<p class="text-slate-500 py-6 text-center">Please log in to manage your jobs.</p>';
    return;
  }

  try {
    container.innerHTML = '<p class="text-slate-500 py-6 text-center">Loading your jobs...</p>';
    const headers = {};
    if (empAuth.token && !empAuth.token.includes('cookie')) {
      headers['Authorization'] = `Bearer ${empAuth.token}`;
    }
    let response = await fetch('/api/employer/jobs', {
      headers,
      credentials: 'include'
    });

    if (!response.ok && empAuth.user && empAuth.user.id) {
      response = await fetch(`/api/jobs/employer/${empAuth.user.id}`, {
        headers,
        credentials: 'include'
      });
    }

    if (!response.ok) throw new Error('Failed to fetch jobs');
    const jobs = await response.json();

    if (!Array.isArray(jobs) || jobs.length === 0) {
      container.innerHTML = '<p class="text-slate-500 py-6 text-center">You have not posted any jobs yet.</p>';
      return;
    }

    let html = '<div class="flex-col gap-4">';
    jobs.forEach(job => {
      const createdTime = new Date(job.created_at).getTime();
      const updatedTime = new Date(job.updated_at).getTime();
      const isEdited = updatedTime > createdTime + 1000;
      const editedBadge = isEdited ? '<span class="badge badge-slate text-xs ml-2">Edited</span>' : '';

      let formattedDeadline = 'Ongoing';
      if (job.deadline) {
        const d = new Date(job.deadline);
        if (!isNaN(d.getTime())) {
          formattedDeadline = d.toLocaleDateString();
        }
      }

      const isPendingPayment = job.payment_status === 'pending';
      const paymentBadge = isPendingPayment
        ? '<span class="badge badge-amber text-xs ml-2">Pending Payment (300 ETB)</span>'
        : (job.payment_status === 'paid' ? '<span class="badge badge-primary text-xs ml-2">Paid Listing</span>' : '');

      const isClosed = String(job.status || '').toLowerCase() === 'closed';
      const statusBadge = isClosed
        ? '<span class="badge badge-red text-xs font-semibold ml-2"><i class="fa-solid fa-lock mr-1"></i>Closed</span>'
        : '<span class="badge badge-green text-xs font-semibold ml-2"><i class="fa-solid fa-circle-check mr-1"></i>Active</span>';

      const badgeType = typeof getJobTypeBadgeClass === 'function' ? getJobTypeBadgeClass(job.job_type) : 'badge-green';

      const closeOrReopenBtn = isClosed
        ? `<button type="button" class="btn btn-outline btn-sm btn-job-action" data-action="reopen-job" data-job-id="${job.id}" onclick="window.reopenEmployerJob(${job.id})" title="Reopen this job posting to receive applications">
             <svg class="icon-sm inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Reopen
           </button>`
        : `<button type="button" class="btn btn-outline btn-sm btn-job-action text-amber-600 hover:text-amber-700 border-amber-300" data-action="close-posting" data-job-id="${job.id}" onclick="window.closeEmployerJob(${job.id})" title="Close job posting when filled (FR-7)">
             <svg class="icon-sm inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Close Posting
           </button>`;

      html += `
        <div class="card job-manage-card" style="text-align: left;">
          <!-- Header Flexbox: Title and Job Type Badge -->
          <div class="job-manage-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h3 class="job-manage-title text-lg font-bold text-slate-900 m-0" style="margin: 0; text-align: left;">${job.title}</h3>
              ${statusBadge}
              ${editedBadge}
              ${paymentBadge}
            </div>
            <span class="badge ${badgeType} text-xs" style="flex-shrink: 0;">${job.job_type || 'Full-time'}</span>
          </div>

          <!-- Metadata Spacing: Location & Deadline in a flex container with 1rem gap and muted text color -->
          <div class="job-manage-meta" style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 8px; color: #94a3b8; font-size: 0.875rem; text-align: left;">
            <span class="job-manage-meta-item" style="display: inline-flex; align-items: center; gap: 6px;">
              <svg class="icon-sm inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
              <span>${job.location || 'Remote'}</span>
            </span>
            <span class="job-manage-meta-item" style="display: inline-flex; align-items: center; gap: 6px;">
              <svg class="icon-sm inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>Deadline: ${formattedDeadline}</span>
            </span>
          </div>

          <!-- Button Container: Edit & Remove buttons in flex container justified right with border-top -->
          <div class="job-manage-actions" style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; width: 100%; flex-wrap: wrap;">
            ${isPendingPayment ? `
            <button type="button" class="btn btn-primary btn-sm btn-job-action btn-pay-pending-job" data-job-id="${job.id}" data-job-title="${encodeURIComponent(job.title || 'Job Listing')}">
              <svg class="icon-sm inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> Complete Payment (300 ETB)
            </button>
            ` : ''}
            <a href="job-details.html?id=${job.id}" target="_blank" class="btn btn-outline btn-sm btn-job-action">
              <svg class="icon-sm inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> View
            </a>
            ${closeOrReopenBtn}
            <button class="btn btn-outline btn-sm btn-job-action" data-action="open-edit-job" data-job-id="${job.id}">
              <svg class="icon-sm inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Edit
            </button>
            <button class="btn btn-danger btn-sm btn-job-action" data-action="delete-job" data-job-id="${job.id}">
              <svg class="icon-sm inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Remove
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch (e) {
    console.error(e);
    container.innerHTML = '<p class="text-slate-500 py-6 text-center">You have not posted any jobs yet.</p>';
  }
};
window.loadManageJobs = loadManageJobs;

// Delegated click handler for completing payment on pending jobs in Manage Jobs
document.addEventListener('click', async (e) => {
  const payBtn = e.target.closest('.btn-pay-pending-job');
  if (payBtn) {
    e.preventDefault();
    const jobId = payBtn.getAttribute('data-job-id');
    const rawTitle = decodeURIComponent(payBtn.getAttribute('data-job-title') || 'Job Listing');

    if (typeof window.openPaymentMethodModal === 'function') {
      window.openPaymentMethodModal({
        jobTitle: rawTitle,
        onProceed: async (selectedMethod) => {
          const empAuth = getEmployerAuth();
          const token = empAuth.token || '';
          const headers = { 'Content-Type': 'application/json' };
          if (token && !token.includes('cookie')) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          const res = await fetch('/api/payments/initialize', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ jobId, payment_method: selectedMethod })
          });
          const data = await res.json();
          if (!res.ok || !data.checkout_url) {
            throw new Error(data.error || data.message || 'Failed to initialize payment');
          }
          window.location.href = data.checkout_url;
        }
      });
    }
  }
});

if (manageJobsTab || editJobModal || manageJobsContainer) {
  // Load on tab switch
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const target = e.target.closest('.tab')?.dataset?.target;
      if (target === 'manage-jobs-tab') {
        loadManageJobs();
      }
    });
  });

  // Initial load if tab is active by default or manage-jobs-container exists on page
  if (document.querySelector('.tab.active[data-target="manage-jobs-tab"]') || (manageJobsContainer && typeof manageJobsContainer.hasChildNodes === 'function' && !manageJobsContainer.hasChildNodes())) {
    loadManageJobs();
  }

  // Expose delete to window
  window.deleteJob = async (id) => {
    if (confirm('Are you sure you want to delete this job posting?')) {
      try {
        const empAuth = getEmployerAuth();
        const headers = {};
        if (empAuth.token && !empAuth.token.includes('cookie')) {
          headers['Authorization'] = `Bearer ${empAuth.token}`;
        }
        const response = await fetch(`/api/jobs/${id}`, {
          method: 'DELETE',
          headers,
          credentials: 'include'
        });
        if (response.ok) {
          showToast('Job deleted successfully', 'success');
          loadManageJobs();
        } else {
          showToast('Failed to delete job', 'error');
        }
      } catch (e) {
        showToast('Network error', 'error');
      }
    }
  };
  window.deleteEmployerJob = window.deleteJob;

  // FR-7: Employer Job Management - Close a job posting when filled (updating status to 'closed')
  window.closeEmployerJob = async (id) => {
    if (!confirm('Are you sure you want to close this job posting? It will be marked as closed and no longer accept applications.')) return;
    try {
      const empAuth = getEmployerAuth();
      const headers = { 'Content-Type': 'application/json' };
      if (empAuth.token && !empAuth.token.includes('cookie')) {
        headers['Authorization'] = `Bearer ${empAuth.token}`;
      }
      const response = await fetch(`/api/jobs/${id}/close`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ employer_id: empAuth.user?.id })
      });
      if (response.ok) {
        showToast('Job posting closed successfully', 'success');
        if (typeof loadManageJobs === 'function') loadManageJobs();
        if (typeof window.loadEmployerStats === 'function') window.loadEmployerStats();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.message || 'Failed to close job posting', 'error');
      }
    } catch (e) {
      showToast('Network error while closing job', 'error');
    }
  };

  // Reopen a closed job posting
  window.reopenEmployerJob = async (id) => {
    try {
      const empAuth = getEmployerAuth();
      const headers = { 'Content-Type': 'application/json' };
      if (empAuth.token && !empAuth.token.includes('cookie')) {
        headers['Authorization'] = `Bearer ${empAuth.token}`;
      }
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: 'active', employer_id: empAuth.user?.id })
      });
      if (response.ok) {
        showToast('Job posting reopened successfully', 'success');
        if (typeof loadManageJobs === 'function') loadManageJobs();
        if (typeof window.loadEmployerStats === 'function') window.loadEmployerStats();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.message || 'Failed to reopen job posting', 'error');
      }
    } catch (e) {
      showToast('Network error while reopening job', 'error');
    }
  };

  window.loadEmployerJobs = loadManageJobs;

  // Expose close edit modal to window
  const closeEditModal = () => {
    const modal = document.getElementById('edit-job-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('active');
    }
  };
  window.closeEditModal = closeEditModal;

  // Expose edit modal open to window
  window.openEditJobModal = async (id) => {
    try {
      const response = await fetch(`/api/jobs/${id}`);
      if (!response.ok) throw new Error('Failed to fetch job details');
      const job = await response.json();

      const empAuth = getEmployerAuth();
      const user = empAuth.user || {};

      const idInput = document.getElementById('edit-job-id');
      if (idInput) idInput.value = job.id;

      const titleInput = document.getElementById('edit-job-title');
      if (titleInput) titleInput.value = job.title || '';

      const companyInput = document.getElementById('edit-job-company');
      if (companyInput) companyInput.value = job.company_name || '';

      const locationInput = document.getElementById('edit-job-location');
      if (locationInput) locationInput.value = job.location || '';

      const deadlineInput = document.getElementById('edit-job-deadline');
      const today = new Date();
      const localMinDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      let fetchedDeadline = job.deadline ? job.deadline.split('T')[0] : '';
      if (deadlineInput) {
        deadlineInput.value = fetchedDeadline;
        if (localMinDate && fetchedDeadline && fetchedDeadline < localMinDate) {
          deadlineInput.min = fetchedDeadline;
        } else if (localMinDate) {
          deadlineInput.min = localMinDate;
        }
      }

      const salaryInput = document.getElementById('edit-job-salary');
      if (salaryInput) salaryInput.value = job.salary || '';

      const applyEmailInput = document.getElementById('edit-job-apply-email');
      if (applyEmailInput) applyEmailInput.value = job.apply_email || '';

      const applyLinkInput = document.getElementById('edit-job-apply-link');
      if (applyLinkInput) applyLinkInput.value = job.apply_link || '';

      const contactEmailInput = document.getElementById('edit-job-contact-email');
      if (contactEmailInput) contactEmailInput.value = job.contact_email || user.email || '';

      const descInput = document.getElementById('edit-job-description');
      if (descInput) descInput.value = job.description || '';

      const typeInput = document.getElementById('edit-job-type');
      if (typeInput) typeInput.value = job.job_type || 'Full-time';

      const modal = document.getElementById('edit-job-modal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
      }

      // Reset scroll position to top
      const modalBody = document.getElementById('edit-job-modal-body');
      if (modalBody) {
        modalBody.scrollTop = 0;
      }
    } catch (e) {
      console.error('Error loading job details:', e);
      showToast('Error loading job details', 'error');
    }
  };

  // Close & Cancel buttons
  const closeEditBtns = document.querySelectorAll('[data-action="close-edit-modal"], #close-edit-modal-btn, #cancel-edit-job-btn');
  closeEditBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeEditModal();
    });
  });

  // Delegated close listener for all close/cancel buttons & backdrop click
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="close-edit-modal"]') || e.target.closest('#close-edit-modal-btn') || e.target.closest('#cancel-edit-job-btn')) {
      e.preventDefault();
      closeEditModal();
    } else if (e.target.id === 'edit-job-modal') {
      closeEditModal();
    }
  });

  // ESC key listener to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('edit-job-modal');
      if (modal && !modal.classList.contains('hidden')) {
        closeEditModal();
      }
    }
  });

  // Explicit form submit handler for Edit Job
  const editForm = document.getElementById('edit-job-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('edit-job-id')?.value;
      if (!id) {
        alert('Job ID is missing. Please re-open the job to edit.');
        return;
      }

      const submitBtn = document.getElementById('update-job-btn') || document.getElementById('update-job-btn-proxy');
      const originalText = submitBtn ? submitBtn.textContent : 'Update Job';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
      }

      const rawSalary = document.getElementById('edit-job-salary')?.value || '';
      const cleanSalary = rawSalary ? String(rawSalary).replace(/,/g, '').trim() : '';

      const payload = {
        title: document.getElementById('edit-job-title')?.value?.trim() || '',
        company_name: document.getElementById('edit-job-company')?.value?.trim() || '',
        location: document.getElementById('edit-job-location')?.value?.trim() || '',
        deadline: document.getElementById('edit-job-deadline')?.value || '',
        salary: cleanSalary,
        apply_email: document.getElementById('edit-job-apply-email')?.value?.trim() || '',
        apply_link: document.getElementById('edit-job-apply-link')?.value?.trim() || '',
        contact_email: document.getElementById('edit-job-contact-email')?.value?.trim() || '',
        description: document.getElementById('edit-job-description')?.value?.trim() || '',
        job_type: document.getElementById('edit-job-type')?.value || 'Full-time'
      };

      try {
        const empAuth = getEmployerAuth();
        const headers = { 'Content-Type': 'application/json' };
        if (empAuth.token && !empAuth.token.includes('cookie')) {
          headers['Authorization'] = `Bearer ${empAuth.token}`;
        }
        const response = await fetch(`/api/jobs/${id}`, {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          alert('Job updated successfully!');
          showToast('Job updated successfully!', 'success');
          closeEditModal();
          if (typeof loadManageJobs === 'function') {
            loadManageJobs();
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.message || 'Failed to update job';
          alert(errMsg);
          showToast(errMsg, 'error');
        }
      } catch (err) {
        console.error('Update job error:', err);
        alert('Network error while updating job.');
        showToast('Network error while updating', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // Backup trigger for proxy button if clicked directly
  const updateJobProxy = document.getElementById('update-job-btn-proxy');
  if (updateJobProxy && editForm) {
    updateJobProxy.addEventListener('click', () => {
      if (typeof editForm.requestSubmit === 'function') {
        editForm.requestSubmit();
      } else {
        editForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });
  }

  // Delegated event listeners for dynamic action buttons
  document.addEventListener('click', (e) => {
    // Open Edit Job
    const editBtn = e.target.closest('[data-action="open-edit-job"]');
    if (editBtn) {
      e.preventDefault();
      const jobId = editBtn.getAttribute('data-job-id');
      if (jobId && typeof window.openEditJobModal === 'function') {
        window.openEditJobModal(jobId);
      }
    }

    // Delete Job
    const deleteBtn = e.target.closest('[data-action="delete-job"]');
    if (deleteBtn) {
      e.preventDefault();
      const jobId = deleteBtn.getAttribute('data-job-id');
      if (jobId && typeof window.deleteJob === 'function') {
        window.deleteJob(jobId);
      }
    }

    // Close Job Posting (FR-7)
    const closeBtn = e.target.closest('[data-action="close-posting"], [data-action="close-job"]');
    if (closeBtn) {
      e.preventDefault();
      const jobId = closeBtn.getAttribute('data-job-id');
      if (jobId && typeof window.closeEmployerJob === 'function') {
        window.closeEmployerJob(jobId);
      }
    }

    // Reopen Job Posting
    const reopenBtn = e.target.closest('[data-action="reopen-job"]');
    if (reopenBtn) {
      e.preventDefault();
      const jobId = reopenBtn.getAttribute('data-job-id');
      if (jobId && typeof window.reopenEmployerJob === 'function') {
        window.reopenEmployerJob(jobId);
      }
    }

    // Close Candidate Profile Modal
    if (e.target.closest('[data-action="close-candidate-modal"]') || (e.target.id === 'profile-modal' && !e.target.closest('.profile-modal-content'))) {
      const m = document.getElementById('profile-modal');
      if (m) {
        m.classList.remove('active');
        setTimeout(() => m.classList.add('hidden'), 300);
      }
    }
  });
}


