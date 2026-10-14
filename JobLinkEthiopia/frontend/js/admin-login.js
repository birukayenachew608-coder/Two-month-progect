/**
 * Admin Login & Two-Factor Authentication (2FA) Handler
 * JobLink Ethiopia - Separation of Concerns
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  const twoFaForm = document.getElementById('admin-2fa-form');
  const twoFaSetupForm = document.getElementById('admin-2fa-setup-form');
  
  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');

  let tempAuthToken = '';

  // Auto-login check
  (async function checkExistingSession() {
    try {
      const res = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem('token', 'secure_cookie_auth');
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = 'admin.html';
          return; // Do not show the form
        }
      }
    } catch (e) {
      // Session check failed, proceed to display login
    }
    
    // No valid session, show the login form
    if (step1) step1.classList.remove('hidden');
  })();

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('admin-email').value;
      const password = document.getElementById('admin-password').value;
      
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          if (data.requires2FASetup) {
            tempAuthToken = data.tempAuthToken;
            step1.classList.add('hidden');
            step3.classList.remove('hidden');
            
            // Fetch QR code
            const setupRes = await fetch('/api/admin/2fa/setup', {
              headers: { 'Authorization': `Bearer ${tempAuthToken}` }
            });
            if (setupRes.ok) {
              const setupData = await setupRes.json();
              document.getElementById('qr-code-img').src = setupData.qrCodeUrl;
              document.getElementById('manual-secret').textContent = setupData.secret;
            } else {
              if (typeof showToast === 'function') {
                showToast('Error generating QR code', 'error');
              } else {
                alert('Error generating QR code');
              }
            }
          } else if (data.requires2FA) {
            tempAuthToken = data.tempAuthToken;
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
          } else {
            // Fallback if no 2FA
            localStorage.setItem('token', 'secure_cookie_auth');
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'admin.html';
          }
        } else {
          const errMsg = data.message || 'Authentication failed. Please check your credentials.';
          if (typeof showToast === 'function') {
            showToast(errMsg, 'error');
          } else {
            alert(errMsg);
          }
        }
      } catch (error) {
        if (typeof showToast === 'function') {
          showToast('Network error, please try again later', 'error');
        } else {
          alert('Network error, please try again later');
        }
      }
    });
  }

  // Handler for both Verify and Setup confirmation
  const verify2fa = async (code) => {
    try {
      const response = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tempAuthToken, code })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', 'secure_cookie_auth');
        localStorage.setItem('user', JSON.stringify(data.user));
        if (typeof showToast === 'function') {
          showToast('Verification successful!', 'success');
        }
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 1000);
      } else {
        const errMsg = data.message || 'Invalid verification code.';
        if (typeof showToast === 'function') {
          showToast(errMsg, 'error');
        } else {
          alert(errMsg);
        }
      }
    } catch (error) {
      if (typeof showToast === 'function') {
        showToast('Network error, please try again later', 'error');
      } else {
        alert('Network error, please try again later');
      }
    }
  };

  if (twoFaForm) {
    twoFaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = twoFaForm.querySelector('.verification-input').value;
      await verify2fa(code);
    });
  }

  if (twoFaSetupForm) {
    twoFaSetupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = twoFaSetupForm.querySelector('.verification-input').value;
      await verify2fa(code);
    });
  }
});
