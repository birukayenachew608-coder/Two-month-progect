/**
 * Employer Dashboard Controller & RBAC Guard
 * JobLink Ethiopia
 */
(function() {
  function verifyEmployerRole() {
    let employerUser = null;
    let seekerUser = null;

    try {
      employerUser = JSON.parse(localStorage.getItem('employer_user') || localStorage.getItem('user'));
    } catch (e) {}

    try {
      seekerUser = JSON.parse(localStorage.getItem('seeker_user'));
    } catch (e) {}

    // Check if a Job Seeker attempts to open employer.html
    if (seekerUser && seekerUser.role === 'job_seeker' && (!employerUser || employerUser.role !== 'employer')) {
      console.warn('[RBAC] Job Seeker detected on Employer Dashboard. Redirecting to seeker.html...');
      window.location.replace('seeker.html');
      return;
    }

    if (employerUser && employerUser.role && employerUser.role !== 'employer') {
      console.warn(`[RBAC] Unauthorized role '${employerUser.role}' on Employer Dashboard.`);
      if (employerUser.role === 'job_seeker') {
        window.location.replace('seeker.html');
      } else {
        window.location.replace('index.html');
      }
      return;
    }

    // Call /api/auth/me to validate session on the backend
    const employerToken = localStorage.getItem('employer_token') || localStorage.getItem('token');
    const headers = {};
    if (employerToken && !employerToken.includes('cookie')) {
      headers['Authorization'] = 'Bearer ' + employerToken;
    }

    fetch('/api/auth/me', { headers, credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          throw new Error('Session invalid');
        }
        return res.json();
      })
      .then(data => {
        const validatedUser = data.user || data;
        if (validatedUser && validatedUser.role && validatedUser.role !== 'employer') {
          console.warn(`[RBAC] Server validated role is '${validatedUser.role}'. Redirecting...`);
          if (validatedUser.role === 'job_seeker') {
            window.location.replace('seeker.html');
          } else {
            window.location.replace('index.html');
          }
        } else {
          if (typeof window.loadEmployerStats === 'function') {
            window.loadEmployerStats();
          }
          if (typeof window.loadEmployerApplications === 'function') {
            window.loadEmployerApplications();
          }
          if (typeof window.loadEmployerJobs === 'function') {
            window.loadEmployerJobs();
          }
        }
      })
      .catch(() => {
        // Fallback or unauthenticated state handled by main modal
      });
  }

  // Execute verification immediately on script execution and on DOM load
  verifyEmployerRole();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifyEmployerRole);
  }

  window.verifyEmployerRole = verifyEmployerRole;

  // --- Employer Notifications & Inbox Controller ---
  let currentNotifications = [];
  let currentFilter = 'all'; // 'all' or 'unread'

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getEmployerHeaders() {
    const employerToken = localStorage.getItem('employer_token') || 
                          localStorage.getItem('accessToken') || 
                          localStorage.getItem('token');
    const headers = { 'Accept': 'application/json' };
    if (employerToken && !employerToken.includes('cookie')) {
      headers['Authorization'] = 'Bearer ' + employerToken;
    }
    return headers;
  }

  function updateNotifBadges(notifications) {
    const unreadCount = notifications.filter(n => !n.is_read && n.status !== 'read').length;
    const allCount = notifications.length;

    const tabBadge = document.getElementById('employer-notif-badge');
    if (tabBadge) {
      tabBadge.textContent = unreadCount;
      if (unreadCount > 0) {
        tabBadge.classList.remove('hidden');
      } else {
        tabBadge.classList.add('hidden');
      }
    }

    const countAllEl = document.getElementById('notif-count-all');
    if (countAllEl) countAllEl.textContent = allCount;

    const countUnreadEl = document.getElementById('notif-count-unread');
    if (countUnreadEl) countUnreadEl.textContent = unreadCount;
  }

  function renderNotificationsList() {
    const container = document.getElementById('employer-notifications-list');
    if (!container) return;

    let itemsToDisplay = currentNotifications;
    if (currentFilter === 'unread') {
      itemsToDisplay = currentNotifications.filter(n => !n.is_read && n.status !== 'read');
    }

    if (itemsToDisplay.length === 0) {
      const emptyMessage = currentFilter === 'unread'
        ? 'No unread notifications at this time.'
        : 'You have no notifications or messages from administration yet.';

      container.innerHTML = `
        <div class="text-center py-12 px-4 card border border-dashed border-slate-200">
          <svg class="icon-lg mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 48px; height: 48px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
          </svg>
          <h3 class="font-bold text-slate-800 text-base mb-1">Inbox is clear</h3>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">${emptyMessage}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = itemsToDisplay.map(item => {
      const isUnread = !item.is_read && item.status !== 'read';
      const createdDate = item.created_at ? new Date(item.created_at).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Recently';

      return `
        <div class="employer-notif-card ${isUnread ? 'employer-notif-unread' : ''}" id="notif-item-${item.id}">
          <div class="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="notif-badge-admin">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 2px;">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                ${escapeHtml(item.sender || 'System Admin')}
              </span>
              <h3 class="font-bold text-slate-900 text-sm m-0">${escapeHtml(item.subject || 'Administrative Notice')}</h3>
              ${isUnread ? '<span class="notif-badge-unread">● Unread</span>' : '<span class="notif-badge-read">Read</span>'}
            </div>
            <span class="text-xs text-slate-400 whitespace-nowrap">${createdDate}</span>
          </div>

          ${item.job_title ? `
            <div class="text-xs text-slate-600 mb-2 flex items-center gap-1">
              <span class="font-medium text-slate-700">Related Job Posting:</span>
              <span class="badge badge-slate text-xs">${escapeHtml(item.job_title)}</span>
              ${item.job_id ? `<span class="text-slate-400">#${item.job_id}</span>` : ''}
            </div>
          ` : ''}

          <div class="notif-content-box mt-2 mb-3">
            ${escapeHtml(item.message)}
          </div>

          <div class="flex justify-end items-center gap-2 pt-2 border-t border-slate-100">
            ${isUnread ? `
              <button type="button" class="btn btn-outline btn-sm text-xs py-1 px-3 flex items-center gap-1" onclick="window.markEmployerNotifRead(${item.id})">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 12px; height: 12px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                Mark as Read
              </button>
            ` : ''}
            <button type="button" class="btn btn-outline-danger btn-sm text-xs py-1 px-3 flex items-center gap-1" onclick="window.deleteEmployerNotif(${item.id})">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 12px; height: 12px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Dismiss
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function loadEmployerNotifications() {
    try {
      const headers = getEmployerHeaders();
      const res = await fetch('/api/employer/messages', {
        headers,
        credentials: 'include'
      });

      if (!res.ok) {
        // Fallback to /api/employer/notifications if /messages returns 404
        if (res.status === 404) {
          const fallbackRes = await fetch('/api/employer/notifications', { headers, credentials: 'include' });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            currentNotifications = Array.isArray(data) ? data : [];
            updateNotifBadges(currentNotifications);
            renderNotificationsList();
            return;
          }
        }
        return;
      }

      const data = await res.json();
      currentNotifications = Array.isArray(data) ? data : [];
      updateNotifBadges(currentNotifications);
      renderNotificationsList();
    } catch (err) {
      console.error('Error fetching employer notifications:', err);
    }
  }

  async function markEmployerNotifRead(id) {
    try {
      const headers = getEmployerHeaders();
      headers['Content-Type'] = 'application/json';

      // Optimistic update
      const target = currentNotifications.find(n => n.id === id);
      if (target) {
        target.is_read = true;
        target.status = 'read';
        updateNotifBadges(currentNotifications);
        renderNotificationsList();
      }

      await fetch(`/api/employer/messages/${id}/read`, {
        method: 'PUT',
        headers,
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error marking notification read:', err);
      loadEmployerNotifications();
    }
  }

  async function markAllEmployerNotifsRead() {
    try {
      const headers = getEmployerHeaders();
      headers['Content-Type'] = 'application/json';

      // Optimistic update
      currentNotifications.forEach(n => {
        n.is_read = true;
        n.status = 'read';
      });
      updateNotifBadges(currentNotifications);
      renderNotificationsList();

      await fetch('/api/employer/messages/read-all', {
        method: 'PUT',
        headers,
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error marking all notifications read:', err);
      loadEmployerNotifications();
    }
  }

  async function deleteEmployerNotif(id) {
    if (!confirm('Are you sure you want to dismiss this notification?')) return;
    try {
      const headers = getEmployerHeaders();

      // Optimistic remove
      currentNotifications = currentNotifications.filter(n => n.id !== id);
      updateNotifBadges(currentNotifications);
      renderNotificationsList();

      await fetch(`/api/employer/messages/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error deleting notification:', err);
      loadEmployerNotifications();
    }
  }

  // Setup tab filter listeners and action buttons
  function initNotificationListeners() {
    const btnRefresh = document.getElementById('btn-employer-refresh-notifs');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        loadEmployerNotifications();
      });
    }

    const btnReadAll = document.getElementById('btn-employer-read-all');
    if (btnReadAll) {
      btnReadAll.addEventListener('click', () => {
        markAllEmployerNotifsRead();
      });
    }

    const filterAll = document.getElementById('notif-filter-all');
    const filterUnread = document.getElementById('notif-filter-unread');

    if (filterAll && filterUnread) {
      filterAll.addEventListener('click', () => {
        currentFilter = 'all';
        filterAll.className = 'btn-clear text-primary pb-1 border-b-2 border-primary cursor-pointer';
        filterUnread.className = 'btn-clear text-slate-500 hover:text-slate-800 pb-1 cursor-pointer';
        renderNotificationsList();
      });

      filterUnread.addEventListener('click', () => {
        currentFilter = 'unread';
        filterUnread.className = 'btn-clear text-primary pb-1 border-b-2 border-primary cursor-pointer';
        filterAll.className = 'btn-clear text-slate-500 hover:text-slate-800 pb-1 cursor-pointer';
        renderNotificationsList();
      });
    }
  }

  // Expose methods globally
  window.loadEmployerNotifications = loadEmployerNotifications;
  window.markEmployerNotifRead = markEmployerNotifRead;
  window.markAllEmployerNotifsRead = markAllEmployerNotifsRead;
  window.deleteEmployerNotif = deleteEmployerNotif;

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initNotificationListeners();
      loadEmployerNotifications();
      if (typeof window.loadFreemiumStatus === 'function') {
        window.loadFreemiumStatus();
      }
    });
  } else {
    initNotificationListeners();
    loadEmployerNotifications();
    if (typeof window.loadFreemiumStatus === 'function') {
      window.loadFreemiumStatus();
    }
  }
})();

