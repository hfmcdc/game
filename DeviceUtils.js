// Device detection & orientation helpers for mobile/touch support
export const DeviceUtils = {
  /**
   * Detects whether the current device should use touch controls.
   * Combines user-agent sniffing with touch-capability + screen-size checks
   * so it also catches touch laptops/tablets that don't match the UA regex.
   */
  isMobile() {
    const ua = navigator.userAgent || navigator.vendor || '';
    const uaMobile = /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const touchCapable = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 900;

    return uaMobile || (touchCapable && smallScreen);
  },

  isPortrait() {
    return window.innerHeight > window.innerWidth;
  },

  /**
   * Attempts to lock screen orientation to landscape. Must be called from
   * within a user-gesture handler. Silently no-ops where unsupported
   * (e.g. iOS Safari, or when not in fullscreen) — the CSS rotate-overlay
   * is the reliable fallback in those cases.
   */
  async requestLandscapeLock() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch (err) {
      console.log('[NEXUS] Orientation lock unavailable:', err.message);
    }
  },

  /**
   * Requests fullscreen on the given element (defaults to <html>).
   * Improves the odds that requestLandscapeLock() succeeds, and gives
   * mobile players a proper edge-to-edge arena. Best-effort only.
   */
  async requestFullscreen(el) {
    const target = el || document.documentElement;
    try {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
      }
    } catch (err) {
      console.log('[NEXUS] Fullscreen request failed:', err.message);
    }
  },
};
