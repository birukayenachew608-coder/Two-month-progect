document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the admin dashboard
    if (!document.querySelector('.admin-sections')) return;

    const API_URL = '/api/admin';
    let currentSearchTerm = '';
    let currentTab = 'pending-employers';

    // Initialize Admin Dashboard
    initAdminDashboard();
    checkSuperAdminVisibility();

    function checkSuperAdminVisibility() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role !== 'super_admin') {
                const superAdminLink = document.querySelector('a[href="admin-security.html"]');
                if (superAdminLink) {
                    superAdminLink.style.display = 'none';
                }
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
                // Debounce search slightly
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
        else if (currentTab === 'reported-jobs') fetchReportedJobs(currentSearchTerm);
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
                if (statCards.length >= 4) {
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

                    statCards[3].querySelector('.stat-value').textContent = (data.verifiedEmployers || 0).toLocaleString();
                    const employersTodayBadge = statCards[3].querySelector('.badge');
                    if (employersTodayBadge && data.newVerifiedEmployersToday !== undefined) {
                        employersTodayBadge.textContent = `+${data.newVerifiedEmployersToday} new today`;
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
            
            // Determine badge based on status
            let statusBadge = '';
            if (emp.account_status === 'active') {
                statusBadge = '<span class="badge badge-green">Active</span>';
            } else if (emp.account_status === 'pending_verification') {
                statusBadge = '<span class="badge badge-yellow">Pending</span>';
            } else if (emp.account_status === 'banned') {
                statusBadge = '<span class="badge badge-red">Banned</span>';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                  <div class="flex items-center gap-3">
                    <div class="card-icon-bg card-icon-slate card-icon-sm">${emp.company_name ? emp.company_name.substring(0, 2).toUpperCase() : 'CO'}</div>
                    <div>
                      <p class="font-semibold text-slate-900">${emp.company_name || emp.name}</p>
                      <p class="text-xs text-slate-500">${emp.location || 'Unknown Location'}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <p class="font-medium text-slate-900">${emp.email}</p>
                  <p class="text-xs text-slate-500">${emp.phone || 'No phone'}</p>
                </td>
                <td>${date}<br><span class="text-xs text-slate-400">${time}</span></td>
                <td>${statusBadge}</td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-2">
                    ${emp.account_status !== 'banned' ? `<button class="btn btn-outline-danger text-xs py-2" onclick="handleEmployerAction(${emp.id}, 'ban')">Reject & Ban</button>` : `<button class="btn btn-outline text-xs py-2" onclick="handleEmployerAction(${emp.id}, 'unban')">Unban</button>`}
                    <button class="btn btn-outline-danger text-xs py-2" onclick="handleEmployerAction(${emp.id}, 'remove')">Remove</button>
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
                const jobs = await res.json();
                renderReportedJobs(jobs);
            }
        } catch (error) {
            console.error('Error fetching reported jobs:', error);
        }
    }

    function renderReportedJobs(jobs) {
        const container = document.querySelector('#reported-jobs .main-column');
        if (!container) return;
        
        container.innerHTML = '';
        if (jobs.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-slate-500">No reported jobs found.</div>';
            return;
        }

        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'card card-border-red mb-4';
            div.innerHTML = `
                <div class="flagged-job-layout">
                  <div class="flagged-job-content">
                    <div class="flagged-job-header">
                      <h3 class="flagged-job-title">${job.title}</h3>
                      <span class="badge badge-red badge-sm">Reported</span>
                    </div>
                    <p class="flagged-job-meta">Company: <span class="fw-medium text-slate-800">${job.company_name}</span> • Employer ID #${job.employer_id}</p>
                    <div class="applicant-message text-sm mt-2">
                      ${job.description.length > 150 ? job.description.substring(0, 150) + '...' : job.description}
                    </div>
                  </div>
                  <div class="flagged-job-actions min-w-150 flex flex-col gap-2 justify-center">
                    <button class="btn btn-danger btn-block py-2" onclick="handleJobAction(${job.id}, 'delete')">Delete Post</button>
                    <button class="btn btn-outline btn-block py-2" onclick="handleJobAction(${job.id}, 'dismiss')">Dismiss Flag</button>
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

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                  <div class="flex items-center gap-3">
                    <div class="card-icon-bg card-icon-sm auth-icon-color">${seeker.name ? seeker.name.substring(0, 2).toUpperCase() : 'US'}</div>
                    <div>
                      <p class="font-semibold text-slate-900">${seeker.name}</p>
                      <p class="text-xs text-slate-500">${seeker.professional_title || 'Job Seeker'}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <p class="font-medium text-slate-900">${seeker.email}</p>
                  <p class="text-xs text-slate-500">${seeker.phone || 'No phone'}</p>
                </td>
                <td>${date}</td>
                <td>${statusBadge}</td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-2">
                    ${seeker.account_status !== 'banned' ? `<button class="btn btn-danger text-xs py-2" onclick="handleSeekerAction(${seeker.id}, 'ban')">Remove & Ban</button>` : `<button class="btn btn-outline text-xs py-2" onclick="handleSeekerAction(${seeker.id}, 'unban')">Unban</button>`}
                    <button class="btn btn-outline-danger text-xs py-2" onclick="handleSeekerAction(${seeker.id}, 'remove')">Remove</button>
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
            if (action === 'ban' || action === 'reject') {
                res = await fetch(`${API_URL}/employers/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'banned' })
                });
            } else if (action === 'unban') {
                res = await fetch(`${API_URL}/employers/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'active' })
                });
            } else if (action === 'remove') {
                res = await fetch(`${API_URL}/employers/${id}`, {
                    method: 'DELETE'
                });
            }

            if (res && res.ok) {
                fetchEmployers(currentSearchTerm);
                fetchStats();
            } else {
                alert('Action failed');
            }
        } catch (error) {
            console.error('Error performing action:', error);
        }
    };

    window.handleJobAction = async function(id, action) {
        if (!confirm(`Are you sure you want to ${action} this job?`)) return;

        try {
            let res;
            if (action === 'delete') {
                res = await fetch(`${API_URL}/jobs/${id}`, { method: 'DELETE' });
            } else if (action === 'dismiss') {
                res = await fetch(`${API_URL}/jobs/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'active' }) // restore to active
                });
            }

            if (res && res.ok) {
                fetchReportedJobs(currentSearchTerm);
                fetchStats();
            } else {
                alert('Action failed');
            }
        } catch (error) {
            console.error('Error performing action:', error);
        }
    };

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
