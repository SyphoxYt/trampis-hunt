import { io } from 'socket.io-client';

export const getSavedServerUrl = () => {
  const PRODUCTION_URL = 'https://trampis-hunt.onrender.com';
  if (typeof window === 'undefined') return PRODUCTION_URL;

  // 1. Check if user explicitly configured a custom server address in app settings
  const custom = localStorage.getItem('trampis_server_url');
  if (custom && custom.trim()) {
    const trimmed = custom.trim().replace(/\/+$/, '');
    // Ignore obsolete LAN/localhost configs to prevent cross-play failure
    if (!trimmed.includes('192.168.') && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
      return trimmed;
    }
    // Clean stale local IP from storage
    localStorage.removeItem('trampis_server_url');
  }

  // 2. Default to live production cloud backend for all devices (.APK and Web)
  return PRODUCTION_URL;
};

export const socket = io(getSavedServerUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

export const reconnectToServer = (newUrl) => {
  if (newUrl) {
    let formatted = newUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `http://${formatted}`;
    }
    // Default to port 3001 if no port specified
    try {
      const parsed = new URL(formatted);
      if (!parsed.port) {
        parsed.port = '3001';
        formatted = parsed.toString().replace(/\/+$/, '');
      }
    } catch (e) {
      // fallback as string
    }
    localStorage.setItem('trampis_server_url', formatted);
  }
  
  socket.disconnect();
  socket.io.uri = getSavedServerUrl();
  socket.connect();
};

export default socket;
