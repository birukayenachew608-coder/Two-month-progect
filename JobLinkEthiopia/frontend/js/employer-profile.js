/**
 * Public Employer Profile Page Handler
 * JobLink Ethiopia
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const employerId = urlParams.get('id');

  const loadingEl = document.getElementById('loading');
  const errorStateEl = document.getElementById('error-state');
  const errorMsgEl = document.getElementById('error-message');
  const profileContentEl = document.getElementById('profile-content');

  if (!employerId) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorStateEl) errorStateEl.classList.remove('hidden');
    if (errorMsgEl) errorMsgEl.textContent = 'Invalid or missing employer ID.';
    return;
  }

  try {
    let res = await fetch(`/api/user/employer/${encodeURIComponent(employerId)}`);
    if (!res.ok) {
      res = await fetch(`/api/employer/${encodeURIComponent(employerId)}`);
    }
    if (!res.ok) {
      throw new Error(`Failed to load company profile (${res.status})`);
    }

    const employer = await res.json();

    if (loadingEl) loadingEl.classList.add('hidden');
    if (profileContentEl) profileContentEl.classList.remove('hidden');

    // Populate Company Header
    const compName = employer.company_name || employer.name || 'Anonymous Employer';
    const compNameEl = document.getElementById('company-name');
    const contactPersonEl = document.getElementById('employer-contact-person');
    const locationEl = document.getElementById('company-location');
    const emailEl = document.getElementById('company-email');
    const phoneEl = document.getElementById('company-phone');
    const activeJobsEl = document.getElementById('company-active-jobs');
    const jobsCountBadge = document.getElementById('jobs-count-badge');
    const avatarEl = document.getElementById('company-avatar');

    if (compNameEl) compNameEl.textContent = compName;
    const managerName = employer.contact_person || employer.name;
    if (contactPersonEl) {
      contactPersonEl.textContent = managerName ? `Managed by ${managerName}` : 'Verified Employer on JobLink Ethiopia';
    }
    if (locationEl) locationEl.textContent = employer.headquarters_location || employer.location || 'Ethiopia';
    if (emailEl) emailEl.textContent = employer.email || 'Not publicly disclosed';
    if (phoneEl) phoneEl.textContent = employer.phone_number || 'Not specified';

    // Avatar Logic: Render img inside #company-avatar or fallback to initials
    if (avatarEl) {
      let initials = 'CO';
      if (compName.trim().length >= 2) {
        initials = compName.trim().substring(0, 2).toUpperCase();
      } else if (compName.trim().length === 1) {
        initials = compName.trim().toUpperCase();
      }

      const photoUrl = employer.profile_photo_url || employer.profile_photo;
      const isValidPhoto = photoUrl && typeof photoUrl === 'string' && photoUrl.trim() !== '' && !photoUrl.includes('null') && !photoUrl.includes('undefined');

      if (isValidPhoto) {
        avatarEl.classList.remove('card-icon-bg', 'card-icon-slate');
        avatarEl.innerHTML = `<img src="${photoUrl}" alt="${compName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block;" onerror="this.onerror=null; this.parentElement.classList.add('card-icon-bg', 'card-icon-slate'); this.parentElement.textContent='${initials}';" />`;
      } else {
        avatarEl.classList.add('card-icon-bg', 'card-icon-slate');
        avatarEl.textContent = initials;
      }
    }

    // Populate Jobs List
    const jobs = employer.jobs || [];
    if (activeJobsEl) activeJobsEl.textContent = `${jobs.length} Active Job${jobs.length === 1 ? '' : 's'}`;
    if (jobsCountBadge) jobsCountBadge.textContent = `${jobs.length} Opening${jobs.length === 1 ? '' : 's'}`;

    const jobsContainer = document.getElementById('jobs-container');
    const noJobsMsg = document.getElementById('no-jobs-msg');

    if (jobsContainer) {
      jobsContainer.innerHTML = '';
      if (jobs.length === 0) {
        if (noJobsMsg) noJobsMsg.classList.remove('hidden');
      } else {
        if (noJobsMsg) noJobsMsg.classList.add('hidden');
        jobs.forEach(job => {
          const typeBadgeClass = (typeof window.getJobTypeBadgeClass === 'function')
            ? window.getJobTypeBadgeClass(job.job_type)
            : ((job.job_type === 'Part-time') ? 'badge-blue' : ((job.job_type === 'Contract') ? 'badge-purple' : ((job.job_type === 'Internship') ? 'badge-teal' : ((job.job_type === 'Freelance') ? 'badge-orange' : 'badge-green'))));

          const salaryText = job.salary ? job.salary : 'Salary Negotiable';
          const deadlineText = job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open until filled';

          const card = document.createElement('div');
          card.className = 'card p-6 flex flex-col justify-between hover:shadow-lg transition-shadow border border-slate-200';
          card.innerHTML = `
            <div>
              <div class="flex justify-between items-start gap-3 mb-3">
                <h3 class="text-xl font-bold text-slate-900" style="font-family: var(--font-serif);">${job.title || 'Untitled Position'}</h3>
                <span class="badge ${typeBadgeClass} font-normal shrink-0">${job.job_type || 'Full-time'}</span>
              </div>
              <p class="text-sm text-slate-500 mb-4 line-clamp-2">${job.description ? job.description.slice(0, 140) + '...' : 'No description provided.'}</p>
            </div>
            <div class="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <div class="flex justify-between text-xs text-slate-500">
                <span><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i> ${job.location || 'Ethiopia'}</span>
                <span><i class="fa-solid fa-coins mr-1 text-slate-400"></i> ${salaryText}</span>
              </div>
              <div class="flex justify-between items-center mt-3">
                <span class="text-xs text-slate-400">Deadline: ${deadlineText}</span>
                <a href="job-details.html?id=${job.id}" class="btn btn-primary px-4 py-1 text-sm shadow-sm">View Job</a>
              </div>
            </div>
          `;
          jobsContainer.appendChild(card);
        });
      }
    }

  } catch (err) {
    console.error('Error fetching employer profile:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorStateEl) errorStateEl.classList.remove('hidden');
    if (errorMsgEl) errorMsgEl.textContent = 'Unable to load company profile. Please try again later.';
  }
});
