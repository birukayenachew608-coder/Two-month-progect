/**
 * Job Seeker Dashboard Controller & RBAC Guard
 * JobLink Ethiopia
 */
(function() {
  function verifySeekerRole() {
    let seekerUser = null;
    let employerUser = null;

    try {
      seekerUser = JSON.parse(localStorage.getItem('seeker_user') || localStorage.getItem('user'));
    } catch (e) {}

    try {
      employerUser = JSON.parse(localStorage.getItem('employer_user'));
    } catch (e) {}

    // Check if an Employer attempts to open seeker.html
    if (employerUser && employerUser.role === 'employer' && (!seekerUser || seekerUser.role !== 'job_seeker')) {
      console.warn('[RBAC] Employer detected on Job Seeker Dashboard. Redirecting to employer.html...');
      window.location.replace('employer.html');
      return;
    }

    if (seekerUser && seekerUser.role && seekerUser.role !== 'job_seeker') {
      console.warn(`[RBAC] Unauthorized role '${seekerUser.role}' on Job Seeker Dashboard.`);
      if (seekerUser.role === 'employer') {
        window.location.replace('employer.html');
      } else {
        window.location.replace('index.html');
      }
      return;
    }

    // Call /api/auth/me to validate session on the backend
    const seekerToken = localStorage.getItem('seeker_token') || localStorage.getItem('token');
    const headers = {};
    if (seekerToken && !seekerToken.includes('cookie')) {
      headers['Authorization'] = 'Bearer ' + seekerToken;
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
        if (validatedUser && validatedUser.role && validatedUser.role !== 'job_seeker') {
          console.warn(`[RBAC] Server validated role is '${validatedUser.role}'. Redirecting...`);
          if (validatedUser.role === 'employer') {
            window.location.replace('employer.html');
          } else {
            window.location.replace('index.html');
          }
        }
      })
      .catch(() => {
        // Fallback or unauthenticated state handled by main modal
      });
  }

  // Execute verification immediately on script execution and on DOM load
  verifySeekerRole();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifySeekerRole);
  }

  window.verifySeekerRole = verifySeekerRole;
})();
