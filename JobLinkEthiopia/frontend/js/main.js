// --- Fetch Interceptor for Auto-Refresh ---
const originalFetch = window.fetch;
window.fetch = async function () {
    let response = await originalFetch.apply(this, arguments);

    // If unauthorized or forbidden (token expired) and we are an admin
    if (response.status === 401 || response.status === 403) {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (token === 'secure_cookie_auth' && userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.role === 'admin' || user.role === 'super_admin') {
                    // Try to refresh
                    const refreshResponse = await originalFetch('/api/admin/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include'
                    });
                    
                    if (refreshResponse.ok) {
                        // Retry original request
                        response = await originalFetch.apply(this, arguments);
                    } else {
                        // Refresh failed, log out
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = 'admin-login.html';
                    }
                }
            } catch (e) {
                console.error('Error during refresh:', e);
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

  // Check Auth Status & Update Header on Load
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user = null;

  if (token && userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }

  let isRegisterMode = false;
  let loginRedirectUrl = 'seeker.html';

  // Page-level access control
  const pathParts = window.location.pathname.split('/');
  const currentPage = pathParts[pathParts.length - 1] || 'index.html';
  const protectedPages = ['seeker.html', 'employer.html', 'admin.html', 'admin-security.html'];

  if (protectedPages.includes(currentPage)) {
    if (!user) {
      if (currentPage === 'employer.html') {
        document.querySelector('main').style.display = 'none';
        isRegisterMode = true;
        loginRedirectUrl = 'employer.html';
        setTimeout(() => {
          if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
          const loginModal = document.getElementById('login-modal');
          if (loginModal) {
            loginModal.classList.add('active');
            loginModal.classList.remove('hidden');
          }
        }, 100);
      } else {
        window.location.href = 'index.html';
        return;
      }
    } else {
      // Role-based redirection for authenticated users
      if (currentPage === 'seeker.html' && user.role !== 'job_seeker') {
        showToast(`You are logged in as a ${user.role.replace('_', ' ')}. Please log out to access other portals.`, 'info');
        window.location.href = user.role === 'employer' ? 'employer.html' : 'admin.html';
        return;
      }
      if (currentPage === 'employer.html' && user.role !== 'employer') {
        showToast(`Please register an employer account to access this dashboard.`, 'info');
        document.querySelector('main').style.display = 'none';
        isRegisterMode = true;
        loginRedirectUrl = 'employer.html';
        setTimeout(() => {
          if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
          const loginModal = document.getElementById('login-modal');
          if (loginModal) {
            loginModal.classList.add('active');
            loginModal.classList.remove('hidden');
          }
        }, 100);
      }
      if ((currentPage === 'admin.html' || currentPage === 'admin-security.html') && user.role !== 'admin' && user.role !== 'super_admin') {
        window.location.href = user.role === 'employer' ? 'employer.html' : 'seeker.html';
        return;
      }
    }
  }

  // Update Header
  if (user) {
    const authActions = document.querySelector('.auth-actions');
    if (authActions) {
      let dashboardUrl = 'seeker.html';
      if (user.role === 'employer') dashboardUrl = 'employer.html';
      else if (user.role === 'admin' || user.role === 'super_admin') dashboardUrl = 'admin.html';

      authActions.innerHTML = `
        <button class="btn btn-icon-small btn-outline" data-action="toggle-theme" title="Toggle Dark Mode" style="border: none; background: transparent">
          <svg style="width: 1.25rem; height: 1.25rem; stroke: var(--slate-600)" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        </button>
        <a href="${dashboardUrl}" class="btn btn-primary" style="margin-left: 10px;">My Dashboard</a>
        <a href="#" data-action="logout" class="logout-link" style="margin-left: 15px;">Logout</a>
      `;

      // Check if user is banned and show notification on dashboard
      fetch('/api/auth/me', {
          headers: { 'Authorization': 'Bearer ' + token }
      }).then(res => res.json()).then(data => {
          if (data && data.account_status === 'banned') {
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
      }).catch(err => console.error(err));
    }
  }



  const alertForm = document.getElementById('alert-form');
  if (alertForm) {
    alertForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const sector = alertForm.querySelectorAll('.form-input')[0].value;
      const location = alertForm.querySelectorAll('.form-input')[1].value;
      const curUserStr = localStorage.getItem('user');
      if (!curUserStr) return showToast('Please login first', 'error');
      const usr = JSON.parse(curUserStr);

      fetch('/api/seeker/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seekerId: usr.id, sector, location, notification: 'daily' })
      }).then(res => res.json()).then(data => {
        showToast(data.message || 'Alert saved!', 'success');
        if (typeof window.loadAlerts === 'function') window.loadAlerts();
      }).catch(err => showToast('Network error', 'error'));
    });
  }

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
        
        const curUserStr = localStorage.getItem('user');
        if (curUserStr) {
          const usr = JSON.parse(curUserStr);
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
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
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
          showToast('Job saved!', 'success');
          break;
        case 'toggle-theme':
          const currentTheme = document.documentElement.getAttribute('data-theme');
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', newTheme);
          localStorage.setItem('theme', newTheme);
          showToast(newTheme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled', 'info');
          break;
        case 'unsave-job':
          const jobCard = btn.closest('.card');
          if (jobCard) jobCard.remove();
          showToast('Removed from saved jobs', 'info');
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

          const curUserStr = localStorage.getItem('user');
          if (curUserStr) {
            try {
              let u = JSON.parse(curUserStr);
              if (pName) u.name = pName.value;
              if (pTitle) u.professional_title = pTitle.value;
              if (pLocation) u.location = pLocation.value;
              if (pBio) u.bio = pBio.value;
              if (pPhone) u.phone = pPhone.value;

              localStorage.setItem('user', JSON.stringify(u));

              // Update dashboard greeting instantly
              const greetingElement = document.querySelector('.user-company-name');
              if (greetingElement && u.name) {
                greetingElement.textContent = `Welcome, ${u.name}!`;
              }
            } catch (err) { }
          }
          showToast('Profile updated successfully!', 'success');
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
          const currentToken = localStorage.getItem('token');
          const currentUserStr = localStorage.getItem('user');
          const redirectAttr = btn.getAttribute('data-redirect');

          if (currentToken && currentUserStr) {
            try {
              const user = JSON.parse(currentUserStr);
              let targetRole = 'job_seeker';
              if (redirectAttr === 'employer.html') targetRole = 'employer';
              if (redirectAttr === 'admin-login.html' || redirectAttr === 'admin.html') targetRole = 'admin';

              if (user.role === targetRole || (user.role === 'super_admin' && targetRole === 'admin')) {
                showToast('You are already logged in!', 'success');
                window.location.href = redirectAttr || 'seeker.html';
                break;
              } else {
                showToast(`Register a new account to access the ${targetRole.replace('_', ' ')} portal.`, 'info');
                btn.setAttribute('data-mode', 'register');
              }
            } catch (e) { }
          }

          const redirect = redirectAttr;
          const mode = btn.getAttribute('data-mode') || 'login';
          loginRedirectUrl = redirect || 'seeker.html';

          isRegisterMode = (mode === 'register');
          updateAuthModalUI();

          const loginModal = document.getElementById('login-modal');
          if (loginModal) {
            loginModal.classList.add('active');
            loginModal.classList.remove('hidden');
          }
          break;
        case 'logout':
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          showToast('Logged out successfully', 'info');
          setTimeout(() => window.location.href = 'index.html', 1000);
          break;
        case 'toggle-auth':
          isRegisterMode = !isRegisterMode;
          updateAuthModalUI();
          break;
        case 'close-login':
          const loginModalElement = document.getElementById('login-modal');
          if (loginModalElement) {
            loginModalElement.classList.remove('active');
            setTimeout(() => loginModalElement.classList.add('hidden'), 300);
          }
          break;
        case 'copy-key':
          showToast('Key copied to clipboard!', 'info');
          break;
        // Removed dummy cases for remove-ip and save-role
        case 'apply-job':
          const curToken = localStorage.getItem('token');
          const usrStr = localStorage.getItem('user');
          if (!curToken || !usrStr) {
            showToast('Please login to apply for jobs', 'error');
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            return;
          }
          const usr = JSON.parse(usrStr);
          if (usr.role !== 'job_seeker') {
            showToast('Only job seekers can apply for jobs', 'error');
            return;
          }
          const jId = btn.getAttribute('data-job-id');
          fetch('/api/applications/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: jId, seeker_id: usr.id })
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


  function updateAuthModalUI() {
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleBtn = document.querySelector('[data-action="toggle-auth"]');
    const nameGroup = document.getElementById('name-group');

    if (!title || !submitBtn || !toggleBtn || !nameGroup) return;

    const roleText = loginRedirectUrl === 'employer.html' ? 'Employer' : 'Job Seeker';

    if (isRegisterMode) {
      title.textContent = `Register as ${roleText}`;
      submitBtn.textContent = 'Register';
      toggleText.textContent = 'Already have an account?';
      toggleBtn.textContent = 'Sign in here';
      nameGroup.style.display = 'block';
    } else {
      title.textContent = `${roleText} Sign In`;
      submitBtn.textContent = 'Sign In';
      toggleText.textContent = "Don't have an account?";
      toggleBtn.textContent = 'Register here';
      nameGroup.style.display = 'none';
    }
  }

  // Handle Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const name = document.getElementById('auth-name').value;

      const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
      const determinedRole = loginRedirectUrl === 'employer.html' ? 'employer' : 'job_seeker';
      const payload = isRegisterMode ? { name, email, password, role: determinedRole } : { email, password, role: determinedRole };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          showToast(isRegisterMode ? 'Registration successful!' : 'Logged in successfully!', 'success');
          if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
          }

          setTimeout(() => {
            if (data.user) {
              if (data.user.role === 'employer') window.location.href = 'employer.html';
              else if (data.user.role === 'admin' || data.user.role === 'super_admin') window.location.href = 'admin.html';
              else window.location.href = 'seeker.html';
            } else {
              window.location.href = loginRedirectUrl;
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

  // Profile Picture Upload Logic
  const profileUpload = document.getElementById('profile-upload');
  const profilePreview = document.getElementById('profile-pic-preview');
  const profileIcon = document.getElementById('profile-pic-icon');
  const removePhotoBtn = document.getElementById('remove-photo');

  if (profileUpload && profilePreview && profileIcon && removePhotoBtn) {
    profileUpload.addEventListener('change', function () {
      const file = this.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          showToast('Image is too large. Max size is 2MB.', 'error');
          this.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
          profilePreview.style.backgroundImage = `url(${e.target.result})`;
          profileIcon.style.display = 'none';

          // Optionally save to local storage so it persists across reloads (frontend only demo)
          localStorage.setItem('profile_pic_data_url', e.target.result);
          showToast('Profile photo updated', 'success');
        }
        reader.readAsDataURL(file);
      }
    });

    removePhotoBtn.addEventListener('click', function () {
      profileUpload.value = '';
      profilePreview.style.backgroundImage = 'none';
      profileIcon.style.display = 'block';
      localStorage.removeItem('profile_pic_data_url');
      showToast('Profile photo removed', 'info');
    });

    // Load existing profile pic on page load
    const savedPic = localStorage.getItem('profile_pic_data_url');
    if (savedPic) {
      profilePreview.style.backgroundImage = `url(${savedPic})`;
      profileIcon.style.display = 'none';
    }
  }

  // Pre-fill profile data if available
  const curUserStr = localStorage.getItem('user');
  if (curUserStr) {
    try {
      const u = JSON.parse(curUserStr);
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

      const keywordInput = document.getElementById('search-keyword')?.value.toLowerCase() || '';
      const locationInput = document.getElementById('search-location')?.value || '';

      const jobCards = document.querySelectorAll('.job-grid .card');
      let foundCount = 0;

      jobCards.forEach(card => {
        const titleEl = card.querySelector('.job-card-title');
        const companyEl = card.querySelector('.job-company');

        const title = titleEl ? titleEl.textContent.toLowerCase() : '';
        const company = companyEl ? companyEl.textContent.toLowerCase() : '';

        const detailItems = card.querySelectorAll('.job-detail-item');
        const locationText = detailItems.length > 0 ? detailItems[0].textContent.trim() : '';

        const matchesKeyword = title.includes(keywordInput) || company.includes(keywordInput);
        const matchesLocation = locationInput === "" || locationText.includes(locationInput);

        if (matchesKeyword && matchesLocation) {
          card.style.display = 'block';
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
    postJobForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('job-title')?.value;
      const company_name = document.getElementById('job-company')?.value;
      const location = document.getElementById('job-location')?.value;
      const deadline = document.getElementById('job-deadline')?.value;
      const description = document.querySelector('textarea')?.value;
      const salary = document.getElementById('job-salary')?.value;
      const apply_email = document.getElementById('job-apply-email')?.value;
      const apply_link = document.getElementById('job-apply-link')?.value;

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        showToast('You must be logged in to post a job', 'error');
        return;
      }
      const user = JSON.parse(userStr);

      try {
        const response = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employer_id: user.id,
            title, company_name, location, deadline, description,
            salary, apply_email, apply_link,
            job_type: 'Full-time'
          })
        });

        if (response.ok) {
          showToast('Job posted successfully! It will appear on the home page.', 'success');
          postJobForm.reset();
          switchTab('overview-tab');
        } else {
          showToast('Failed to post job', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
    });
  }

  // Fetch jobs from backend on Home Page
  const jobGrid = document.querySelector('.main-grid .job-grid');
  if (jobGrid) {
    const loadJobs = async () => {
      try {
        const response = await fetch('/api/jobs');
        if (!response.ok) return;
        const jobs = await response.json();

        jobGrid.innerHTML = ''; // Clear default hardcoded jobs to show DB ones (optional, but let's prepend)

        if (jobs.length === 0) {
          jobGrid.innerHTML = '<p class="text-slate-500 text-center py-8">No recent job postings found.</p>';
          return;
        }

        jobs.forEach(job => {
          let companyInitials = 'CO';
          if (job.company_name && job.company_name.length >= 2) {
            companyInitials = job.company_name.substring(0, 2).toUpperCase();
          }

          const jobHtml = `
                <div class="card card-hover custom-job-card">
                  <div class="job-card-header">
                    <div class="job-card-meta">
                      <div class="card-icon-bg card-icon-slate">${companyInitials}</div>
                      <span class="badge badge-green">${job.job_type || 'Full-time'}</span>
                    </div>
                    <div class="job-card-actions">
                      <span class="job-post-time">New</span>
                      <button onclick="saveJob(${job.id})" class="btn btn-outline btn-icon-small">
                        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
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
                      </svg>Deadline: ${new Date(job.deadline).toLocaleDateString() || 'Ongoing'}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button class="btn btn-outline flex-grow" onclick="window.location.href='job-details.html?id=${job.id}'">View Details</button>
                    <button onclick="applyForJob(${job.id})" class="btn btn-primary flex-grow">Apply</button>
                  </div>
                </div>
              `;
          jobGrid.insertAdjacentHTML('afterbegin', jobHtml);
        });
      } catch (e) {
        console.error("Error loading jobs", e);
      }
    };
    loadJobs();
  }

  // Fetch applications on Employer Dashboard
  const pendingColumn = document.querySelector('.kanban-cards[data-column="pending"]');
  const hiredColumn = document.querySelector('.kanban-cards[data-column="hired"]');
  
  if (pendingColumn || hiredColumn) {
    const loadEmployerApplications = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      try {
        const response = await fetch('/api/applications/employer/' + user.id);
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
          }

          if (app.status === 'Pending' || app.status === 'pending') {
            pendingCount++;
            const cardHtml = `
                    <div class="kanban-card" draggable="true" data-id="${app.id}">
                       <div class="flex items-start gap-3 mb-3">
                         <div class="card-icon-bg card-icon-circle card-icon-slate card-icon-sm">${initials}</div>
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
                         <div class="card-icon-bg card-icon-circle card-icon-green card-icon-sm">${initials}</div>
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

    const loadEmployerAnalytics = () => {
      const statViews = document.getElementById('stat-job-views');
      const statApps = document.getElementById('stat-total-applicants');
      const statConv = document.getElementById('stat-conversion-rate');
      const statActive = document.getElementById('stat-active-postings');

      if (statViews && statApps && statConv && statActive) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            fetch(`/api/jobs/employer/${user.id}/analytics`)
              .then(res => res.json())
              .then(data => {
                statViews.textContent = (data.totalJobViews || 0).toLocaleString();
                statApps.textContent = (data.totalApplicants || 0).toLocaleString();
                statConv.textContent = data.conversionRate || '0%';
                statActive.textContent = (data.activePostings || 0).toLocaleString();
              })
              .catch(console.error);
          } catch(e) {}
        }
      }
    };
    loadEmployerAnalytics();
  }

  // Fetch Seeker Dashboard Data
  const seekerAppsTable = document.querySelector('#applications .table tbody');
  const savedJobsGrid = document.querySelector('#saved-jobs .dashboard-grid');
  const recommendedJobsGrid = document.querySelector('#applications .dashboard-grid');

  if (seekerAppsTable || savedJobsGrid || recommendedJobsGrid) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'job_seeker') {
        
        // 1. Load Applications
        if (seekerAppsTable) {
          fetch(`/api/applications/seeker/${user.id}`)
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
          fetch(`/api/jobs/saved/${user.id}`)
            .then(res => res.json())
            .then(jobs => {
              savedJobsGrid.innerHTML = '';
              if (jobs.length === 0) {
                savedJobsGrid.innerHTML = '<p class="text-slate-500 py-4">No saved jobs.</p>';
              } else {
                jobs.forEach(job => {
                  savedJobsGrid.innerHTML += `
                    <div class="card" id="saved-job-${job.job_id}">
                      <div class="flex justify-between items-start mb-3">
                        <div>
                          <h3 class="font-bold text-slate-900">${job.title}</h3>
                          <p class="text-sm text-slate-500">${job.company_name} • ${job.location}</p>
                        </div>
                        <button class="text-red-500 hover:text-red-700" title="Remove from saved" onclick="unsaveJob(${job.job_id})">
                          <svg style="width: 1.5rem; height: 1.5rem;" class="fill-current" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                        </button>
                      </div>
                      <div class="flex gap-2 mb-4">
                        <span class="badge badge-slate text-xs" style="font-size: 0.7rem;">${job.job_type}</span>
                      </div>
                      <button class="btn btn-primary btn-block btn-sm" onclick="applyForJob(${job.job_id})">Apply Now</button>
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
                      <h4 class="font-bold text-slate-900 text-sm">${job.title}</h4>
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
        window.loadAlerts = function() {
          const alertsList = document.querySelector('#alerts .dashboard-grid .card:last-child');
          if (alertsList) {
            fetch(`/api/seeker/alerts/${user.id}`)
              .then(res => res.json())
              .then(alerts => {
                // Keep the title, replace the cards
                const titleNode = alertsList.querySelector('h2');
                if (titleNode) {
                  titleNode.textContent = `Active Alerts (${alerts.length})`;
                  alertsList.innerHTML = '';
                  alertsList.appendChild(titleNode);
                  
                  if (alerts.length === 0) {
                    alertsList.insertAdjacentHTML('beforeend', '<p class="text-slate-500 py-4">No active alerts.</p>');
                  } else {
                    alerts.forEach(alert => {
                      alertsList.insertAdjacentHTML('beforeend', `
                        <div class="alert-card" id="alert-${alert.id}">
                          <div class="flex justify-between items-start mb-2">
                              <h4 class="font-bold text-slate-900 text-sm">${alert.keyword}</h4>
                              <span class="badge badge-blue">${alert.frequency}</span>
                          </div>
                          <p class="text-xs text-slate-500 mb-3">${alert.location || 'Any location'} • Full-time & Internship</p>
                          <div class="alert-card-footer">
                              <span class="font-medium text-slate-700">Email & Telegram</span>
                              <button onclick="deleteAlert(${alert.id})" class="btn-clear text-red-600">Delete</button>
                          </div>
                        </div>
                      `);
                    });
                  }
                }
              }).catch(console.error);
          }
        };
        window.loadAlerts();

        const alertForm = document.getElementById('alert-form');
        if (alertForm) {
          alertForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const sector = document.getElementById('alert-sector').value;
            const location = document.getElementById('alert-location').value;
            const hasEmail = document.getElementById('alert-email').checked;
            const hasTelegram = document.getElementById('alert-telegram').checked;
            
            let frequency = 'daily';
            if (hasEmail && hasTelegram) frequency = 'instant'; // mock mapping
            
            fetch('/api/seeker/alerts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                seekerId: user.id,
                sector: sector,
                location: location,
                notification: frequency
              })
            })
            .then(res => res.json())
            .then(data => {
              if (data.message === 'Alert created successfully') {
                showToast('Alert preferences saved!', 'success');
                window.loadAlerts(); // reload alerts list
              } else {
                showToast(data.message || 'Error saving alert', 'error');
              }
            })
            .catch(err => showToast('Network error', 'error'));
          });
        }

      }
    }
  }
});

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

window.deleteAlert = function(id) {
  if (confirm('Delete this alert?')) {
    fetch(`/api/seeker/alerts/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        showToast('Alert removed', 'success');
        const alertCard = document.getElementById(`alert-${id}`);
        if (alertCard) alertCard.remove();
      }).catch(err => showToast('Network error', 'error'));
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
  showToast('Fetching profile...', 'info');
  fetch(`/api/admin/seekers`) 
    .then(res => res.json())
    .then(seekers => {
      if (Array.isArray(seekers)) {
        const seeker = seekers.find(s => s.id === seekerId);
        if (seeker) {
          alert(`CANDIDATE PROFILE:\n\nName: ${seeker.name}\nEmail: ${seeker.email}`);
        } else {
          alert('Candidate profile details not available.');
        }
      } else {
        alert('Could not fetch candidate details.');
      }
    }).catch(err => alert('Network error while fetching profile.'));
};
window.applyForJob = function (jId) {
  const curToken = localStorage.getItem('token');
  const usrStr = localStorage.getItem('user');
  if (!curToken || !usrStr) {
    showToast('Please login to apply for jobs', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }
  const usr = JSON.parse(usrStr);
  if (usr.role !== 'job_seeker') {
    showToast('Only job seekers can apply for jobs', 'error');
    return;
  }

  // Check if already applied
  fetch(`/api/applications/seeker/${usr.id}`)
    .then(res => res.json())
    .then(apps => {
      const alreadyApplied = apps.some(app => app.job_id == jId);
      if (alreadyApplied) {
        showToast('You have already applied for this job', 'info');
        return;
      }
      
      // Inject modal dynamically if it doesn't exist
      let applyModal = document.getElementById('apply-modal');
      if (!applyModal) {
        applyModal = document.createElement('div');
        applyModal.id = 'apply-modal';
        applyModal.className = 'modal';
        applyModal.innerHTML = `
          <div class="modal-content" style="max-width: 400px; text-align: center;">
            <h3 class="text-xl font-bold text-slate-900 mb-4">Confirm Application</h3>
            <p class="text-slate-600 mb-8 text-lg">Are you sure you want to apply for this job?</p>
            <div class="flex gap-4 justify-center">
              <button id="apply-cancel-btn" class="btn btn-outline px-6 text-lg">Cancel</button>
              <button id="apply-confirm-btn" class="btn btn-primary px-8 text-lg">Yes</button>
            </div>
          </div>
        `;
        document.body.appendChild(applyModal);
      }
      
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
      });
      
      newConfirmBtn.addEventListener('click', () => {
        newConfirmBtn.disabled = true;
        newConfirmBtn.textContent = 'Applying...';
        
        fetch('/api/applications/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jId, seeker_id: usr.id })
        }).then(res => res.json()).then(data => {
          applyModal.classList.remove('active');
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
    fetch(`/api/applications/${appId}`, { method: 'DELETE' })
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

window.saveJob = function(jobId) {
  const curToken = localStorage.getItem('token');
  const usrStr = localStorage.getItem('user');
  if (!curToken || !usrStr) return showToast('Please login first', 'error');
  const usr = JSON.parse(usrStr);
  if (usr.role !== 'job_seeker') return showToast('Only job seekers can save jobs', 'error');
  
  fetch('/api/jobs/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, seeker_id: usr.id })
  }).then(res => res.json()).then(data => {
    showToast(data.message || 'Saved!', 'success');
  }).catch(err => showToast('Network error', 'error'));
};

window.unsaveJob = function(jobId) {
  const usrStr = localStorage.getItem('user');
  if (!usrStr) return;
  const usr = JSON.parse(usrStr);
  
  fetch(`/api/jobs/saved/${usr.id}/${jobId}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      showToast('Job removed from saved list', 'info');
      const card = document.getElementById(`saved-job-${jobId}`);
      if (card) card.remove();
    }).catch(err => showToast('Network error', 'error'));
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
  showToast('Fetching profile...', 'info');
  fetch(`/api/seeker/profile/${seekerId}`) 
    .then(res => {
      if (!res.ok) throw new Error('Profile not found');
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
        
        // Generate initials
        let initials = 'U';
        if (seeker.name && seeker.name.length >= 2) {
           initials = seeker.name.substring(0, 2).toUpperCase();
        }
        
        let avatarHtml = `<div class="card-icon-bg card-icon-circle bg-primary-900 text-primary-200 mb-4 flex items-center justify-center font-bold" style="width: 72px; height: 72px; font-size: 1.75rem; background: var(--primary-900); color: var(--primary-200); border-radius: 50%;">${initials}</div>`;
        if (seeker.profile_photo_url) {
           avatarHtml = `<img src="${seeker.profile_photo_url}" alt="${seeker.name}" class="mb-4 shadow-md" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-500);" />`;
        }
        
        const cvHtml = seeker.resume_file_url 
           ? `<a href="${seeker.resume_file_url}" target="_blank" class="btn btn-primary w-full mt-2" style="padding: 0.75rem; font-weight: 600;">Download CV</a>`
           : `<p class="text-xs text-slate-400 mt-2 italic text-center">No CV uploaded</p>`;
           
        profileModal.innerHTML = `
          <div class="modal-content card" style="max-width: 450px; background: #0f172a; color: #f8fafc; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div class="flex justify-between items-center mb-6 pb-4" style="border-bottom: 1px solid #1e293b;">
              <h2 class="text-xl font-bold flex items-center gap-2 text-white">
                 <svg class="icon-md text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                 Candidate Profile
              </h2>
              <button class="btn-clear text-slate-400 hover:text-white transition-colors" onclick="const m=document.getElementById('profile-modal'); m.classList.remove('active'); setTimeout(()=>m.classList.add('hidden'), 300);">
                <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div class="flex flex-col items-center mb-6">
               ${avatarHtml}
               <h3 class="text-2xl font-bold text-white mb-1">${seeker.name || 'Unknown'}</h3>
               <p class="text-primary-400 font-medium">${seeker.professional_title || 'Candidate'}</p>
            </div>
            
            <div class="flex flex-col gap-4">
               <div class="p-4 rounded-lg" style="background-color: #1e293b !important; border: 1px solid #334155 !important;">
                  <p class="text-xs uppercase tracking-wider font-semibold mb-3" style="color: #94a3b8 !important;">Contact Info</p>
                  <div class="flex items-center gap-3 mb-3">
                     <div class="p-2 rounded-full" style="background-color: #334155 !important;">
                       <svg class="icon-sm" style="color: #cbd5e1 !important;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                     </div>
                     <span class="text-sm font-medium" style="color: #e2e8f0 !important;">${seeker.email || 'N/A'}</span>
                  </div>
                  <div class="flex items-center gap-3 mb-3">
                     <div class="p-2 rounded-full" style="background-color: #334155 !important;">
                       <svg class="icon-sm" style="color: #cbd5e1 !important;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                     </div>
                     <span class="text-sm font-medium" style="color: #e2e8f0 !important;">${seeker.phone || 'Not provided'}</span>
                  </div>
                  <div class="flex items-center gap-3">
                     <div class="p-2 rounded-full" style="background-color: #334155 !important;">
                       <svg class="icon-sm" style="color: #cbd5e1 !important;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                     </div>
                     <span class="text-sm font-medium" style="color: #e2e8f0 !important;">${seeker.location || 'Not provided'}</span>
                  </div>
               </div>
               
               <div class="p-4 rounded-lg" style="background-color: #1e293b !important; border: 1px solid #334155 !important;">
                  <p class="text-xs uppercase tracking-wider font-semibold mb-2" style="color: #94a3b8 !important;">About</p>
                  <p class="text-sm leading-relaxed" style="color: #cbd5e1 !important;">${seeker.bio || 'No bio provided.'}</p>
               </div>
               
               <div class="mt-2">
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
    }).catch(err => showToast('Network error while fetching profile.', 'error'));
};

// Toast Notification System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const typeClass = type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : 'toast-info';

  toast.className = `toast ${typeClass}`;

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
  });

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
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
}

// Handle dynamic report job clicks
document.addEventListener('click', async (e) => {
    const reportBtn = e.target.closest('[data-action="report-job"]');
    if (reportBtn) {
        e.preventDefault();
        const jobId = reportBtn.getAttribute('data-job-id');
        if (!jobId) return;
        
        if (!confirm('Are you sure you want to report this job as inappropriate?')) return;
        
        try {
            const res = await fetch(`/api/jobs/${jobId}/report`, {
                method: 'POST'
            });
            if (res.ok) {
                showToast('Job reported successfully. Admin will review it.', 'success');
                reportBtn.innerHTML = '<span style="font-size: 10px; padding: 2px;">Reported</span>';
                reportBtn.disabled = true;
                reportBtn.style.color = '#ef4444';
                reportBtn.style.borderColor = 'transparent';
            } else {
                showToast('Failed to report job.', 'error');
            }
        } catch (error) {
            console.error('Error reporting job:', error);
            showToast('Network error', 'error');
        }
    }
});
