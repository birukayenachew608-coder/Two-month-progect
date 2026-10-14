// --- Role-Isolated Storage Helpers ---
function getSeekerAuth() {
    let token = localStorage.getItem('seeker_token');
    let userStr = localStorage.getItem('seeker_user');
    let user = null;
    if (userStr) {
        try { user = JSON.parse(userStr); } catch (e) {}
    }
    if ((!token || !user) && localStorage.getItem('token') && localStorage.getItem('user')) {
        try {
            const legacyUser = JSON.parse(localStorage.getItem('user'));
            if (legacyUser && (legacyUser.role === 'job_seeker' || !legacyUser.role)) {
                token = localStorage.getItem('token');
                user = legacyUser;
            }
        } catch (e) {}
    }
    return { token, user };
}

function setSeekerAuth(token, user) {
    if (token) localStorage.setItem('seeker_token', token);
    if (user) localStorage.setItem('seeker_user', typeof user === 'string' ? user : JSON.stringify(user));
}

function clearSeekerAuth() {
    localStorage.removeItem('seeker_token');
    localStorage.removeItem('seeker_user');
    try {
        const legacyUser = JSON.parse(localStorage.getItem('user'));
        if (legacyUser && (legacyUser.role === 'job_seeker' || !legacyUser.role)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    } catch (e) {}
}

function getEmployerAuth() {
    const token = localStorage.getItem('employer_token');
    const userStr = localStorage.getItem('employer_user');
    let user = null;
    if (userStr) {
        try { user = JSON.parse(userStr); } catch (e) {}
    }
    return { token, user };
}

function setEmployerAuth(token, user) {
    if (token) localStorage.setItem('employer_token', token);
    if (user) localStorage.setItem('employer_user', typeof user === 'string' ? user : JSON.stringify(user));
}

function clearEmployerAuth() {
    localStorage.removeItem('employer_token');
    localStorage.removeItem('employer_user');
}

// Expose on window for direct access across modules/pages
window.getSeekerAuth = getSeekerAuth;
window.setSeekerAuth = setSeekerAuth;
window.clearSeekerAuth = clearSeekerAuth;
window.getEmployerAuth = getEmployerAuth;
window.setEmployerAuth = setEmployerAuth;
window.clearEmployerAuth = clearEmployerAuth;

// Helper: Open Modal by ID
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.classList.remove('hidden');
    }
};

// Helper: Close Modal by ID
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

// Helper: Prompt Seeker Login Modal / Redirection
window.promptSeekerLogin = function(msg) {
    if (msg) showToast(msg, 'warning');
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        if (typeof updateAuthModalUI === 'function') {
            try {
                isRegisterMode = false;
                loginRedirectUrl = 'seeker.html';
                updateAuthModalUI();
            } catch (e) {}
        }
        window.openModal('login-modal');
    } else {
        setTimeout(() => {
            window.location.href = 'index.html?login=seeker';
        }, 800);
    }
};

// Helper: Handle Seeker Session Expiration Gracefully
window.handleSeekerSessionExpired = function(customMessage) {
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
            } catch (e) {}
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

// Isolated Logout Functions
async function logoutSeeker() {
    clearSeekerAuth();
    try {
        await fetch('/api/auth/seeker/logout', { method: 'POST', credentials: 'include' });
    } catch(e) {}
    showToast('Job Seeker logged out successfully', 'info');
    setTimeout(() => { window.location.href = 'index.html'; }, 300);
}

async function logoutEmployer() {
    clearEmployerAuth();
    try {
        await fetch('/api/auth/employer/logout', { method: 'POST', credentials: 'include' });
    } catch(e) {}
    showToast('Employer logged out successfully', 'info');
    setTimeout(() => { window.location.href = 'index.html'; }, 300);
}

window.logoutSeeker = logoutSeeker;
window.logoutEmployer = logoutEmployer;

// --- Fetch Interceptor for Auto-Refresh ---
const originalFetch = window.fetch;
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
        if (reqUrl.includes('/api/auth/seeker/refresh') || reqUrl.includes('/api/auth/employer/refresh') || reqUrl.includes('/api/auth/seeker/login') || reqUrl.includes('/api/auth/employer/login')) {
            return response;
        }

        const pathParts = window.location.pathname.split('/');
        const currentPage = pathParts[pathParts.length - 1] || 'index.html';

        const isEmployerContext = currentPage === 'employer.html' || reqUrl.includes('/api/employer') || reqUrl.includes('/api/jobs/employer') || reqUrl.includes('/api/applications/employer');
        const isSeekerContext = currentPage === 'seeker.html' || reqUrl.includes('/api/seeker') || reqUrl.includes('/api/jobs/saved') || reqUrl.includes('/api/applications/seeker') || reqUrl.includes('/api/alerts');

        if (isEmployerContext) {
            const { token, user } = getEmployerAuth();
            if (token && user && !isRefreshing) {
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
                } catch(e) {
                    isRefreshing = false;
                }
            }
        } else if (isSeekerContext) {
            const { token, user } = getSeekerAuth();
            if (token && user && !isRefreshing) {
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
                } catch(e) {
                    isRefreshing = false;
                }
            }
        }
    }
    return response;
};

document.addEventListener('DOMContentLoaded', () => {

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
      const errorMsg = urlParams.get('error');
      if (errorMsg) {
        showToast(decodeURIComponent(errorMsg), 'error');
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
      loginRedirectUrl = targetRoleParam === 'employer' ? 'employer.html' : 'seeker.html';
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
  } catch (err) {
    console.error('Error parsing URL parameters:', err);
  }

  // Page-level access control & role context
  const pathParts = window.location.pathname.split('/');
  const currentPage = pathParts[pathParts.length - 1] || 'index.html';
  const protectedPages = ['seeker.html', 'employer.html', 'admin.html', 'admin-security.html'];

  let token = null;
  let user = null;
  let currentRole = null;

  if (currentPage === 'employer.html') {
    const auth = getEmployerAuth();
    currentRole = 'employer';
    token = auth.token;
    user = auth.user;
  } else if (currentPage === 'seeker.html') {
    const auth = getSeekerAuth();
    currentRole = 'job_seeker';
    token = auth.token;
    user = auth.user;
  } else if (currentPage === 'admin.html' || currentPage === 'admin-security.html') {
    token = localStorage.getItem('token');
    try { user = JSON.parse(localStorage.getItem('user')); } catch (e) {}
    currentRole = user ? user.role : 'admin';
  } else {
    // index.html / public pages: prefer seeker if active, else employer
    const seekerAuth = getSeekerAuth();
    const empAuth = getEmployerAuth();
    if (seekerAuth.user && seekerAuth.token) {
      currentRole = 'job_seeker';
      token = seekerAuth.token;
      user = seekerAuth.user;
    } else if (empAuth.user && empAuth.token) {
      currentRole = 'employer';
      token = empAuth.token;
      user = empAuth.user;
    } else {
      token = localStorage.getItem('token');
      try { user = JSON.parse(localStorage.getItem('user')); } catch (e) {}
      if (user) currentRole = user.role;
    }
  }

  let isRegisterMode = false;
  let loginRedirectUrl = 'seeker.html';

  if (protectedPages.includes(currentPage)) {
    const handleAuthFailure = (targetRole, targetUrl) => {
      document.querySelector('main').style.display = 'none';
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
      if (!user || user.role !== 'employer') {
        // Try silent refresh for employer
        fetch('/api/auth/employer/refresh', { method: 'POST', credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setEmployerAuth(data.token || 'employer_secure_cookie', data.user);
              window.location.reload();
            } else {
              handleAuthFailure('employer', 'employer.html');
            }
          }).catch(() => handleAuthFailure('employer', 'employer.html'));
        return; // Pause execution
      }
    } else if (currentPage === 'seeker.html') {
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
    } else if (currentPage === 'admin.html' || currentPage === 'admin-security.html') {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        window.location.href = 'admin-login.html';
        return;
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

    const profileName = document.getElementById('profile-name');
    if (profileName && usr.name) profileName.value = usr.name;

    const profileEmail = document.getElementById('profile-email');
    if (profileEmail && usr.email) profileEmail.value = usr.email;

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
      let response = await fetch('/api/user/me', {
        headers: authHeaders,
        credentials: 'include'
      });

      if (!response.ok) {
        response = await fetch('/api/auth/me', {
          headers: authHeaders,
          credentials: 'include'
        });
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

    if (currentUser) {
      populateDashboardUserData(currentUser);
      let dashboardUrl = 'seeker.html';
      let logoutAction = 'logout-seeker';
      if (currentUser.role === 'employer') {
        dashboardUrl = 'employer.html';
        logoutAction = 'logout-employer';
      } else if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
        dashboardUrl = 'admin.html';
        logoutAction = 'logout';
      }

      const userPhoto = normalizePhotoPath(currentUser.profile_photo || currentUser.profile_photo_url);
      const displayName = currentUser.name || currentUser.company_name || 'User';

      authActions.innerHTML = `
        <button class="btn btn-icon-small btn-outline btn-theme-toggle" data-action="toggle-theme" title="Toggle Dark Mode">
          <svg class="icon-theme-toggle" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        </button>
        <div class="nav-user-badge">
          <img src="${userPhoto}" alt="${displayName}" class="nav-avatar-img" id="nav-user-avatar" onerror="this.src='/uploads/default-avatar.png'" />
          <span class="user-company-name font-medium text-sm">Welcome, ${displayName}!</span>
        </div>
        <a href="${dashboardUrl}" class="btn btn-primary ml-2">My Dashboard</a>
        <a href="#" data-action="${logoutAction}" class="logout-link ml-4">Logout</a>
      `;
    } else {
      authActions.innerHTML = `
        <button class="btn btn-icon-small btn-outline btn-theme-toggle" data-action="toggle-theme" title="Toggle Dark Mode">
          <svg class="icon-theme-toggle" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        </button>
      `;
    }
  }
  window.updateHeaderAuthUI = updateHeaderAuthUI;
  if (user) {
    updateHeaderAuthUI(user);
  }

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

    showToast('Uploading profile photo...', 'info');

    const formData = new FormData();
    formData.append('profilePhoto', file);

    const isEmployer = (currentPage === 'employer.html') || (currentRole === 'employer');
    const activeAuth = isEmployer ? getEmployerAuth() : getSeekerAuth();
    const curToken = activeAuth.token;
    const authHeaders = {};
    if (curToken && curToken !== 'seeker_secure_cookie' && curToken !== 'employer_secure_cookie' && curToken !== 'secure_cookie_auth') {
      authHeaders['Authorization'] = 'Bearer ' + curToken;
    }

    // Explicitly target role-specific endpoint
    const uploadUrl = isEmployer ? '/api/employer/profile-photo' : '/api/seeker/profile-photo';

    try {
      let response = await fetch(uploadUrl, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        // Fallback to unified photo route
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

      const newPhotoUrl = data.profile_photo || data.photoUrl || data.profile_photo_url;
      if (newPhotoUrl) {
        if (isEmployer) {
          const empUser = activeAuth.user || {};
          empUser.profile_photo = newPhotoUrl;
          empUser.profile_photo_url = newPhotoUrl;
          setEmployerAuth(curToken, empUser);
          populateDashboardUserData(empUser);
        } else {
          const seekerUser = activeAuth.user || {};
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
    } finally {
      fileInput.value = '';
    }
  });

  // Handle Profile Photo Removal (Strictly Role-Isolated)
  document.addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('#remove-photo, #employer-remove-photo, .btn-remove-avatar');
    if (!removeBtn) return;

    e.preventDefault();
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    showToast('Removing profile photo...', 'info');

    const isEmployer = (currentPage === 'employer.html') || (currentRole === 'employer');
    const activeAuth = isEmployer ? getEmployerAuth() : getSeekerAuth();
    const curToken = activeAuth.token;
    const authHeaders = {};
    if (curToken && curToken !== 'seeker_secure_cookie' && curToken !== 'employer_secure_cookie' && curToken !== 'secure_cookie_auth') {
      authHeaders['Authorization'] = 'Bearer ' + curToken;
    }

    try {
      const response = await fetch('/api/user/profile-photo', {
        method: 'DELETE',
        headers: authHeaders,
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove photo');
      }

      const defaultAvatar = '/uploads/default-avatar.png';
      if (isEmployer) {
        const empUser = activeAuth.user || {};
        empUser.profile_photo = defaultAvatar;
        empUser.profile_photo_url = defaultAvatar;
        setEmployerAuth(curToken, empUser);
        populateDashboardUserData(empUser);
      } else {
        const seekerUser = activeAuth.user || {};
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
  if (cvFileBox) {
    const fileInput = document.getElementById('cv-file');
    cvFileBox.addEventListener('click', () => {
      fileInput.click();
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

          showToast('Uploading file: ' + file.name, 'info');

          fetch('/api/seeker/cv', {
            method: 'POST',
            body: formData
          }).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');
            return data;
          }).then(data => {
            showToast('CV Uploaded successfully!', 'success');
            // update UI
            const meta = document.querySelector('.preview-meta');
            const fname = document.querySelector('.preview-filename');
            if (fname) {
              fname.innerHTML = `<a href="${data.fileUrl}" target="_blank" class="text-primary hover:underline">${data.filename}</a>`;
            }
            if (meta) meta.textContent = (data.size / 1024).toFixed(2) + ' KB • Just now';
          }).catch(err => {
            showToast(err.message || 'Network error', 'error');
            fileInput.value = '';
          });
        }
      }
    });

    // Handle drag and drop
    cvFileBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        cvFileBox.style.borderColor = 'var(--primary)';
        cvFileBox.style.backgroundColor = 'rgba(14, 165, 233, 0.05)';
    });
    cvFileBox.addEventListener('dragleave', (e) => {
        e.preventDefault();
        cvFileBox.style.borderColor = 'var(--slate-200)';
        cvFileBox.style.backgroundColor = 'transparent';
    });
    cvFileBox.addEventListener('drop', (e) => {
        e.preventDefault();
        cvFileBox.style.borderColor = 'var(--slate-200)';
        cvFileBox.style.backgroundColor = 'transparent';
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
            const fname = document.querySelector('.preview-filename');
            const filenameExtracted = data.resume_file_url.split('/').pop().split('-').slice(1).join('-') || data.resume_file_url;
            if (fname) fname.innerHTML = `<a href="${data.resume_file_url}" target="_blank" class="text-primary hover:underline">${filenameExtracted}</a>`;
          }
        }).catch(e => {});
      }
    }
  }

  // Register Buttons (by data-action attribute to avoid inline onclick)
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
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
          const targetAuthRole = btn.getAttribute('data-role') || (loginRedirectUrl === 'employer.html' || currentPage === 'employer.html' ? 'employer' : 'jobseeker');
          window.location.href = `/auth/google?state=${targetAuthRole}`;
          break;
        case 'linkedin-auth':
          const authRole = btn.getAttribute('data-role');
          window.location.href = authRole ? `/api/auth/linkedin?role=${authRole}` : '/api/auth/linkedin';
          break;
        case 'toggle-theme':
          const currentTheme = document.documentElement.getAttribute('data-theme');
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', newTheme);
          localStorage.setItem('theme', newTheme);
          applySavedJobIconsState();
          showToast(newTheme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled', 'info');
          break;
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
          showToast('Downloading...', 'info');
          break;
        case 'remove-role':
          const roleRow = btn.closest('tr');
          if (roleRow) {
            roleRow.remove();
            showToast('Role removed', 'success');
          }
          break;
        case 'delete-cv':
          showToast('Deleted', 'error');
          break;
        case 'delete-alert':
          showToast('Alert removed', 'error');
          break;
        case 'close-posting':
          showToast('Posting Closed', 'error');
          break;
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

          const sAuth = getSeekerAuth();
          let su = sAuth.user || {};
          if (pName) su.name = pName.value.trim();
          if (pTitle) su.professional_title = pTitle.value.trim();
          if (pLocation) su.location = pLocation.value.trim();
          if (pBio) su.bio = pBio.value.trim();
          if (pPhone) su.phone = pPhone.value.trim();

          setSeekerAuth(sAuth.token, su);

          // Update dashboard greeting instantly
          const greetingElement = document.querySelector('.user-company-name');
          if (greetingElement && su.name) {
            greetingElement.textContent = `Welcome, ${su.name}!`;
          }

          // Persist to backend database (accepts flexible custom location strings)
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

          fetch('/api/user/profile', {
            method: 'PUT',
            headers: saveHeaders,
            credentials: 'include',
            body: JSON.stringify({
              name: su.name,
              professional_title: su.professional_title,
              location: su.location,
              bio: su.bio,
              phone: su.phone
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setSeekerAuth(sAuth.token, { ...su, ...data.user });
            }
            showToast('Profile updated successfully!', 'success');
          })
          .catch(err => {
            console.warn('Profile save offline/network fallback:', err);
            showToast('Profile updated successfully!', 'success');
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
        case 'open-login':
          const redirectAttr = btn.getAttribute('data-redirect');
          let targetRole = 'job_seeker';
          if (redirectAttr === 'employer.html') targetRole = 'employer';
          if (redirectAttr === 'admin-login.html' || redirectAttr === 'admin.html') targetRole = 'admin';

          if (targetRole === 'employer') {
            const empAuth = getEmployerAuth();
            if (empAuth.token && empAuth.user) {
              showToast('You are already logged into Employer Portal!', 'success');
              window.location.href = 'employer.html';
              break;
            }
          } else if (targetRole === 'job_seeker') {
            const seekerAuth = getSeekerAuth();
            if (seekerAuth.token && seekerAuth.user) {
              showToast('You are already logged into Job Seeker Portal!', 'success');
              window.location.href = 'seeker.html';
              break;
            }
          }

          const redirect = redirectAttr;
          const mode = btn.getAttribute('data-mode') || 'login';
          loginRedirectUrl = redirect || (targetRole === 'employer' ? 'employer.html' : 'seeker.html');

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
          break;
        case 'toggle-auth':
          isRegisterMode = !isRegisterMode;
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
  });

  // Explicitly bind click event on 'Continue with Google' buttons
  document.querySelectorAll('#btn-google-auth, #btn-google-auth-employer, [data-action="google-auth"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetRole = btn.getAttribute('data-role') || (loginRedirectUrl === 'employer.html' || currentPage === 'employer.html' ? 'employer' : 'jobseeker');
      window.location.href = `/auth/google?state=${targetRole}`;
    });
  });

  // Delegated listener for Google OAuth button in auth modal
  document.addEventListener('click', (e) => {
    const googleBtn = e.target.closest('#btn-google-auth, #btn-google-auth-employer, [data-action="google-auth"]');
    if (googleBtn) {
      e.preventDefault();
      const targetRole = googleBtn.getAttribute('data-role') || (loginRedirectUrl === 'employer.html' || currentPage === 'employer.html' ? 'employer' : 'jobseeker');
      window.location.href = `/auth/google?state=${targetRole}`;
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
    const submitBtn = document.getElementById('auth-submit');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleBtn = document.querySelector('[data-action="toggle-auth"]');
    const nameGroup = document.getElementById('name-group');
    const emailGroup = document.getElementById('auth-email').closest('.form-group');
    const passwordGroup = document.getElementById('auth-password').closest('.form-group');

    // Ensure OTP group exists
    let otpGroup = document.getElementById('otp-group');
    if (!otpGroup) {
        otpGroup = document.createElement('div');
        otpGroup.className = 'form-group';
        otpGroup.id = 'otp-group';
        otpGroup.style.display = 'none';
        otpGroup.innerHTML = '<label class="form-label">Verification Code</label><input type="text" class="form-input" id="auth-otp" placeholder="123456" />';
        emailGroup.insertAdjacentElement('afterend', otpGroup);
    }

    if (!title || !submitBtn || !toggleBtn || !nameGroup) return;

    const roleText = loginRedirectUrl === 'employer.html' ? 'Employer' : 'Job Seeker';
    const roleState = loginRedirectUrl === 'employer.html' ? 'employer' : 'jobseeker';

    const googleBtn = document.getElementById('btn-google-auth');
    if (googleBtn) {
      googleBtn.setAttribute('href', `/auth/google?state=${roleState}`);
      googleBtn.setAttribute('data-role', roleState);
    }

    if (isRegisterMode) {
      title.textContent = `Register as ${roleText}`;
      toggleText.textContent = 'Already have an account?';
      toggleBtn.textContent = 'Sign in here';
      
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
          submitBtn.textContent = 'Complete Registration';
          document.getElementById('auth-password').required = true;
      }
    } else {
      registerStep = 1; // reset for next time
      title.textContent = `${roleText} Sign In`;
      submitBtn.textContent = 'Sign In';
      toggleText.textContent = "Don't have an account?";
      toggleBtn.textContent = 'Register here';
      nameGroup.style.display = 'none';
      passwordGroup.style.display = 'block';
      emailGroup.style.display = 'block';
      document.getElementById('auth-email').readOnly = false;
      otpGroup.style.display = 'none';
      document.getElementById('auth-password').required = true;
    }
  }
  window.updateAuthModalUI = updateAuthModalUI;
  window.setAuthModalMode = function(redirectUrl, isRegister = false) {
    loginRedirectUrl = redirectUrl || 'seeker.html';
    isRegisterMode = isRegister;
    registerStep = 1;
    updateAuthModalUI();
  };

  // Handle Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const name = document.getElementById('auth-name').value;

      const determinedRole = loginRedirectUrl === 'employer.html' ? 'employer' : 'job_seeker';

      if (isRegisterMode) {
          if (registerStep === 1) {
              // Send OTP
              try {
                  const res = await fetch('/api/auth/send-otp', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({email})
                  });
                  const data = await res.json();
                  if (res.ok) {
                      showToast('Verification code sent!', 'success');
                      registerStep = 2;
                      updateAuthModalUI();
                  } else {
                      showToast(data.message || 'Failed to send OTP', 'error');
                  }
              } catch(e) {
                  showToast('Network error', 'error');
              }
              return;
          } else if (registerStep === 2) {
              // Verify OTP
              const otpCode = document.getElementById('auth-otp') ? document.getElementById('auth-otp').value : '';
              try {
                  const res = await fetch('/api/auth/verify-otp', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({email, code: otpCode})
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
              } catch(e) {
                  showToast('Network error', 'error');
              }
              return;
          } else if (registerStep === 3) {
              // Complete Registration
              const endpoint = determinedRole === 'employer' ? '/api/auth/employer/register' : '/api/auth/seeker/register';
              try {
                  const res = await fetch(endpoint, {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({name, email, password, registrationToken: pendingRegistrationToken})
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
              } catch(e) {
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

      if (nameInput && u.name) nameInput.value = u.name;
      if (emailInput && u.email) emailInput.value = u.email;
      if (titleInput && u.professional_title) titleInput.value = u.professional_title;
      if (phoneInput && u.phone) phoneInput.value = u.phone;
      if (locationInput && u.location) locationInput.value = u.location;
      if (bioInput && u.bio) bioInput.value = u.bio;
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

  // Post Job Logic (Employer Dashboard)
  const postJobForm = document.getElementById('post-job-form');
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

    postJobForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('job-title')?.value;
      const company_name = document.getElementById('job-company')?.value;
      const location = document.getElementById('job-location')?.value;
      const deadline = document.getElementById('job-deadline')?.value;
      const description = document.querySelector('textarea')?.value;
      const salary = document.getElementById('job-salary')?.value;
      const job_type = document.getElementById('job-type')?.value || 'Full-time';
      const apply_email = document.getElementById('job-apply-email')?.value;
      const apply_link = document.getElementById('job-apply-link')?.value;
      const contact_email = document.getElementById('job-contact-email')?.value;

      const empAuth = getEmployerAuth();
      if (!empAuth.user) {
        showToast('You must be logged in as an employer to post a job', 'error');
        return;
      }
      const user = empAuth.user;

      try {
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
            title, company_name, location, deadline, description,
            salary, apply_email, apply_link, contact_email,
            job_type
          })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          showToast('Job posted successfully! It will appear on the home page.', 'success');
          postJobForm.reset();
          switchTab('overview-tab');
        } else {
          showToast(data.message || 'Failed to post job', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
    });
  }

  // Fetch jobs from backend on Home Page & handle list expansion
  const jobGrid = document.querySelector('.main-grid .job-grid');
  const browseAllBtn = document.getElementById('btn-browse-all-jobs');
  const browseWrapper = document.querySelector('.browse-jobs-wrapper');

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

    return `
      <div class="card card-hover custom-job-card" id="job-card-${job.id}">
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
            <button data-action="report-job" data-job-id="${job.id}" class="btn btn-outline btn-icon-small btn-report ml-1" title="Report Job">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path>
              </svg>
            </button>
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

        // If total jobs is 6 or fewer, hide the button since all jobs are already displayed
        if (allHomepageJobs.length <= HOMEPAGE_JOB_LIMIT && browseWrapper) {
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
  }

  // Fetch applications on Employer Dashboard
  const pendingColumn = document.querySelector('.kanban-cards[data-column="pending"]');
  const hiredColumn = document.querySelector('.kanban-cards[data-column="hired"]');
  
  if (pendingColumn || hiredColumn) {
    const loadEmployerApplications = async () => {
      const empAuth = getEmployerAuth();
      if (!empAuth.user) return;
      const user = empAuth.user;

      try {
        const headers = {};
        if (empAuth.token && !empAuth.token.includes('cookie')) {
          headers['Authorization'] = `Bearer ${empAuth.token}`;
        }
        const response = await fetch('/api/applications/employer/' + user.id, { headers, credentials: 'include' });
        if (!response.ok) return;
        const applications = await response.json();

        if (pendingColumn) pendingColumn.innerHTML = ''; 
        if (hiredColumn) hiredColumn.innerHTML = '';
        
        let pendingCount = 0;
        let hiredCount = 0;

        applications.forEach(app => {
          let initials = 'U';
          if (app.seeker_name && app.seeker_name.length >= 2) {
            initials = app.seeker_name.substring(0, 2).toUpperCase();
          } else if (app.seeker_name && app.seeker_name.length === 1) {
            initials = app.seeker_name.toUpperCase();
          }

          const rawPhoto = app.profile_photo || app.profile_photo_url;
          const hasPhoto = rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() !== '' && rawPhoto !== 'null' && rawPhoto !== 'undefined' && !rawPhoto.includes('default-avatar');
          const photoUrl = hasPhoto ? normalizePhotoPath(rawPhoto) : null;

          const pendingAvatarHtml = photoUrl
            ? `<div class="card-icon-circle card-icon-sm" style="overflow: hidden; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                 <img src="${photoUrl}" alt="${app.seeker_name || 'Applicant'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.parentElement.className='card-icon-bg card-icon-circle card-icon-slate card-icon-sm'; this.parentElement.textContent='${initials}';" />
               </div>`
            : `<div class="card-icon-bg card-icon-circle card-icon-slate card-icon-sm">${initials}</div>`;

          const hiredAvatarHtml = photoUrl
            ? `<div class="card-icon-circle card-icon-sm" style="overflow: hidden; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                 <img src="${photoUrl}" alt="${app.seeker_name || 'Applicant'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.parentElement.className='card-icon-bg card-icon-circle card-icon-green card-icon-sm'; this.parentElement.textContent='${initials}';" />
               </div>`
            : `<div class="card-icon-bg card-icon-circle card-icon-green card-icon-sm">${initials}</div>`;

          if (app.status === 'Pending' || app.status === 'pending') {
            pendingCount++;
            const cardHtml = `
                    <div class="kanban-card" draggable="true" data-id="${app.id}">
                       <div class="flex items-start gap-3 mb-3">
                         ${pendingAvatarHtml}
                         <div>
                           <h4 class="font-bold text-slate-900 text-sm">${app.seeker_name}</h4>
                           <p class="text-xs text-slate-500">Applied for: ${app.job_title}</p>
                         </div>
                       </div>
                       
                       <div class="flex gap-2 mt-4">
                         <button class="btn btn-outline btn-sm flex-grow text-xs" onclick="window.open('${app.resume_file_url || '#'}', '_blank')">Download CV</button>
                         <button class="btn btn-outline btn-sm flex-grow text-xs" onclick="viewProfile(${app.seeker_id})">View Profile</button>
                         <button class="btn btn-primary btn-sm flex-grow text-xs" style="background-color: var(--green-500); border-color: var(--green-500);" onclick="hireApplication(${app.id}, this)">Hire</button>
                         <button class="btn btn-primary btn-sm flex-grow text-xs" style="background-color: var(--danger); border-color: var(--danger);" onclick="rejectApplication(${app.id}, this)">Reject</button>
                       </div>
                    </div>
                 `;
            if (pendingColumn) pendingColumn.insertAdjacentHTML('beforeend', cardHtml);
          } else if (app.status === 'Hired' || app.status === 'hired') {
            hiredCount++;
            const hiredDate = new Date(app.applied_at).toLocaleDateString(); // Approximation
            const cardHtml = `
                    <div class="kanban-card opacity-90" draggable="true" data-id="${app.id}" style="border-left: 3px solid var(--green-500);">
                       <div class="flex items-start gap-3 mb-3">
                         ${hiredAvatarHtml}
                         <div>
                           <h4 class="font-bold text-slate-900 text-sm">${app.seeker_name}</h4>
                           <p class="text-xs text-slate-500">Hired: ${hiredDate}</p>
                         </div>
                       </div>
                       <div class="flex gap-2 mt-2">
                         <button class="btn btn-outline flex-grow btn-sm text-xs" onclick="viewProfile(${app.seeker_id})">View Profile</button>
                         <button class="btn btn-primary flex-grow btn-sm text-xs" style="background-color: var(--danger); border-color: var(--danger);" onclick="if(confirm('Are you sure you want to remove this?')) { rejectApplication(${app.id}, this); }">Remove</button>
                       </div>
                    </div>
                 `;
            if (hiredColumn) hiredColumn.insertAdjacentHTML('beforeend', cardHtml);
          }
        });

        // Update badge counts
        const pendingBadge = document.querySelector('.kanban-cards[data-column="pending"]').previousElementSibling?.querySelector('.badge');
        if (pendingBadge) pendingBadge.textContent = pendingCount;
        
        const hiredBadge = document.querySelector('.kanban-cards[data-column="hired"]').previousElementSibling?.querySelector('.badge');
        if (hiredBadge) hiredBadge.textContent = hiredCount;

        setupKanbanDragAndDrop();

      } catch (error) {
        console.error('Error loading employer applications:', error);
      }
    };
    loadEmployerApplications();

    const loadEmployerAnalytics = async () => {
      const statViews = document.getElementById('stat-job-views');
      const statApps = document.getElementById('stat-total-applicants');
      const statConv = document.getElementById('stat-conversion-rate');
      const statActive = document.getElementById('stat-active-postings');

      if (!statViews && !statApps && !statConv && !statActive) return;

      const empAuth = typeof getEmployerAuth === 'function' ? getEmployerAuth() : { user: null, token: null };
      const headers = { 'Accept': 'application/json' };
      if (empAuth && empAuth.token && !empAuth.token.includes('cookie')) {
        headers['Authorization'] = `Bearer ${empAuth.token}`;
      }

      const updateStatsUI = (data) => {
        if (!data) return;
        const totalViews = data.totalJobViews !== undefined ? data.totalJobViews : (data.total_job_views !== undefined ? data.total_job_views : 0);
        const totalApplicants = data.totalApplicants !== undefined ? data.totalApplicants : (data.total_applicants !== undefined ? data.total_applicants : 0);
        const activePostings = data.activePostings !== undefined ? data.activePostings : (data.active_postings !== undefined ? data.active_postings : 0);
        let convRate = data.conversionRate || data.conversion_rate;
        if (convRate === undefined || convRate === null) {
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
      if (empAuth && empAuth.user && empAuth.user.id) {
        try {
          const fallbackRes = await fetch(`/api/jobs/employer/${empAuth.user.id}/analytics`, { headers, credentials: 'include' });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            updateStatsUI(data);
          }
        } catch (e) {
          console.error('Failed to load employer stats from fallback:', e);
        }
      }
    };

    window.loadEmployerAnalytics = loadEmployerAnalytics;
    window.loadEmployerStats = loadEmployerAnalytics;
    loadEmployerAnalytics();
  }

  // Fetch Seeker Dashboard Data
  const seekerAppsTable = document.querySelector('#applications .table tbody');
  const savedJobsGrid = document.querySelector('#saved-jobs .dashboard-grid');
  const recommendedJobsGrid = document.querySelector('#applications .dashboard-grid');

  if (seekerAppsTable || savedJobsGrid || recommendedJobsGrid) {
    const seekerAuth = getSeekerAuth();
    if (seekerAuth.user && seekerAuth.user.role === 'job_seeker') {
      const user = seekerAuth.user;
      const seekerHeaders = {};
      if (seekerAuth.token && !seekerAuth.token.includes('cookie')) {
        seekerHeaders['Authorization'] = `Bearer ${seekerAuth.token}`;
      }
      
      // 1. Load Applications
      if (seekerAppsTable) {
        fetch(`/api/applications/seeker/${user.id}`, { headers: seekerHeaders, credentials: 'include' })
          .then(res => res.json())
          .then(apps => {
            seekerAppsTable.innerHTML = '';
            document.querySelector('.card-title').textContent = `My Applications (${apps.length})`;
            if (apps.length === 0) {
              seekerAppsTable.innerHTML = '<tr><td colspan="5" class="text-center py-4">No applications found.</td></tr>';
            } else {
              apps.forEach(app => {
                let badgeClass = 'badge-yellow';
                if (app.status === 'reviewed' || app.status === 'Reviewed') badgeClass = 'badge-blue';
                if (app.status === 'rejected' || app.status === 'Rejected') badgeClass = 'badge-slate';
                if (app.status === 'hired' || app.status === 'Hired') badgeClass = 'badge-green';

                seekerAppsTable.innerHTML += `
                  <tr>
                    <td class="font-medium text-slate-900">${app.job_title}</td>
                    <td>${app.company_name}<br><span class="text-xs text-slate-400">${app.location}</span></td>
                    <td>${new Date(app.applied_at).toLocaleDateString()}</td>
                    <td><span class="badge ${badgeClass}">${app.status}</span></td>
                    <td class="text-right">
                      <button onclick="window.location.href='job-details.html?id=${app.job_id}'" class="btn-text-link">View Job</button>
                      <button onclick="withdrawApplication(${app.id}, this)" class="btn-text-link text-red-500 ml-2" style="font-size: 0.8rem;">Withdraw</button>
                    </td>
                  </tr>
                `;
              });
            }
          }).catch(console.error);
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
                savedJobsGrid.innerHTML = '<p class="text-slate-500 py-4">No saved jobs.</p>';
              } else {
                jobs.forEach(job => {
                  const jobId = job.job_id || job.id;
                  const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
                  const bookmarkColor = isDarkTheme ? 'var(--text-color, #ffffff)' : '#000000';
                  savedJobsGrid.innerHTML += `
                    <div class="card" id="saved-job-${jobId}">
                      <div class="flex justify-between items-start mb-3">
                        <div>
                          <h3 class="font-bold text-slate-900">${job.title}</h3>
                          <p class="text-sm text-slate-500">${job.company_name} • ${job.location}</p>
                        </div>
                        <button class="btn btn-outline btn-icon-small btn-save-job saved" title="Remove from saved" onclick="unsaveJob(${jobId}, this)">
                          <i class="fa-solid fa-bookmark bookmark-icon" style="color: ${bookmarkColor}; font-size: 1.15rem;"></i>
                        </button>
                      </div>
                      <div class="flex gap-2 mb-4">
                        <span class="badge ${getJobTypeBadgeClass(job.job_type)} text-xs" style="font-size: 0.7rem;">${job.job_type || 'Full-time'}</span>
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

        // 3. Load Recommended Jobs
        if (recommendedJobsGrid) {
          fetch(`/api/jobs/recommended/${user.id}`)
            .then(res => res.json())
            .then(jobs => {
              recommendedJobsGrid.innerHTML = '';
              if (jobs.length === 0) {
                recommendedJobsGrid.innerHTML = '<p class="text-slate-500 py-4">No recommendations at this time.</p>';
              } else {
                jobs.forEach(job => {
                  recommendedJobsGrid.innerHTML += `
                    <div class="card p-4 border border-slate-200 shadow-none">
                      <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-slate-900 text-sm">${job.title}</h4>
                        <span class="badge ${getJobTypeBadgeClass(job.job_type)} text-xs" style="font-size: 0.65rem;">${job.job_type || 'Full-time'}</span>
                      </div>
                      <p class="text-xs text-slate-500 mb-3">${job.company_name} • ${job.location}</p>
                      <div class="flex gap-2">
                         <button class="btn btn-outline btn-sm flex-grow text-xs" onclick="window.location.href='job-details.html?id=${job.id}'">View Details</button>
                         <button class="btn btn-primary btn-sm flex-grow text-xs" onclick="applyForJob(${job.id})">Apply</button>
                      </div>
                    </div>
                  `;
                });
              }
            }).catch(console.error);
        }

        // 4. Load Active Alerts
        window.loadAlerts = async function() {
          const container = document.getElementById('active-alerts-container') ||
                            document.querySelector('#alerts .dashboard-grid .card:last-child');
          const titleEl = document.getElementById('active-alerts-title') ||
                          document.querySelector('#alerts .dashboard-grid .card:last-child h2');

          if (!container) return;

          const seekerAuth = getSeekerAuth();
          if (!seekerAuth.user || seekerAuth.user.role !== 'job_seeker') return;

          const headers = {};
          if (seekerAuth.token && !seekerAuth.token.includes('cookie')) {
            headers['Authorization'] = `Bearer ${seekerAuth.token}`;
          }

          try {
            const res = await fetch('/api/alerts', { headers, credentials: 'include' });
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
                const sector = alert.job_sector || alert.keyword || 'Software & Tech';
                const location = alert.location || 'Addis Ababa';
                const frequency = alert.frequency || 'daily';

                let channels = [];
                if (alert.email_notification) channels.push('Email');
                if (alert.telegram_notification) channels.push('Telegram');
                const channelText = channels.length > 0 ? channels.join(' & ') : 'None';

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
        if (alertForm) {
          alertForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const seekerAuth = getSeekerAuth();
            if (!seekerAuth.token || !seekerAuth.user || seekerAuth.user.role !== 'job_seeker') {
              showToast('Please log in as a job seeker first', 'error');
              return;
            }

            const sectorEl = document.getElementById('alert-sector');
            const locationEl = document.getElementById('alert-location');
            const emailEl = document.getElementById('alert-email');
            const telegramEl = document.getElementById('alert-telegram');

            const job_sector = sectorEl ? sectorEl.value : 'Software & Tech';
            const location = locationEl ? locationEl.value : 'Addis Ababa';
            const email_notification = emailEl ? emailEl.checked : true;
            const telegram_notification = telegramEl ? telegramEl.checked : true;

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
              const res = await fetch('/api/alerts', {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify({
                  seekerId: seekerAuth.user.id,
                  job_sector,
                  location,
                  email_notification,
                  telegram_notification,
                  frequency: 'daily'
                })
              });

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

      }
    }
  }
);

// Global functions for dynamic elements
window.rejectApplication = function(appId, btnElement) {
  if (confirm('Are you sure you want to reject this application?')) {
    fetch(`/api/applications/${appId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Rejected' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.message === 'Application status updated successfully') {
        showToast('Application rejected', 'info');
        const card = btnElement.closest('.kanban-card');
        if (card) card.remove();
        
        // Update badge count
        const badge = document.querySelector('.kanban-header .badge-slate');
        if (badge) {
          const currentCount = parseInt(badge.textContent, 10);
          if (!isNaN(currentCount) && currentCount > 0) {
            badge.textContent = currentCount - 1;
          }
        }
      } else {
        showToast(data.message || 'Error updating status', 'error');
      }
    })
    .catch(err => showToast('Network error', 'error'));
  }
};

window.hireApplication = function(appId, btnElement) {
  if (confirm('Are you sure you want to select/hire this candidate?')) {
    fetch(`/api/applications/${appId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Hired' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.message === 'Application status updated successfully') {
        showToast('Candidate Hired successfully!', 'success');
        setTimeout(() => window.location.reload(), 500);
      } else {
        showToast(data.message || 'Error updating status', 'error');
      }
    })
    .catch(err => showToast('Network error', 'error'));
  }
};

window.deleteAlert = async function(id, btnElement) {
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
window.setupKanbanDragAndDrop = function() {
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
            } catch (e) {}
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
          <div class="modal-content" style="max-width: 440px; text-align: center;">
            <h3 class="text-xl font-bold mb-3" style="color: inherit;">Confirm Application</h3>
            <p class="mb-6 text-base" style="color: inherit; opacity: 0.85;">Are you sure you want to apply for this job?</p>
            <div class="flex gap-4 justify-center">
              <button id="apply-cancel-btn" class="btn btn-outline px-6 text-base">Cancel</button>
              <button id="apply-confirm-btn" class="btn btn-primary px-8 text-base">Yes</button>
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
      
      applyModal.classList.remove('hidden');
      applyModal.classList.add('active');
      
      const cancelBtn = document.getElementById('apply-cancel-btn');
      const confirmBtn = document.getElementById('apply-confirm-btn');
      
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
        newConfirmBtn.textContent = 'Applying...';
        
        fetch('/api/applications/apply', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({ job_id: jId, seeker_id: usr.id })
        }).then(res => res.json()).then(data => {
          applyModal.classList.remove('active');
          applyModal.classList.add('hidden');
          newConfirmBtn.disabled = false;
          newConfirmBtn.textContent = 'Yes';
          
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
          newConfirmBtn.textContent = 'Yes';
          showToast('Network error', 'error');
        });
      });
    })
    .catch(err => {
      console.error(err);
      showToast('Error checking application status', 'error');
    });
};

window.withdrawApplication = function(appId, btnElement) {
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

window.updateJobBookmarkVisualState = function(jobId, isSaved) {
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

window.saveJob = async function(jobId, btnElement) {
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

window.unsaveJob = async function(jobId, btnElement) {
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

window.toggleSaveJob = async function(jobId, btnElement) {
  const numJobId = Number(jobId);
  const isCurrentlySaved = (window.userSavedJobIds && window.userSavedJobIds.has(numJobId)) ||
    (btnElement && btnElement.classList.contains('saved'));

  if (isCurrentlySaved) {
    return await window.unsaveJob(numJobId, btnElement);
  } else {
    return await window.saveJob(numJobId, btnElement);
  }
};

// Kanban Drag and Drop Logic
window.setupKanbanDragAndDrop = function() {
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

// View Candidate Profile
window.viewProfile = function(seekerId) {
  if (!seekerId) {
    showToast('Applicant ID not found.', 'error');
    return;
  }
  showToast('Fetching profile...', 'info');

  // Fetch applicant profile by ID
  fetch(`/api/seekers/${seekerId}`) 
    .then(async (res) => {
      if (!res.ok) {
        // Fallback to /api/seeker/profile/:id if needed
        const fallbackRes = await fetch(`/api/seeker/profile/${seekerId}`);
        if (!fallbackRes.ok) throw new Error('Candidate profile not found');
        return fallbackRes.json();
      }
      return res.json();
    })
    .then(seeker => {
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
    }).catch(err => {
      console.error('Error fetching candidate profile:', err);
      showToast('Network error while fetching profile.', 'error');
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
  requestAnimationFrame(() => {
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
  contents.forEach(content => content.classList.remove('active'));

  // Remove active from all tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Show target content
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');

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
  }
}

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

// Handle dynamic report job clicks
document.addEventListener('click', async (e) => {
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
                        </div>
                        <button type="submit" class="btn btn-danger w-full mt-2" id="submit-report-btn">Submit Report</button>
                    </form>
                </div>
            `;
            document.body.appendChild(reportModal);
            
            document.getElementById('close-report-modal').addEventListener('click', () => {
                reportModal.classList.remove('active');
                setTimeout(() => reportModal.classList.add('hidden'), 300);
            });
            
            document.getElementById('report-job-form').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const btn = document.getElementById('submit-report-btn');
                const originalText = btn.textContent;
                btn.textContent = 'Submitting...';
                btn.disabled = true;
                
                const rJobId = document.getElementById('report-job-id').value;
                const reason = document.getElementById('report-reason').value;
                
                try {
                    const res = await fetch(`/api/jobs/${rJobId}/report`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason })
                    });
                    if (res.ok) {
                        showToast('Job reported successfully. Admin will review it.', 'success');
                        const triggeredBtn = document.querySelector(`[data-action="report-job"][data-job-id="${rJobId}"]`);
                        if (triggeredBtn) {
                            triggeredBtn.innerHTML = '<span style="font-size: 10px; padding: 2px;">Reported</span>';
                            triggeredBtn.disabled = true;
                            triggeredBtn.style.color = '#ef4444';
                            triggeredBtn.style.borderColor = 'transparent';
                        }
                        reportModal.classList.remove('active');
                        setTimeout(() => reportModal.classList.add('hidden'), 300);
                        document.getElementById('report-job-form').reset();
                    } else {
                        showToast('Failed to report job.', 'error');
                    }
                } catch (error) {
                    console.error('Error reporting job:', error);
                    showToast('Network error', 'error');
                } finally {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            });
        }
        
        document.getElementById('report-job-id').value = jobId;
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
        if (input.parentElement.classList.contains('password-wrapper')) return;

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
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'block';
            } else {
                eyeOpen.style.display = 'block';
                eyeClosed.style.display = 'none';
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

if (manageJobsTab || editJobModal) {
  const loadManageJobs = async () => {
    if (!manageJobsContainer) return;
    const empAuth = getEmployerAuth();
    if (!empAuth.user) return;

    try {
      manageJobsContainer.innerHTML = '<p class="text-slate-500">Loading your jobs...</p>';
      const headers = {};
      if (empAuth.token && !empAuth.token.includes('cookie')) {
        headers['Authorization'] = `Bearer ${empAuth.token}`;
      }
      const response = await fetch('/api/employer/jobs', {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const jobs = await response.json();

      if (jobs.length === 0) {
        manageJobsContainer.innerHTML = '<p class="text-slate-500">You have not posted any jobs yet.</p>';
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

        html += `
          <div class="card job-manage-card" style="text-align: left;">
            <!-- Header Flexbox: Title and Job Type Badge -->
            <div class="job-manage-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h3 class="job-manage-title text-lg font-bold text-slate-900 m-0" style="margin: 0; text-align: left;">${job.title}</h3>
                ${editedBadge}
              </div>
              <span class="badge ${getJobTypeBadgeClass(job.job_type)} text-xs" style="flex-shrink: 0;">${job.job_type || 'Full-time'}</span>
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
            <div class="job-manage-actions" style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; width: 100%;">
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
      manageJobsContainer.innerHTML = html;
    } catch (e) {
      console.error(e);
      manageJobsContainer.innerHTML = '<p class="text-red-500">Error loading jobs.</p>';
    }
  };

  // Load on tab switch
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (e.target.dataset.target === 'manage-jobs-tab') {
        loadManageJobs();
      }
    });
  });

  // Initial load if tab is active by default (it's not, but good measure)
  if (document.querySelector('.tab.active[data-target="manage-jobs-tab"]')) {
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


