/**
 * JobLink Ethiopia - Gentle, Non-Intrusive Cursor Aura Glow
 * Single soft circular gradient that smoothly tracks mouse movement with zero pointer-events.
 */
(() => {
  // Prevent running in non-browser environments
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Remove any legacy particle style elements if present
  const oldStyles = document.getElementById('cursor-particles-style');
  if (oldStyles) oldStyles.remove();

  // Create or retrieve the single aura glow element
  let aura = document.getElementById('cursor-aura');
  if (!aura) {
    aura = document.createElement('div');
    aura.id = 'cursor-aura';
    aura.className = 'cursor-aura';
    aura.setAttribute('aria-hidden', 'true');
    // Inline styling fallback matching the exact requirements
    aura.style.position = 'fixed';
    aura.style.top = '0';
    aura.style.left = '0';
    aura.style.width = '150px';
    aura.style.height = '150px';
    aura.style.borderRadius = '50%';
    aura.style.pointerEvents = 'none';
    aura.style.background = 'radial-gradient(circle, rgba(0, 195, 255, 0.25) 0%, rgba(0, 0, 0, 0) 70%)';
    aura.style.filter = 'blur(40px)';
    aura.style.webkitFilter = 'blur(40px)';
    aura.style.opacity = '0';
    aura.style.zIndex = '1';
    aura.style.transition = 'transform 0.1s ease-out, opacity 0.25s ease';
    aura.style.willChange = 'transform';

    if (document.body) {
      document.body.appendChild(aura);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(aura);
      });
    }
  }

  let isVisible = false;

  // Single mousemove listener tracking coordinates (centered at 75px)
  window.addEventListener('mousemove', (e) => {
    if (!isVisible) {
      aura.style.opacity = '1';
      isVisible = true;
    }
    aura.style.transform = `translate3d(${e.clientX - 75}px, ${e.clientY - 75}px, 0)`;
  }, { passive: true });

  // Fade out gently when mouse leaves window
  document.addEventListener('mouseleave', () => {
    aura.style.opacity = '0';
    isVisible = false;
  });

  window.addEventListener('blur', () => {
    aura.style.opacity = '0';
    isVisible = false;
  });
})();
