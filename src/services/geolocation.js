/**
 * Geolocation & Compass Telemetry Service
 */

export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatDistance(meters) {
  if (meters == null) return '--';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

export function calculateBearing(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return { deg: 0, cardinal: 'N' };
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const deg = Math.round(((θ * 180) / Math.PI + 360) % 360);

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  const index = Math.round(deg / 45);
  return { deg, cardinal: directions[index] };
}

export function getGpsQuality(accuracy) {
  if (!accuracy) return { label: 'NO SIGNAL', color: 'text-slate-400', level: 0 };
  if (accuracy <= 8) return { label: 'EXCELLENT (±' + accuracy + 'm)', color: 'text-emerald-400', level: 4 };
  if (accuracy <= 20) return { label: 'GOOD (±' + accuracy + 'm)', color: 'text-cyan-400', level: 3 };
  if (accuracy <= 35) return { label: 'FAIR (±' + accuracy + 'm)', color: 'text-amber-400', level: 2 };
  return { label: 'WEAK (±' + accuracy + 'm)', color: 'text-rose-400', level: 1 };
}

class LocationTracker {
  constructor() {
    this.watchId = null;
    this.orientationListener = null;
    this.listeners = new Set();
    this.currentLocation = null;
    this.deviceHeading = null;
    this.isSimulated = false;
    this.simulatedCoords = { lat: 51.505, lng: -0.09 };
  }

  start(onUpdate, onError) {
    if (onUpdate) this.listeners.add(onUpdate);

    if (this.isSimulated) {
      this.emitSimulation();
      return;
    }

    if (!('geolocation' in navigator)) {
      if (onError) onError(new Error('Geolocation not supported by device'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.currentLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 10),
          heading: pos.coords.heading ?? this.deviceHeading ?? 0,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          timestamp: pos.timestamp
        };
        this.notify();
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (onError) onError(err);
      },
      options
    );

    // Listen to device compass orientation if supported
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      this.orientationListener = (e) => {
        if (e.webkitCompassHeading != null) {
          this.deviceHeading = Math.round(e.webkitCompassHeading);
        } else if (e.alpha != null) {
          this.deviceHeading = Math.round(360 - e.alpha);
        }
        if (this.currentLocation) {
          this.currentLocation.heading = this.deviceHeading;
        }
      };
      window.addEventListener('deviceorientation', this.orientationListener, true);
    }
  }

  stop() {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.orientationListener) {
      window.removeEventListener('deviceorientation', this.orientationListener, true);
      this.orientationListener = null;
    }
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.currentLocation);
    }
  }

  setSimulated(enabled, defaultLat, defaultLng) {
    this.isSimulated = enabled;
    if (defaultLat && defaultLng) {
      this.simulatedCoords = { lat: defaultLat, lng: defaultLng };
    }
    if (enabled) {
      this.stop();
      this.emitSimulation();
    }
  }

  stepSimulated(direction, meters = 50) {
    if (!this.isSimulated) {
      this.setSimulated(true, this.currentLocation?.lat || 51.505, this.currentLocation?.lng || -0.09);
    }
    const degPerMeter = 1 / 111111;
    const offset = meters * degPerMeter;

    if (direction === 'N') this.simulatedCoords.lat += offset;
    if (direction === 'S') this.simulatedCoords.lat -= offset;
    if (direction === 'E') this.simulatedCoords.lng += offset * 1.5;
    if (direction === 'W') this.simulatedCoords.lng -= offset * 1.5;

    this.emitSimulation();
  }

  emitSimulation() {
    this.currentLocation = {
      lat: this.simulatedCoords.lat,
      lng: this.simulatedCoords.lng,
      accuracy: 6,
      heading: 0,
      speed: 8,
      timestamp: Date.now()
    };
    this.notify();
  }
}

export const locationTracker = new LocationTracker();
