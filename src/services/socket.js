import { io } from 'socket.io-client';

import config from '../config.json';

// Helper to determine the target backend server URL
export const getSavedServerUrl = () => {
  if (typeof window === 'undefined') return config.defaultServerUrl || 'http://192.168.0.101:3001';

  // 1. Check if user configured a custom server address in app settings
  const custom = localStorage.getItem('trampis_server_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }

  const { protocol, hostname, port } = window.location;

  // 2. If running on Vite dev port 5173
  if (port === '5173') {
    return `${protocol}//${hostname}:3001`;
  }

  // 3. If served as web PWA or browser from Express on any remote/LAN IP (not capacitor)
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  }

  // 4. Inside native Android Capacitor APK, window.location is 'https://localhost' or 'capacitor://localhost'.
  // We MUST point to the host machine's Wi-Fi IP address so the APK connects immediately to the match!
  return config.defaultServerUrl || 'http://192.168.0.101:3001';
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
