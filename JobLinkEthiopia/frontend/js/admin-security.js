// Strict Super Admin Page Guard - Executes immediately
(function enforceSuperAdminAccess() {
    function decodeJwtPayload(tokenStr) {
        if (!tokenStr || typeof tokenStr !== 'string') return null;
        try {
            const parts = tokenStr.split('.');
            if (parts.length !== 3) return null;
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    const token = sessionStorage.getItem('accessToken') || sessionStorage.getItem('token') ||
                  localStorage.getItem('accessToken') || localStorage.getItem('token');
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    let user = null;
    try { user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr; } catch (e) {}

    const payload = decodeJwtPayload(token);
    const resolvedRole = (payload && payload.role) || (user && user.role);

    if (!token && !user) {
        window.location.replace('admin-login.html');
        return;
    }

    if (resolvedRole !== 'super_admin') {
        console.warn('[RBAC] Access Denied: Super Admin role required. Redirecting to /admin.html...');
        sessionStorage.setItem('admin_access_denied', 'Forbidden: Super Admin access required');
        window.location.replace('admin.html');
        return;
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const token = sessionStorage.getItem('accessToken') || sessionStorage.getItem('token') ||
                  localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    // Check Super Admin status
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!userStr && !token) {
        window.location.replace('admin-login.html');
        return;
    }
    
    let user = null;
    try { user = JSON.parse(userStr); } catch (e) {}

    // Decode token to verify role
    let tokenRole = null;
    if (token) {
        try {
            const base64Url = token.split('.')[1];
            if (base64Url) {
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const decoded = JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
                tokenRole = decoded.role;
            }
        } catch (e) {}
    }

    const resolvedRole = tokenRole || (user && user.role);
    if (resolvedRole !== 'super_admin') {
        console.warn('[RBAC] Forbidden: Super Admin access required. Redirecting to admin.html');
        sessionStorage.setItem('admin_access_denied', 'Forbidden: Super Admin access required');
        window.location.replace('admin.html');
        return;
    }

    const isSuperAdmin = true;

    const ipList = document.getElementById('ip-list');
    const formIp = document.getElementById('form-ip');

    async function loadIps() {
        try {
            const res = await fetch(`${API_URL}/superadmin/ips`, {
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });
            if (res.ok) {
                const ips = await res.json();
                ipList.innerHTML = '';
                ips.forEach(ip => {
                    let actionHtml = '';
                    if (isSuperAdmin) {
                        actionHtml = `<button class="btn-clear text-red-500" data-action="remove-ip" data-id="${ip.id}">Remove</button>`;
                    }
                    ipList.innerHTML += `
                        <tr id="ip-row-${ip.id}">
                            <td class="font-mono fw-medium">${ip.ip_address}</td>
                            <td class="table-cell-muted">${ip.label || '-'}</td>
                            <td class="text-right">
                                ${actionHtml}
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            console.error('Error loading IPs:', error);
        }
    }

    function isValidIp(ip) {
        // Robust IPv4 with optional CIDR (e.g. 192.168.1.1 or 10.0.0.0/24)
        const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(\/(3[0-2]|[1-2]?\d))?$/;
        // Robust IPv6 with optional CIDR
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(\/(12[0-8]|1[0-1]\d|[1-9]?\d))?$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    formIp.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ipInput = formIp.querySelector('input').value.trim();
        
        if (!isValidIp(ipInput)) {
            alert('Invalid IP address format. Please enter a valid IPv4, IPv6, or CIDR notation.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/superadmin/ips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({ ip_address: ipInput, label: 'Custom IP' })
            });
            if (res.ok) {
                formIp.reset();
                loadIps();
            } else {
                const err = await res.json();
                alert('Error adding IP: ' + err.message);
            }
        } catch (error) {
            console.error('Error adding IP:', error);
        }
    });

    document.addEventListener('click', async (e) => {
        const removeBtn = e.target.closest('[data-action="remove-ip"]');
        if (removeBtn) {
            const id = removeBtn.dataset.id;
            if (!id) return;
            if (!confirm('Remove this IP?')) return;
            try {
                const res = await fetch(`${API_URL}/superadmin/ips/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                    credentials: 'include'
                });
                if (res.ok) {
                    loadIps();
                } else {
                    alert('Error removing IP');
                }
            } catch (error) {
                console.error('Error removing IP:', error);
            }
        }
    });

    // --- Role Management ---
    const adminsTbody = document.querySelector('.security-table tbody:last-of-type');
    const inviteBtn = document.querySelector('.card-footer .btn-primary');
    
    if (!isSuperAdmin && inviteBtn) {
        inviteBtn.style.display = 'none';
    }

    async function loadAdmins() {
        try {
            const res = await fetch(`${API_URL}/superadmin/admins`, {
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });
            const admins = await res.json();
            
            // Re-select the correct tbody in case they have the same class
            // The HTML has two .security-table elements. The second one is roles.
            const tables = document.querySelectorAll('.security-table');
            const adminTbody = tables[1].querySelector('tbody');
            adminTbody.innerHTML = '';
            
            admins.forEach(admin => {
                let controlsHtml = '';
                let roleDisplayHtml = `<span class="badge badge-slate">${admin.role}</span>`;
                
                if (isSuperAdmin) {
                    const isRoot = admin.email === 'birukayenachew608@gmail.com';
                    roleDisplayHtml = `
                        <select class="form-select select-sm" id="role-select-${admin.id}" ${isRoot ? 'disabled' : ''}>
                            <option value="admin" ${admin.role === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="super_admin" ${admin.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                        </select>
                    `;
                    controlsHtml = `
                        <button class="btn btn-outline btn-sm" onclick="saveRole(${admin.id})">Save</button>
                        ${user.id !== admin.id && !isRoot ? `<button class="btn-clear text-red-500 ml-2 text-sm" onclick="removeAdmin(${admin.id})">Remove</button>` : ''}
                    `;
                }

                adminTbody.innerHTML += `
                    <tr>
                        <td>
                            <div class="user-name">${admin.name}</div>
                            <div class="user-email">${admin.email}</div>
                        </td>
                        <td>
                            ${roleDisplayHtml}
                        </td>
                        <td class="text-right">
                            ${controlsHtml}
                        </td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error('Error loading admins:', error);
        }
    }

    window.saveRole = async (id) => {
        const select = document.getElementById(`role-select-${id}`);
        const role = select.value;
        try {
            const res = await fetch(`${API_URL}/superadmin/admins/${id}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({ role })
            });
            if (res.ok) {
                alert('Role updated successfully');
                loadAdmins();
            } else {
                const err = await res.json();
                alert('Error updating role: ' + err.message);
            }
        } catch (error) {
            console.error('Error updating role:', error);
        }
    };

    window.removeAdmin = async (id) => {
        if (!confirm('Remove this admin?')) return;
        try {
            const res = await fetch(`${API_URL}/superadmin/admins/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });
            if (res.ok) {
                loadAdmins();
            } else {
                const err = await res.json();
                alert('Error removing admin: ' + err.message);
            }
        } catch (error) {
            console.error('Error removing admin:', error);
        }
    };

    inviteBtn.addEventListener('click', async () => {
        const email = prompt('Enter email for the new admin:');
        if (!email) return;
        const name = prompt('Enter name for the new admin:');
        if (!name) return;
        const role = prompt('Enter role (admin, super_admin):', 'admin');
        
        try {
            const res = await fetch(`${API_URL}/superadmin/admins/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({ name, email, role })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`Admin invited successfully!\n\nTemporary Password: ${data.tempPassword}\n\nPlease share this securely with the new admin.`);
                loadAdmins();
            } else {
                const err = await res.json();
                alert('Error inviting admin: ' + err.message);
            }
        } catch (error) {
            console.error('Error inviting admin:', error);
        }
    });

    // Initial load
    loadIps();
    loadAdmins();
});
