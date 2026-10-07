/**
 * Screen Wake Lock Service
 * Keeps phone display awake during outdoor hunts so players don't have to unlock their phones while sprinting or driving!
 */

class WakeLockService {
  constructor() {
    this.sentinel = null;
    this.isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    this.isActive = false;
  }

  async request() {
    if (!this.isSupported) return false;

    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      this.isActive = true;

      this.sentinel.addEventListener('release', () => {
        this.isActive = false;
      });

      return true;
    } catch (err) {
      console.warn('Wake Lock request error:', err.message);
      this.isActive = false;
      return false;
    }
  }

  async release() {
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (e) {}
      this.sentinel = null;
    }
    this.isActive = false;
  }
}

export const wakeLock = new WakeLockService();
