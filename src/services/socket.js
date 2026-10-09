import { io } from 'socket.io-client';

export const getSavedServerUrl = () => {
  const PRODUCTION_URL = 'https://trampis-hunt.onrender.com';
  if (typeof window === 'undefined') return PRODUCTION_URL;

  // 1. Check if user explicitly configured a custom server address in app settings
  const custom = localStorage.getItem('trampis_server_url');
  if (custom && custom.trim()) {
    const trimmed = custom.trim().replace(/\/+$/, '');
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
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
