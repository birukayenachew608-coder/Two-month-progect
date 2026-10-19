document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = '/api/admin';

    // Elements
    const adminAvatarPreview = document.getElementById('admin-avatar-preview');
    const adminAvatarImg = document.getElementById('admin-avatar-img');
    const adminAvatarInitials = document.getElementById('admin-avatar-initials');
    const adminAvatarInput = document.getElementById('admin-avatar-input');
    const uploadAvatarBtn = document.getElementById('upload-avatar-btn');
    const removeAvatarBtn = document.getElementById('remove-avatar-btn');
    const adminAvatar = document.getElementById('admin-avatar');
    const summaryName = document.getElementById('summary-name');
    const summaryEmail = document.getElementById('summary-email');
    const summaryRoleBadge = document.getElementById('summary-role-badge');
    const summaryRoleText = document.getElementById('summary-role-text');
    const summary2Fa = document.getElementById('summary-2fa');
    const summaryCreated = document.getElementById('summary-created');
    const headerAdminBadge = document.getElementById('header-admin-badge');
    const btnSecuritySettings = document.getElementById('btn-security-settings');

    const profileForm = document.getElementById('admin-profile-form');
    const inputName = document.getElementById('admin-name');
    const inputEmail = document.getElementById('admin-email');
    const selectRole = document.getElementById('admin-role');

    const passwordForm = document.getElementById('admin-password-form');
    const inputCurrentPassword = document.getElementById('current-password');
    const inputNewPassword = document.getElementById('new-password');
    const inputConfirmPassword = document.getElementById('confirm-password');

    let currentAdmin = null;

    // Toast helper
    function showNotification(msg, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            alert(msg);
        }
    }

    // 1. Lift initial anti-FOUC styling to show loading screen
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
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            sessionStorage.clear();
        } catch (e) {}
        window.location.replace('/admin-login.html');
    }

    // Auth Guard & Fetch Profile with Silent Refresh
    try {
        const storedToken = sessionStorage.getItem('accessToken') || sessionStorage.getItem('token') ||
                            localStorage.getItem('accessToken') || localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (storedToken && storedToken !== 'secure_cookie_auth') {
            headers['Authorization'] = `Bearer ${storedToken}`;
        }

        let verifyRes = await fetch(`${API_URL}/profile`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });

        if (!verifyRes.ok) {
            // Attempt silent refresh
            if (typeof window.silentRefreshAuth === 'function') {
                await window.silentRefreshAuth('admin');
            } else {
                await fetch('/api/admin/refresh', { method: 'POST', credentials: 'include' });
            }

            verifyRes = await fetch(`${API_URL}/profile`, {
                method: 'GET',
                headers,
                credentials: 'include'
            });
        }

        if (!verifyRes.ok) {
            denyAccess();
            return;
        }

        currentAdmin = await verifyRes.json();
        revealDashboard();
        renderAdminProfile(currentAdmin);
    } catch (err) {
        console.error('Auth verification error:', err);
        denyAccess();
        return;
    }

    // 2. Render Profile Details
    function renderAdminProfile(admin) {
        if (!admin) return;

        // Initials & Profile Photo
        let initials = 'AD';
        if (admin.name && admin.name.trim().length >= 2) {
            initials = admin.name.trim().substring(0, 2).toUpperCase();
        } else if (admin.name && admin.name.trim().length === 1) {
            initials = admin.name.trim().toUpperCase();
        }
        if (adminAvatarInitials) adminAvatarInitials.textContent = initials;
        if (adminAvatar) adminAvatar.textContent = initials;

        const hasPhoto = admin.profile_photo && typeof admin.profile_photo === 'string' && admin.profile_photo.trim() !== '' && admin.profile_photo !== 'null';
        if (adminAvatarImg) {
            if (hasPhoto) {
                adminAvatarImg.src = admin.profile_photo;
                adminAvatarImg.style.display = 'block';
                if (adminAvatarInitials) adminAvatarInitials.style.display = 'none';
            } else {
                adminAvatarImg.style.display = 'none';
                adminAvatarImg.src = '';
                if (adminAvatarInitials) adminAvatarInitials.style.display = 'flex';
            }
        }

        if (summaryName) summaryName.textContent = admin.name || 'Admin User';
        if (summaryEmail) summaryEmail.textContent = admin.email || '';
        if (inputName) inputName.value = admin.name || '';
        if (inputEmail) inputEmail.value = admin.email || '';

        // Role Dropdown & Badges
        const isSuperAdmin = admin.role === 'super_admin';
        if (selectRole) {
            selectRole.value = isSuperAdmin ? 'super_admin' : 'admin';
            // Disable changing role if not authorized
            const isRoot = admin.email === 'birukayenachew608@gmail.com';
            if (!isSuperAdmin || isRoot) {
                selectRole.setAttribute('disabled', 'true');
            }
        }

        if (summaryRoleBadge) {
            summaryRoleBadge.innerHTML = isSuperAdmin
                ? '<span class="badge badge-super-admin">Super Admin</span>'
                : '<span class="badge badge-blue">Admin</span>';
        }
        if (headerAdminBadge) {
            headerAdminBadge.textContent = isSuperAdmin ? 'Super Admin' : 'Admin';
            headerAdminBadge.className = isSuperAdmin ? 'badge badge-super-admin' : 'badge badge-blue';
        }
        if (summaryRoleText) {
            summaryRoleText.textContent = isSuperAdmin ? 'Super Administrator' : 'Administrator';
        }

        // Show/hide Super Admin Settings button
        if (btnSecuritySettings) {
            btnSecuritySettings.style.display = isSuperAdmin ? 'inline-flex' : 'none';
        }

        // Created At
        if (summaryCreated && admin.created_at) {
            const d = new Date(admin.created_at);
            summaryCreated.textContent = !isNaN(d.getTime()) ? d.toLocaleDateString() : '-';
        }

        // 2FA status
        if (summary2Fa) {
            summary2Fa.innerHTML = admin.is_2fa_enabled
                ? '<i class="fa-solid fa-circle-check text-green-500 mr-1"></i> Active'
                : '<i class="fa-solid fa-circle-exclamation text-amber-500 mr-1"></i> Inactive';
            summary2Fa.className = admin.is_2fa_enabled ? 'profile-meta-val text-green-500 font-semibold' : 'profile-meta-val text-amber-500 font-semibold';
        }
    }

    // 3. Avatar Upload & Remove Handlers
    if (uploadAvatarBtn && adminAvatarInput) {
        uploadAvatarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            adminAvatarInput.click();
        });
    }

    if (adminAvatarPreview && adminAvatarInput) {
        adminAvatarPreview.addEventListener('click', (e) => {
            // Forward click to input unless clicked directly on a button
            if (!e.target.closest('#upload-avatar-btn') && !e.target.closest('#remove-avatar-btn')) {
                adminAvatarInput.click();
            }
        });
    }

    if (adminAvatarInput) {
        adminAvatarInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            // Validate max size: 5MB
            if (file.size > 5 * 1024 * 1024) {
                showNotification('File exceeds maximum size of 5MB', 'error');
                adminAvatarInput.value = '';
                return;
            }

            // Validate image mime type
            if (!file.type.startsWith('image/')) {
                showNotification('Please select a valid image file (JPG, PNG, GIF, WEBP)', 'error');
                adminAvatarInput.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('profile_photo', file);

            const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const originalBtnHtml = uploadAvatarBtn ? uploadAvatarBtn.innerHTML : '';
            if (uploadAvatarBtn) {
                uploadAvatarBtn.disabled = true;
                uploadAvatarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs mr-1"></i> Uploading...';
            }

            try {
                const res = await fetch(`${API_URL}/profile/upload`, {
                    method: 'POST',
                    headers,
                    credentials: 'include',
                    body: formData
                });

                const data = await res.json();
                if (res.ok) {
                    showNotification(data.message || 'Profile photo updated successfully', 'success');
                    const photoUrl = data.profile_photo || data.profile_photo_url || data.fileUrl;
                    if (adminAvatarImg) {
                        adminAvatarImg.src = photoUrl;
                        adminAvatarImg.style.display = 'block';
                    }
                    if (adminAvatarInitials) {
                        adminAvatarInitials.style.display = 'none';
                    }
                    if (currentAdmin) {
                        currentAdmin.profile_photo = photoUrl;
                    }
                    // Sync localStorage
                    try {
                        const userStr = localStorage.getItem('user');
                        if (userStr) {
                            const u = JSON.parse(userStr);
                            u.profile_photo = photoUrl;
                            localStorage.setItem('user', JSON.stringify(u));
                        }
                    } catch (err) {}
                } else {
                    showNotification(data.message || 'Failed to upload photo', 'error');
                }
            } catch (err) {
                console.error('Error uploading avatar:', err);
                showNotification('Network error during upload', 'error');
            } finally {
                adminAvatarInput.value = '';
                if (uploadAvatarBtn) {
                    uploadAvatarBtn.disabled = false;
                    uploadAvatarBtn.innerHTML = originalBtnHtml;
                }
            }
        });
    }

    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const originalBtnHtml = removeAvatarBtn.innerHTML;
            removeAvatarBtn.disabled = true;
            removeAvatarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs mr-1"></i> Removing...';

            try {
                const res = await fetch(`${API_URL}/profile/photo`, {
                    method: 'DELETE',
                    headers,
                    credentials: 'include'
                });

                const data = await res.json();
                if (res.ok) {
                    showNotification(data.message || 'Profile photo removed', 'success');
                    if (adminAvatarImg) {
                        adminAvatarImg.src = '';
                        adminAvatarImg.style.display = 'none';
                    }
                    if (adminAvatarInitials) {
                        adminAvatarInitials.style.display = 'flex';
                    }
                    if (currentAdmin) {
                        currentAdmin.profile_photo = null;
                    }
                    if (adminAvatarInput) {
                        adminAvatarInput.value = '';
                    }
                    // Sync localStorage
                    try {
                        const userStr = localStorage.getItem('user');
                        if (userStr) {
                            const u = JSON.parse(userStr);
                            delete u.profile_photo;
                            localStorage.setItem('user', JSON.stringify(u));
                        }
                    } catch (err) {}
                } else {
                    showNotification(data.message || 'Failed to remove photo', 'error');
                }
            } catch (err) {
                console.error('Error removing avatar:', err);
                showNotification('Network error during photo removal', 'error');
            } finally {
                removeAvatarBtn.disabled = false;
                removeAvatarBtn.innerHTML = originalBtnHtml;
            }
        });
    }

    // 3. Handle Profile Save
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = inputName.value.trim();
            const email = inputEmail.value.trim();
            const role = selectRole ? selectRole.value : undefined;

            if (!name || !email) {
                showNotification('Name and email are required', 'error');
                return;
            }

            const btnSave = document.getElementById('btn-save-profile');
            if (btnSave) btnSave.disabled = true;

            const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            try {
                const res = await fetch(`${API_URL}/profile`, {
                    method: 'PUT',
                    headers,
                    credentials: 'include',
                    body: JSON.stringify({ name, email, role })
                });

                const data = await res.json();
                if (res.ok) {
                    showNotification(data.message || 'Profile updated successfully', 'success');
                    if (summaryName) summaryName.textContent = name;
                    if (summaryEmail) summaryEmail.textContent = email;
                    let initials = name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
                    if (adminAvatarInitials) adminAvatarInitials.textContent = initials;
                    if (adminAvatar) adminAvatar.textContent = initials;

                    // Update role indicators if returned
                    if (data.user && data.user.role) {
                        const isSuperAdmin = data.user.role === 'super_admin';
                        if (summaryRoleBadge) {
                            summaryRoleBadge.innerHTML = isSuperAdmin
                                ? '<span class="badge badge-super-admin">Super Admin</span>'
                                : '<span class="badge badge-blue">Admin</span>';
                        }
                        if (headerAdminBadge) {
                            headerAdminBadge.textContent = isSuperAdmin ? 'Super Admin' : 'Admin';
                            headerAdminBadge.className = isSuperAdmin ? 'badge badge-super-admin' : 'badge badge-blue';
                        }
                        if (summaryRoleText) {
                            summaryRoleText.textContent = isSuperAdmin ? 'Super Administrator' : 'Administrator';
                        }
                        if (btnSecuritySettings) {
                            btnSecuritySettings.style.display = isSuperAdmin ? 'inline-flex' : 'none';
                        }
                    }

                    // Update localStorage user object if present
                    const localUserStr = localStorage.getItem('user');
                    if (localUserStr) {
                        try {
                            const localUser = JSON.parse(localUserStr);
                            localUser.name = name;
                            localUser.email = email;
                            if (data.user && data.user.role) localUser.role = data.user.role;
                            localStorage.setItem('user', JSON.stringify(localUser));
                        } catch (err) {}
                    }
                } else {
                    showNotification(data.message || 'Failed to update profile', 'error');
                }
            } catch (err) {
                console.error('Error saving profile:', err);
                showNotification('Network error occurred', 'error');
            } finally {
                if (btnSave) btnSave.disabled = false;
            }
        });
    }

    // 4. Handle Password Update
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = inputCurrentPassword.value;
            const newPassword = inputNewPassword.value;
            const confirmPassword = inputConfirmPassword.value;

            if (!currentPassword) {
                showNotification('Current password is required', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showNotification('New password and confirm password do not match', 'error');
                return;
            }

            const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!strongPasswordRegex.test(newPassword)) {
                showNotification('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.', 'error');
                return;
            }

            const btnUpdate = document.getElementById('btn-update-password');
            if (btnUpdate) btnUpdate.disabled = true;

            const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            try {
                const res = await fetch(`${API_URL}/change-password`, {
                    method: 'POST',
                    headers,
                    credentials: 'include',
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                const data = await res.json();
                if (res.ok) {
                    showNotification(data.message || 'Password changed successfully', 'success');
                    passwordForm.reset();
                } else {
                    showNotification(data.message || 'Failed to change password', 'error');
                }
            } catch (err) {
                console.error('Error changing password:', err);
                showNotification('Network error occurred', 'error');
            } finally {
                if (btnUpdate) btnUpdate.disabled = false;
            }
        });
    }

    // 5. Logout Listener
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
            } catch (err) {}
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }
});
