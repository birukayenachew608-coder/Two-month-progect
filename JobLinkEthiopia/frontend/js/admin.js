document.addEventListener('DOMContentLoaded', async () => {
    // Check if we are on the admin dashboard
    if (!document.querySelector('.admin-sections') && !document.getElementById('admin-dashboard-root')) return;

    // 1. Lift initial HTML invisibility to reveal loading overlay
    const antiFouc = document.getElementById('admin-auth-anti-fouc');
    if (antiFouc) antiFouc.remove();

    const guardOverlay = document.getElementById('admin-auth-guard-overlay');
    const dashboardRoot = document.getElementById('admin-dashboard-root');

    function revealDashboard() {
        if (guardOverlay) guardOverlay.remove();
        if (dashboardRoot) dashboardRoot.style.display = 'block';
    }

    function denyAccess() {
        if (dashboardRoot) dashboardRoot.remove();
        try {
            let role = null;
            const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (rawUser) {
                const u = JSON.parse(rawUser);
                if (u && u.role) role = u.role;
            }
            if (role === 'job_seeker' || role === 'seeker') {
                window.location.replace('seeker.html');
                return;
            } else if (role === 'employer') {
                window.location.replace('employer.html');
                return;
            }
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            sessionStorage.clear();
        } catch (e) {}
        window.location.replace('admin-login.html');
    }

    // --- AUTH GUARD WITH BACKEND HANDSHAKE ---
    let isAuthenticated = false;
    let storedToken = sessionStorage.getItem('accessToken') || sessionStorage.getItem('token') ||
                      localStorage.getItem('accessToken') || localStorage.getItem('token') ||
                      localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');

    try {
        const verifyHeaders = { 'Content-Type': 'application/json' };
        if (storedToken && storedToken !== 'secure_cookie_auth') {
            verifyHeaders['Authorization'] = `Bearer ${storedToken}`;
        }
        const res = await fetch('/api/admin/verify', {
            method: 'GET',
            headers: verifyHeaders,
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.user && (data.user.role === 'admin' || data.user.role === 'super_admin')) {
                isAuthenticated = true;
            }
        }
    } catch (e) {
        isAuthenticated = false;
    }

    if (!isAuthenticated) {
        // Attempt Silent Refresh before kicking user out
        try {
            if (typeof window.silentRefreshAuth === 'function') {
                const s = await window.silentRefreshAuth('admin');
                if (s && s.success && (s.role === 'admin' || s.role === 'super_admin')) {
                    isAuthenticated = true;
                }
            } else {
                const refreshRes = await fetch('/api/admin/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    if (data && data.user && (data.user.role === 'admin' || data.user.role === 'super_admin')) {
                        const newToken = data.accessToken || data.token || 'secure_cookie_auth';
                        localStorage.setItem('token', newToken);
                        localStorage.setItem('accessToken', newToken);
                        sessionStorage.setItem('token', newToken);
                        sessionStorage.setItem('accessToken', newToken);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        sessionStorage.setItem('user', JSON.stringify(data.user));
                        isAuthenticated = true;
                    }
                }
            }
        } catch (err) {
            console.warn('Silent refresh error on admin.html:', err);
        }
    }

    if (!isAuthenticated) {
        denyAccess();
        return;
    }

    // Verified successfully: safely reveal dashboard DOM
    revealDashboard();
    // -------------------------------------

    const API_URL = '/api/admin';
    let currentSearchTerm = '';
    let currentTab = 'pending-employers';
    let allReportedJobs = [];

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttr(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // Logout logic
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/admin/logout', { method: 'POST' });
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
            } catch (err) {
                window.location.href = '/';
            }
        });
    }

    // Initialize Admin Dashboard
    initAdminDashboard();
    checkSuperAdminVisibility();

    function checkSuperAdminVisibility() {
        let user = null;
        try {
            user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
        } catch (e) {}

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        let role = user ? user.role : null;
        if (token) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const base64Url = parts[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                    const decoded = JSON.parse(jsonPayload);
                    if (decoded && decoded.role) role = decoded.role;
                }
            } catch (e) {}
        }

        const isSuperAdmin = (role === 'super_admin');
        const securityLinks = document.querySelectorAll('a[href*="admin-security"], #btn-super-admin-settings, #btn-security-settings, .security-nav-link');
        securityLinks.forEach(link => {
            if (!isSuperAdmin) {
                link.style.display = 'none';
                link.classList.add('hidden');
                link.setAttribute('aria-hidden', 'true');
                link.setAttribute('disabled', 'true');
                link.style.pointerEvents = 'none';
            } else {
                link.style.display = '';
                link.classList.remove('hidden');
                link.removeAttribute('aria-hidden');
                link.removeAttribute('disabled');
                link.style.pointerEvents = '';
            }
        });

        const deniedMsg = sessionStorage.getItem('admin_access_denied');
        if (deniedMsg) {
            sessionStorage.removeItem('admin_access_denied');
            if (typeof showToast === 'function') {
                showToast(deniedMsg, 'error');
            } else {
                alert(deniedMsg);
            }
        }
    }

    function initAdminDashboard() {
        fetchStats();
        fetchEmployers();
        fetchReportedJobs();
        fetchJobSeekers();

        // Setup search functionality
        const searchInputs = document.querySelectorAll('.admin-search-input');
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                currentSearchTerm = e.target.value;
                if (currentTab === 'reported-jobs' || input.id === 'reported-jobs-search-input') {
                    // Real-time instant filtering for Reported Jobs
                    filterReportedJobs(e.target.value);
                    return;
                }
                // Debounce search slightly for employers and job seekers
                clearTimeout(input.searchTimeout);
                input.searchTimeout = setTimeout(() => {
                    refreshCurrentTab();
                }, 300);
            });
        });
        
        // Also setup main global search
        const globalSearch = document.querySelector('.search-input');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                currentSearchTerm = e.target.value;
                if (currentTab === 'reported-jobs') {
                    filterReportedJobs(e.target.value);
                    return;
                }
                clearTimeout(globalSearch.searchTimeout);
                globalSearch.searchTimeout = setTimeout(() => {
                    refreshCurrentTab();
                }, 300);
            });
        }

        // Tab Switching Listener to know which tab is active for search
        const tabs = document.querySelectorAll('.tab[data-action="switch-tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                currentTab = e.target.dataset.target;
                // Clear search inputs when switching tabs (optional, but good UX)
                searchInputs.forEach(inp => inp.value = '');
                if (globalSearch) globalSearch.value = '';
                currentSearchTerm = '';
                refreshCurrentTab();
            });
        });
    }

    function refreshCurrentTab() {
        if (currentTab === 'pending-employers') fetchEmployers(currentSearchTerm);
        else if (currentTab === 'reported-jobs') {
            const searchVal = document.getElementById('reported-jobs-search-input')?.value || currentSearchTerm;
            filterReportedJobs(searchVal);
        }
        else if (currentTab === 'job-seekers') fetchJobSeekers(currentSearchTerm);
    }

    // Fetch Stats
    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/stats`);
            if (res.ok) {
                const data = await res.json();
                
                // The DOM elements in admin.html might not exactly match these IDs, 
                // so we will update based on the titles or existing IDs.
                // Assuming we can select the .stat-value inside the appropriate stat-card
                const statCards = document.querySelectorAll('.stat-card');
                if (statCards.length >= 3) {
                    statCards[0].querySelector('.stat-value').textContent = data.registeredEmployers || 0;
                    
                    statCards[1].querySelector('.stat-value').textContent = data.reportedJobs || 0;
                    const reportedBadge = statCards[1].querySelector('.badge');
                    if (reportedBadge) {
                        if (data.reportedJobs > 0) {
                            reportedBadge.textContent = 'High Priority';
                            reportedBadge.className = 'badge badge-red';
                            reportedBadge.style.display = 'inline-block';
                        } else {
                            reportedBadge.style.display = 'none';
                        }
                    }

                    statCards[2].querySelector('.stat-value').textContent = (data.activeJobs || 0).toLocaleString();
                    const activeGrowthBadge = statCards[2].querySelector('.badge');
                    if (activeGrowthBadge && data.activeJobsGrowth !== undefined) {
                        const growthSign = data.activeJobsGrowth > 0 ? '+' : '';
                        activeGrowthBadge.textContent = `${growthSign}${data.activeJobsGrowth}% this week`;
                        activeGrowthBadge.className = data.activeJobsGrowth >= 0 ? 'badge badge-green' : 'badge badge-red';
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }

    // Fetch Employers
    async function fetchEmployers(search = '') {
        try {
            const res = await fetch(`${API_URL}/employers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
            if (res.ok) {
                const employers = await res.json();
                renderEmployers(employers);
            }
        } catch (error) {
            console.error('Error fetching employers:', error);
        }
    }

    function renderEmployers(employers) {
        const tbody = document.getElementById('employer-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        if (employers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No employers found.</td></tr>';
            return;
        }

        employers.forEach(emp => {
            const date = new Date(emp.created_at).toLocaleDateString();
            const time = new Date(emp.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const isApproved = Boolean(emp.is_approved) || emp.account_status === 'active';
            let statusBadge = '';
            if (isApproved && emp.account_status !== 'banned') {
                statusBadge = '<span class="badge badge-green font-semibold">Approved</span>';
            } else if (emp.account_status === 'banned') {
                statusBadge = '<span class="badge badge-red font-semibold">Rejected</span>';
            } else {
                statusBadge = '<span class="badge badge-yellow font-semibold">Pending Review</span>';
            }

            let initials = 'CO';
            const nameToUse = (emp.company_name || emp.name || '').trim();
            if (nameToUse.length >= 2) {
                initials = nameToUse.substring(0, 2).toUpperCase();
            } else if (nameToUse.length === 1) {
                initials = nameToUse.toUpperCase();
            }

            const rawPhoto = emp.profile_photo || emp.profile_photo_url;
            const hasPhoto = rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() !== '' && rawPhoto !== 'null' && rawPhoto !== 'undefined' && !rawPhoto.includes('default-avatar');

            let photoSrc = rawPhoto;
            if (photoSrc && !photoSrc.startsWith('http') && !photoSrc.startsWith('data:') && !photoSrc.startsWith('/')) {
                photoSrc = '/' + photoSrc;
            }

            const avatarHtml = hasPhoto
                ? `<div class="card-icon-bg card-icon-sm card-icon-circle card-icon-slate" style="width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%; padding: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                     <img src="${photoSrc}" alt="${emp.company_name || emp.name || 'Company'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.onerror=null; this.parentElement.textContent='${initials}';" />
                   </div>`
                : `<div class="card-icon-bg card-icon-sm card-icon-circle card-icon-slate" style="width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 600; font-size: 0.875rem;">
                     ${initials}
                   </div>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                  <div class="flex items-center" style="gap: 0.875rem;">
                    ${avatarHtml}
                    <div style="min-width: 0;">
                      <p class="font-semibold text-slate-900" style="margin: 0; font-size: 0.875rem; line-height: 1.25;">${emp.company_name || emp.name || 'Unknown Company'}</p>
                      <p class="text-xs text-slate-500" style="margin: 0.2rem 0 0 0; font-size: 0.75rem; line-height: 1.2;">${emp.location || 'Unknown Location'}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <p class="font-medium text-slate-900" style="margin: 0; font-size: 0.8125rem; line-height: 1.25; word-break: break-all;">${emp.email || 'No email'}</p>
                  <p class="text-xs text-slate-500" style="margin: 0.2rem 0 0 0; font-size: 0.75rem; line-height: 1.2;">${emp.phone || 'No phone'}</p>
                </td>
                <td>
                  <span class="text-slate-600" style="font-size: 0.8125rem;">${date}</span>
                  <br><span class="text-xs text-slate-400">${time}</span>
                </td>
                <td>${statusBadge}</td>
                <td class="text-right">
                  <div class="flex items-center justify-end" style="gap: 0.5rem;">
                    ${(!isApproved || emp.account_status === 'banned') ? `
                      <button class="btn btn-outline text-xs py-2 px-3 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onclick="handleEmployerAction(${emp.id}, 'approve')" title="Approve Employer Account">
                        Approve
                      </button>
                    ` : `
                      <button class="btn btn-outline-danger text-xs py-2 px-3" onclick="handleEmployerAction(${emp.id}, 'reject')" title="Reject Employer Account">
                        Reject
                      </button>
                    `}
                    <button class="btn btn-outline-danger text-xs py-2 px-3" onclick="handleEmployerAction(${emp.id}, 'remove')" title="Remove Employer Account">Remove</button>
                  </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Fetch Reported Jobs
    async function fetchReportedJobs(search = '') {
        try {
            const res = await fetch(`${API_URL}/jobs/reported${search ? `?search=${encodeURIComponent(search)}` : ''}`);
            if (res.ok) {
                allReportedJobs = await res.json();
                const searchVal = document.getElementById('reported-jobs-search-input')?.value || '';
                if (searchVal) {
                    filterReportedJobs(searchVal);
                } else {
                    renderReportedJobs(allReportedJobs);
                }
            }
        } catch (error) {
            console.error('Error fetching reported jobs:', error);
        }
    }

    // Real-time client-side filter for Reported Jobs
    function filterReportedJobs(searchTerm = '') {
        const term = (searchTerm || '').trim().toLowerCase();
        if (!term) {
            renderReportedJobs(allReportedJobs);
            return;
        }
        const filtered = allReportedJobs.filter(job => {
            const title = (job.title || '').toLowerCase();
            const company = (job.company_name || '').toLowerCase();
            return title.includes(term) || company.includes(term);
        });
        renderReportedJobs(filtered, term);
    }

    function renderReportedJobs(jobs, activeSearchTerm = '') {
        const container = document.querySelector('#reported-jobs .main-column');
        if (!container) return;
        
        container.innerHTML = '';
        if (jobs.length === 0) {
            if (activeSearchTerm) {
                container.innerHTML = `<div class="text-center py-8 text-slate-500">No reported jobs matching "<strong>${escapeHtml(activeSearchTerm)}</strong>".</div>`;
            } else {
                container.innerHTML = '<div class="text-center py-8 text-slate-500">No reported jobs found.</div>';
            }
            return;
        }

        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'card card-border-red mb-4';
            div.id = `reported-job-card-${job.id}`;
            div.setAttribute('data-job-id', job.id);
            div.setAttribute('data-report-id', job.report_id || job.id);
            
            const reportId = job.report_id || job.id;
            const employerId = job.employer_id || 0;
            const companyName = job.company_name || 'Unknown Company';
            const title = job.title || 'Untitled Post';
            const reason = job.report_reason ? job.report_reason : 'No reason provided';
            const desc = (job.description && job.description.length > 150) ? job.description.substring(0, 150) + '...' : (job.description || '');

            div.innerHTML = `
                <div class="flagged-job-layout">
                  <div class="flagged-job-content">
                    <div class="flagged-job-header">
                      <h3 class="flagged-job-title">${escapeHtml(title)}</h3>
                      <span class="badge badge-red badge-sm">Reported</span>
                    </div>
                    <p class="flagged-job-meta">Company: <span class="fw-medium text-slate-800">${escapeHtml(companyName)}</span> • Employer ID #${employerId}</p>
                    <div class="applicant-message text-sm mt-2 text-slate-700">
                      <strong>Description:</strong> ${escapeHtml(desc)}
                    </div>
                    <div class="applicant-message text-sm mt-2" style="background-color: #fee2e2; color: #991b1b; padding: 0.5rem; border-radius: 0.25rem;">
                      <strong>Reason for reporting:</strong> ${escapeHtml(reason)}
                    </div>
                  </div>
                  <div class="flagged-job-actions min-w-150 flex flex-col gap-2 justify-center">
                    <button type="button" class="btn btn-primary btn-block py-2 text-xs flex items-center justify-center gap-1" onclick="openMessageEmployerModal(${job.id}, ${employerId}, '${escapeAttr(companyName)}', '${escapeAttr(title)}')">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                      Message Employer
                    </button>
                    <button type="button" class="btn btn-outline btn-block py-2 text-xs" onclick="handleDismissFlag(${reportId}, ${job.id})">
                      Dismiss Flag
                    </button>
                    <button type="button" class="btn btn-danger btn-block py-2 text-xs" onclick="handleJobAction(${job.id}, 'delete')">
                      Delete Post
                    </button>
                  </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // Fetch Job Seekers
    async function fetchJobSeekers(search = '') {
        try {
            const res = await fetch(`${API_URL}/seekers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
            if (res.ok) {
                const seekers = await res.json();
                renderJobSeekers(seekers);
            }
        } catch (error) {
            console.error('Error fetching job seekers:', error);
        }
    }

    function renderJobSeekers(seekers) {
        const tbody = document.getElementById('job-seekers-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        if (seekers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No job seekers found.</td></tr>';
            return;
        }

        seekers.forEach(seeker => {
            const date = new Date(seeker.created_at).toLocaleDateString();
            
            let statusBadge = '';
            if (seeker.account_status === 'active') {
                statusBadge = '<span class="badge badge-green">Active</span>';
            } else if (seeker.account_status === 'banned') {
                statusBadge = '<span class="badge badge-red">Banned</span>';
            } else {
                statusBadge = `<span class="badge badge-slate">${seeker.account_status || 'Pending'}</span>`;
            }

            let initials = 'JS';
            if (seeker.name && seeker.name.trim().length >= 2) {
                initials = seeker.name.trim().substring(0, 2).toUpperCase();
            } else if (seeker.name && seeker.name.trim().length === 1) {
                initials = seeker.name.trim().toUpperCase();
            }

            const rawPhoto = seeker.profile_photo || seeker.profile_photo_url;
            const hasPhoto = rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() !== '' && rawPhoto !== 'null' && rawPhoto !== 'undefined' && !rawPhoto.includes('default-avatar');

            let photoSrc = rawPhoto;
            if (photoSrc && !photoSrc.startsWith('http') && !photoSrc.startsWith('data:') && !photoSrc.startsWith('/')) {
                photoSrc = '/' + photoSrc;
            }

            const avatarHtml = hasPhoto
                ? `<div class="card-icon-bg card-icon-sm card-icon-circle auth-icon-color" style="width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%; padding: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                     <img src="${photoSrc}" alt="${seeker.name || 'Job Seeker'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.onerror=null; this.parentElement.textContent='${initials}';" />
                   </div>`
                : `<div class="card-icon-bg card-icon-sm card-icon-circle auth-icon-color" style="width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 600; font-size: 0.875rem;">
                     ${initials}
                   </div>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                  <div class="flex items-center" style="gap: 0.875rem;">
                    ${avatarHtml}
                    <div style="min-width: 0;">
                      <p class="font-semibold text-slate-900" style="margin: 0; font-size: 0.875rem; line-height: 1.25;">${seeker.name || 'Anonymous Seeker'}</p>
                      <p class="text-xs text-slate-500" style="margin: 0.2rem 0 0 0; font-size: 0.75rem; line-height: 1.2;">${seeker.professional_title || 'Job Seeker'}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <p class="font-medium text-slate-900" style="margin: 0; font-size: 0.8125rem; line-height: 1.25; word-break: break-all;">${seeker.email || 'No email'}</p>
                  <p class="text-xs text-slate-500" style="margin: 0.2rem 0 0 0; font-size: 0.75rem; line-height: 1.2;">${seeker.phone || 'No phone'}</p>
                </td>
                <td>
                  <span class="text-slate-600" style="font-size: 0.8125rem;">${date}</span>
                </td>
                <td>${statusBadge}</td>
                <td class="text-right">
                  <div class="flex items-center justify-end" style="gap: 0.5rem;">
                    ${seeker.account_status !== 'banned' ? `<button class="btn btn-danger text-xs py-2" onclick="handleSeekerAction(${seeker.id}, 'ban')" title="Ban Job Seeker">Ban</button>` : `<button class="btn btn-outline text-xs py-2" onclick="handleSeekerAction(${seeker.id}, 'unban')" title="Unban Job Seeker">Unban</button>`}
                    <button class="btn btn-outline-danger text-xs py-2" onclick="handleSeekerAction(${seeker.id}, 'remove')" title="Remove Job Seeker">Remove</button>
                  </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Action Handlers (exposed globally so onclick="" works)
    window.handleEmployerAction = async function(id, action) {
        if (!confirm(`Are you sure you want to ${action} this employer?`)) return;
        
        try {
            let res;
            if (action === 'approve') {
                res = await fetch(`${API_URL}/employers/${id}/approve`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
            } else if (action === 'reject' || action === 'ban') {
                res = await fetch(`${API_URL}/employers/${id}/reject`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
            } else if (action === 'unban') {
                res = await fetch(`${API_URL}/employers/${id}/approve`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
            } else if (action === 'remove') {
                res = await fetch(`${API_URL}/employers/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
            }

            if (res && res.ok) {
                if (typeof window.showToast === 'function') {
                    window.showToast(`Employer ${action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : action + 'd')} successfully.`, 'success');
                }
                fetchEmployers(currentSearchTerm);
                fetchStats();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message || 'Action failed');
            }
        } catch (error) {
            console.error('Error performing action:', error);
            alert('Network error while processing request');
        }
    };

    // Dismiss Flag handler: calls DELETE /api/admin/reports/:reportId and dynamically removes card from DOM instantly
    window.handleDismissFlag = async function(reportId, jobId) {
        if (!confirm('Are you sure you want to dismiss this report flag?')) return;

        try {
            const res = await fetch(`${API_URL}/reports/${reportId || jobId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (res.ok) {
                // Dynamically remove that specific job card from the DOM instantly without requiring a page reload
                const card = document.getElementById(`reported-job-card-${jobId}`);
                if (card) {
                    card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.96)';
                    setTimeout(() => {
                        card.remove();
                        // If no more cards in DOM, show empty message
                        const remaining = document.querySelectorAll('#reported-jobs .main-column .card');
                        if (remaining.length === 0) {
                            const container = document.querySelector('#reported-jobs .main-column');
                            if (container) {
                                container.innerHTML = '<div class="text-center py-8 text-slate-500">No reported jobs found.</div>';
                            }
                        }
                    }, 200);
                }

                // Update in-memory reported jobs list
                allReportedJobs = allReportedJobs.filter(j => j.id !== jobId && j.report_id !== reportId);

                // Decrement reported jobs stat badge
                const statReported = document.getElementById('stat-reported');
                if (statReported) {
                    const currentCount = parseInt(statReported.textContent, 10);
                    if (!isNaN(currentCount) && currentCount > 0) {
                        statReported.textContent = currentCount - 1;
                    }
                }
                fetchStats();

                if (typeof window.showToast === 'function') {
                    window.showToast('Flag dismissed successfully.', 'success');
                }
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message || 'Failed to dismiss flag');
            }
        } catch (error) {
            console.error('Error dismissing flag:', error);
            alert('Network error while dismissing flag');
        }
    };

    window.handleJobAction = async function(id, action) {
        if (!confirm(`Are you sure you want to ${action} this job?`)) return;

        try {
            let res;
            if (action === 'delete') {
                res = await fetch(`${API_URL}/jobs/${id}`, { method: 'DELETE' });
            } else if (action === 'dismiss') {
                res = await fetch(`${API_URL}/reports/${id}`, { method: 'DELETE' });
            }

            if (res && res.ok) {
                // Dynamically remove card from DOM instantly
                const card = document.getElementById(`reported-job-card-${id}`);
                if (card) {
                    card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.96)';
                    setTimeout(() => {
                        card.remove();
                        const remaining = document.querySelectorAll('#reported-jobs .main-column .card');
                        if (remaining.length === 0) {
                            const container = document.querySelector('#reported-jobs .main-column');
                            if (container) {
                                container.innerHTML = '<div class="text-center py-8 text-slate-500">No reported jobs found.</div>';
                            }
                        }
                    }, 200);
                }

                allReportedJobs = allReportedJobs.filter(j => j.id !== id);

                const statReported = document.getElementById('stat-reported');
                if (statReported) {
                    const currentCount = parseInt(statReported.textContent, 10);
                    if (!isNaN(currentCount) && currentCount > 0) {
                        statReported.textContent = currentCount - 1;
                    }
                }
                fetchStats();

                if (typeof window.showToast === 'function') {
                    window.showToast(`Job ${action === 'delete' ? 'deleted' : 'flag dismissed'} successfully.`, 'success');
                }
            } else {
                alert('Action failed');
            }
        } catch (error) {
            console.error('Error performing action:', error);
        }
    };

    // Message Employer Modal functions
    window.openMessageEmployerModal = function(jobId, employerId, companyName, jobTitle) {
        const modal = document.getElementById('message-employer-modal');
        if (!modal) return;

        document.getElementById('msg-employer-id').value = employerId || '';
        document.getElementById('msg-job-id').value = jobId || '';
        document.getElementById('msg-modal-company').textContent = companyName || 'Employer';
        document.getElementById('msg-modal-job-title').textContent = jobTitle || 'Job Post';
        document.getElementById('msg-subject').value = `Warning: Regarding reported job "${jobTitle}"`;
        document.getElementById('msg-body').value = `Hello ${companyName},\n\nWe have received reports from community members regarding your job listing "${jobTitle}". Please review your listing details and ensure compliance with our platform policies.\n\nBest regards,\nJobLink Ethiopia Administration`;

        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
        const bodyInput = document.getElementById('msg-body');
        if (bodyInput) bodyInput.focus();
    };

    window.closeMessageEmployerModal = function() {
        const modal = document.getElementById('message-employer-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.classList.add('hidden'), 250);
        }
    };

    // Hook up modal close listeners and form submission
    const closeMsgModalBtn = document.getElementById('btn-close-msg-modal');
    if (closeMsgModalBtn) closeMsgModalBtn.addEventListener('click', window.closeMessageEmployerModal);

    const cancelMsgModalBtn = document.getElementById('btn-cancel-msg-modal');
    if (cancelMsgModalBtn) cancelMsgModalBtn.addEventListener('click', window.closeMessageEmployerModal);

    const msgModal = document.getElementById('message-employer-modal');
    if (msgModal) {
        msgModal.addEventListener('click', (e) => {
            if (e.target === msgModal) {
                window.closeMessageEmployerModal();
            }
        });
    }

    const msgForm = document.getElementById('message-employer-form');
    if (msgForm) {
        msgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const employerId = document.getElementById('msg-employer-id').value;
            const jobId = document.getElementById('msg-job-id').value;
            const subject = document.getElementById('msg-subject').value;
            const message = document.getElementById('msg-body').value;
            const btn = document.getElementById('btn-send-employer-msg');

            if (!message || message.trim().length === 0) {
                alert('Please enter a message to send.');
                return;
            }

            const originalBtnHtml = btn ? btn.innerHTML : 'Send Message';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = 'Sending...';
            }

            try {
                const res = await fetch(`${API_URL}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ employerId, jobId, subject, message })
                });

                const data = await res.json();
                if (res.ok) {
                    window.closeMessageEmployerModal();
                    if (typeof window.showToast === 'function') {
                        window.showToast(data.message || 'Message sent to employer successfully', 'success');
                    } else {
                        alert(data.message || 'Message sent to employer successfully');
                    }
                    msgForm.reset();
                } else {
                    alert(data.message || 'Failed to send message');
                }
            } catch (error) {
                console.error('Error sending message to employer:', error);
                alert('Network error while sending message');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalBtnHtml;
                }
            }
        });
    }

    window.handleSeekerAction = async function(id, action) {
        if (!confirm(`Are you sure you want to ${action} this job seeker?`)) return;

        try {
            let res;
            if (action === 'ban') {
                res = await fetch(`${API_URL}/seekers/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'banned' })
                });
            } else if (action === 'unban') {
                res = await fetch(`${API_URL}/seekers/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'active' })
                });
            } else if (action === 'remove') {
                res = await fetch(`${API_URL}/seekers/${id}`, { method: 'DELETE' });
            }

            if (res && res.ok) {
                fetchJobSeekers(currentSearchTerm);
            } else {
                alert('Action failed');
            }
        } catch (error) {
            console.error('Error performing action:', error);
        }
    };
});
