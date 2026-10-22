/**
 * Job Seeker Dashboard Controller & RBAC Guard
 * JobLink Ethiopia - Full-Stack Seeker Management
 */
(function() {
  function decodeToken(t) {
    try {
      if (!t || typeof t !== 'string') return null;
      var parts = t.split('.');
      if (parts.length !== 3) return null;
      var base64Url = parts[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  async function verifySeekerRole() {
    let seekerToken = localStorage.getItem('seeker_token') || localStorage.getItem('accessToken') || localStorage.getItem('token') ||
                      sessionStorage.getItem('accessToken') || sessionStorage.getItem('seeker_token') || sessionStorage.getItem('token');
    let seekerUser = null;
    let employerUser = null;

    try {
      seekerUser = JSON.parse(localStorage.getItem('seeker_user') || localStorage.getItem('user') || sessionStorage.getItem('seeker_user') || sessionStorage.getItem('user'));
    } catch (e) {}

    try {
      employerUser = JSON.parse(localStorage.getItem('employer_user') || sessionStorage.getItem('employer_user'));
    } catch (e) {}

    const payload = decodeToken(seekerToken);
    const role = (payload && payload.role) || (seekerUser && seekerUser.role) || (employerUser && employerUser.role);

    // 1. Immediate Client-Side Role Redirection
    if (role === 'employer') {
      console.warn('[RBAC] Employer detected on Job Seeker Dashboard. Redirecting to employer.html...');
      window.location.replace('employer.html');
      return;
    }

    if (role === 'admin' || role === 'super_admin') {
      window.location.replace('admin.html');
      return;
    }

    if (!seekerToken && !seekerUser) {
      console.warn('[RBAC] Unauthenticated user on Job Seeker Dashboard. Redirecting to login...');
      window.location.replace('index.html?login=seeker');
      return;
    }

    if (role && role !== 'job_seeker' && role !== 'seeker') {
      window.location.replace('index.html?login=seeker');
      return;
    }

    // 2. Authoritative Backend Validation via /api/auth/me
    const headers = {};
    if (seekerToken && !seekerToken.includes('cookie')) {
      headers['Authorization'] = 'Bearer ' + seekerToken;
    }

    try {
      let res = await fetch('/api/auth/me', { headers, credentials: 'include' });
      
      // If unauthorized, attempt silent refresh before redirecting
      if (!res.ok) {
        if (typeof window.silentRefreshAuth === 'function') {
          const refreshed = await window.silentRefreshAuth('job_seeker');
          if (refreshed && refreshed.success) {
            seekerToken = localStorage.getItem('seeker_token') || localStorage.getItem('token');
            if (seekerToken && !seekerToken.includes('cookie')) {
              headers['Authorization'] = 'Bearer ' + seekerToken;
            }
            res = await fetch('/api/auth/me', { headers, credentials: 'include' });
          }
        }
      }

      if (!res.ok) {
        throw new Error('Unauthenticated or session expired');
      }

      const data = await res.json();
      const validatedUser = data.user || data;

      if (!validatedUser || !validatedUser.role) {
        throw new Error('Invalid user profile');
      }

      if (validatedUser.role === 'employer') {
        console.warn('[RBAC] Server confirmed Employer role. Redirecting to employer.html...');
        window.location.replace('employer.html');
        return;
      }

      if (validatedUser.role === 'admin' || validatedUser.role === 'super_admin') {
        window.location.replace('admin.html');
        return;
      }

      if (validatedUser.role !== 'job_seeker' && validatedUser.role !== 'seeker') {
        window.location.replace('index.html?login=seeker');
        return;
      }

      // Validated successfully: cache fresh user
      localStorage.setItem('user', JSON.stringify(validatedUser));
      localStorage.setItem('seeker_user', JSON.stringify(validatedUser));

      // Remove anti-fouc shield if present
      const antiFouc = document.getElementById('seeker-auth-anti-fouc');
      if (antiFouc) antiFouc.remove();

    } catch (err) {
      console.warn('[RBAC] Seeker authentication failed on server:', err.message);
      try {
        localStorage.removeItem('seeker_token');
        localStorage.removeItem('seeker_user');
      } catch (e) {}
      window.location.replace('index.html?login=seeker');
    }
  }

  // Execute verification immediately on script execution and on DOM load
  verifySeekerRole();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifySeekerRole);
  }

  window.verifySeekerRole = verifySeekerRole;

  // ==========================================
  // --- JOB ALERTS CONTROLLER & INTEGRATION ---
  // ==========================================

  function getSeekerAuthHeader() {
    const token = localStorage.getItem('seeker_token') || 
                  localStorage.getItem('accessToken') || 
                  sessionStorage.getItem('accessToken') || 
                  sessionStorage.getItem('seeker_token') || 
                  localStorage.getItem('token');
    const headers = { 'Accept': 'application/json' };
    if (token && !token.includes('cookie')) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  function showNotification(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console.log(`[Toast ${type}] ${msg}`);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Fetch and display active saved job alerts in the Active Alerts card
   */
  async function loadActiveAlerts() {
    const container = document.getElementById('active-alerts-container');
    const titleEl = document.getElementById('active-alerts-title');
    if (!container) return;

    const headers = getSeekerAuthHeader();

    try {
      // Primary: /api/seeker/alerts, Fallback: /api/alerts
      let res = await fetch('/api/seeker/alerts', { headers, credentials: 'include' });
      if (!res.ok && res.status === 404) {
        res = await fetch('/api/alerts', { headers, credentials: 'include' });
      }

      if (!res.ok) {
        if (res.status === 401) {
          container.innerHTML = '<p class="text-slate-500 py-4 text-sm">Please sign in to view your job alerts.</p>';
          if (titleEl) titleEl.textContent = 'Active Alerts (0)';
        } else {
          container.innerHTML = '<p class="text-red-500 py-4 text-sm">Unable to load active alerts.</p>';
        }
        return;
      }

      const alerts = await res.json();
      const count = Array.isArray(alerts) ? alerts.length : 0;
      if (titleEl) {
        titleEl.textContent = `Active Alerts (${count})`;
      }

      if (!Array.isArray(alerts) || alerts.length === 0) {
        container.innerHTML = `
          <div class="text-center py-6 text-slate-500">
            <svg class="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <p class="text-sm">No active alerts configured.</p>
            <p class="text-xs text-slate-400 mt-1">Configure an alert on the left to get notified of new openings.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = alerts.map(alert => {
        const alertId = alert.id;
        const sector = escapeHtml(alert.job_sector || alert.sector || alert.keyword || 'Software & Tech');
        const location = escapeHtml(alert.location || 'Addis Ababa');
        const frequency = escapeHtml(alert.frequency || 'daily');
        const isEmailActive = Boolean(alert.email_notification);

        const channelBadge = isEmailActive
          ? `<span class="inline-flex items-center text-emerald-600 font-medium text-xs">
               <svg class="w-3.5 h-3.5 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
               </svg>
               Email Notification
             </span>`
          : `<span class="inline-flex items-center text-slate-400 font-medium text-xs">
               <svg class="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
               </svg>
               Notifications Disabled
             </span>`;

        return `
          <div class="alert-card mb-3" id="alert-${alertId}" data-id="${alertId}">
            <div class="flex justify-between items-start mb-2">
              <h4 class="font-bold text-slate-900 text-sm">${sector}</h4>
              <span class="badge badge-blue text-xs lowercase">${frequency}</span>
            </div>
            <p class="text-xs text-slate-500 mb-3">${location} • Full-time & Internship</p>
            <div class="alert-card-footer">
              ${channelBadge}
              <button type="button" class="btn-clear text-red-600 hover:text-red-700 font-semibold text-xs cursor-pointer btn-delete-alert" data-action="delete-alert" data-id="${alertId}" onclick="deleteJobAlert(${alertId}, this)">Delete</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading job alerts in seeker.js:', err);
      container.innerHTML = '<p class="text-red-500 py-4 text-sm">Failed to connect to alerts service.</p>';
    }
  }

  /**
   * Delete a job alert
   */
  async function deleteJobAlert(id, btnElement) {
    if (!id) return;
    const headers = getSeekerAuthHeader();

    try {
      let res = await fetch(`/api/seeker/alerts/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/alerts/${id}`, {
          method: 'DELETE',
          headers,
          credentials: 'include'
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotification(data.message || 'Job alert deleted successfully.', 'info');

        // Animate out and remove card
        const card = document.getElementById(`alert-${id}`) || (btnElement ? btnElement.closest('.alert-card') : null);
        if (card) {
          card.style.transition = 'all 0.25s ease';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95) translateY(-5px)';
          setTimeout(() => {
            card.remove();
            const remainingCards = document.querySelectorAll('#active-alerts-container .alert-card');
            const titleEl = document.getElementById('active-alerts-title');
            if (titleEl) {
              titleEl.textContent = `Active Alerts (${remainingCards.length})`;
            }
            if (remainingCards.length === 0) {
              const container = document.getElementById('active-alerts-container');
              if (container) {
                container.innerHTML = `
                  <div class="text-center py-6 text-slate-500">
                    <p class="text-sm">No active alerts configured.</p>
                    <p class="text-xs text-slate-400 mt-1">Configure an alert on the left to get notified of new openings.</p>
                  </div>
                `;
              }
            }
          }, 260);
        } else {
          loadActiveAlerts();
        }
      } else {
        showNotification(data.message || 'Unable to delete alert. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
      showNotification('Network connection error while deleting alert.', 'error');
    }
  }

  /**
   * Wire up the Configure Alert Form and 'Save Alert Preferences' button
   */
  function initJobAlertForm() {
    const alertForm = document.getElementById('alert-form');
    if (!alertForm) return;

    if (alertForm.dataset.seekerAlertBound === 'true') return;
    alertForm.dataset.seekerAlertBound = 'true';

    alertForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const sectorEl = document.getElementById('job-sector') || document.getElementById('alert-sector');
      const locationEl = document.getElementById('alert-location') || document.getElementById('job-location');
      const emailEl = document.getElementById('alert-email');

      const job_sector = sectorEl ? sectorEl.value.trim() : 'Software & Tech';
      const location = locationEl ? locationEl.value.trim() : 'Addis Ababa';
      const email_notification = emailEl ? emailEl.checked : true;

      const submitBtn = alertForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Save Alert Preferences';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving Preferences...';
      }

      const headers = getSeekerAuthHeader();
      headers['Content-Type'] = 'application/json';

      const payload = {
        job_sector,
        sector: job_sector,
        location,
        email_notification,
        frequency: 'daily'
      };

      try {
        // Primary endpoint: POST /api/seeker/alerts, fallback: POST /api/alerts
        let res = await fetch('/api/seeker/alerts', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        if (!res.ok && res.status === 404) {
          res = await fetch('/api/alerts', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(payload)
          });
        }

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          showNotification(data.message || 'Job alert preferences saved successfully!', 'success');
          // Automatically fetch and display saved alert details in Active Alerts panel
          await loadActiveAlerts();
        } else {
          showNotification(data.message || 'Unable to save alert preferences. Please check your inputs.', 'error');
        }
      } catch (err) {
        console.error('Error saving alert preferences:', err);
        showNotification('Network connection error while saving alert preferences.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });

    // Initial fetch of active alerts
    loadActiveAlerts();
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJobAlertForm);
  } else {
    initJobAlertForm();
  }

  // Expose methods globally for seamless integration with dashboard tabs and legacy handlers
  window.loadActiveAlerts = loadActiveAlerts;
  window.loadAlerts = loadActiveAlerts;
  window.deleteJobAlert = deleteJobAlert;
  window.deleteAlert = deleteJobAlert;
  window.initJobAlertForm = initJobAlertForm;
})();
