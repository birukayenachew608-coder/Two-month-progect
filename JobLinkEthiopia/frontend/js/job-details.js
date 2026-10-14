/**
 * Job Details Page Handler
 * JobLink Ethiopia - Separation of Concerns
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  const loadingEl = document.getElementById('loading');
  const jobContentEl = document.getElementById('job-content');

  if (!jobId) {
    if (loadingEl) {
      loadingEl.innerHTML = '<p class="text-red-500">Invalid job ID.</p>';
    }
    return;
  }

  fetch(`/api/jobs/${jobId}`)
    .then(res => {
      if (!res.ok) throw new Error('Job not found');
      return res.json();
    })
    .then(job => {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (jobContentEl) jobContentEl.classList.remove('hidden');

      const titleEl = document.getElementById('j-title');
      const companyEl = document.getElementById('j-company');
      const typeEl = document.getElementById('j-type');
      const locationEl = document.getElementById('j-location');
      const salaryEl = document.getElementById('j-salary');
      const descEl = document.getElementById('j-description');
      const postedEl = document.getElementById('j-posted');
      const deadlineEl = document.getElementById('j-deadline');
      const editedBadge = document.getElementById('j-edited-badge');

      if (titleEl) titleEl.textContent = job.title || 'Untitled';
      if (companyEl) companyEl.textContent = job.company_name || 'Anonymous';
      if (typeEl) {
        typeEl.textContent = job.job_type || 'Full-time';
        const typeBadgeClass = (typeof window.getJobTypeBadgeClass === 'function')
          ? window.getJobTypeBadgeClass(job.job_type)
          : ((job.job_type === 'Part-time') ? 'badge-blue' : ((job.job_type === 'Contract') ? 'badge-purple' : ((job.job_type === 'Internship') ? 'badge-teal' : ((job.job_type === 'Freelance') ? 'badge-orange' : 'badge-green'))));
        typeEl.className = `badge ${typeBadgeClass} font-normal`;
      }
      if (locationEl) locationEl.textContent = job.location || 'Not specified';
      if (salaryEl) salaryEl.textContent = job.salary || 'Salary not specified';
      if (descEl) descEl.textContent = job.description || 'No description provided.';
      if (postedEl) postedEl.textContent = job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A';
      if (deadlineEl) deadlineEl.textContent = job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A';

      const createdTime = new Date(job.created_at).getTime();
      const updatedTime = new Date(job.updated_at).getTime();
      if (editedBadge && updatedTime > createdTime + 1000) {
        editedBadge.classList.remove('hidden');
      }

      const btnApply = document.getElementById('btn-apply');
      if (btnApply) {
        btnApply.addEventListener('click', () => {
          if (typeof window.applyForJob === 'function') {
            window.applyForJob(job.id);
          } else {
            sessionStorage.setItem('pendingApplyJobId', String(job.id));
            if (typeof showToast === 'function') {
              showToast('Please login as a job seeker to apply for jobs', 'error');
            }
            setTimeout(() => {
              window.location.href = 'index.html?login=seeker';
            }, 2000);
          }
        });
      }

      const btnSave = document.getElementById('btn-save');
      if (btnSave) {
        const updateSaveBtnState = () => {
          const isSaved = window.userSavedJobIds && window.userSavedJobIds.has(Number(job.id));
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          const bookmarkColor = isDark ? '#ffffff' : '#000000';
          if (isSaved) {
            btnSave.classList.add('saved');
            btnSave.innerHTML = `<i class="fa-solid fa-bookmark bookmark-icon mr-2" style="color: ${bookmarkColor};"></i> Saved`;
          } else {
            btnSave.classList.remove('saved');
            btnSave.innerHTML = `<i class="fa-regular fa-bookmark bookmark-icon mr-2" style="color: ${bookmarkColor};"></i> Save Job`;
          }
        };

        updateSaveBtnState();

        btnSave.addEventListener('click', async () => {
          if (typeof window.toggleSaveJob === 'function') {
            await window.toggleSaveJob(job.id, btnSave);
            updateSaveBtnState();
          } else if (typeof window.saveJob === 'function') {
            await window.saveJob(job.id, btnSave);
            updateSaveBtnState();
          }
        });
      }

      const btnCompanyProfile = document.getElementById('btn-company-profile');
      const employerId = job.employer_id || job.company_id;

      if (btnCompanyProfile) {
        if (employerId) {
          const profileUrl = `employer-profile.html?id=${encodeURIComponent(employerId)}`;
          btnCompanyProfile.setAttribute('href', profileUrl);
          btnCompanyProfile.addEventListener('click', (e) => {
            window.location.href = profileUrl;
          });
        } else {
          btnCompanyProfile.setAttribute('href', '#');
          btnCompanyProfile.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.showToast === 'function') {
              window.showToast('Company profile details are not available for this job posting.', 'info');
            }
          });
        }
      }
    })
    .catch(err => {
      if (loadingEl) {
        loadingEl.innerHTML = '<p class="text-red-500">Error loading job details. The job may have been removed.</p>';
      }
    });
});
