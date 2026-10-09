import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layers, Map as MapIcon } from 'lucide-react';

export default function TacticalMap({
  userLocation,
  userColor,
  userAvatar,
  pins = [],
  teammates = [],
  spottedRunners = [],
  tripwires = [],
  userRole = 'runner',
  onMapClick = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const hasInitialCenteredRef = useRef(false);
  const markersRef = useRef({
    userMarker: null,
    accuracyCircle: null,
    pins: [],
    teammates: [],
    spottedRunners: [],
    tripwires: []
  });
  const [autoFollow, setAutoFollow] = useState(true);
  const [mapType, setMapType] = useState('satellite'); // 'satellite' | 'streets'

  // Google Maps tile layers
  const googleStreetsUrl = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  const googleSatelliteUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const defaultLat = userLocation?.lat || 51.505;
    const defaultLng = userLocation?.lng || -0.09;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = L.tileLayer(googleSatelliteUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    mapInstanceRef.current = map;
    mapInstanceRef.current._tileLayer = tileLayer;

    // Force size recalculation immediately and after short delay so map is 100% visible
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    map.on('click', (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng);
      }
    });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Tile Layer (Streets vs Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map._tileLayer) return;

    map.removeLayer(map._tileLayer);
    const url = mapType === 'satellite' ? googleSatelliteUrl : googleStreetsUrl;

    const newLayer = L.tileLayer(url, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    map._tileLayer = newLayer;
  }, [mapType]);

  // Update User Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    const { lat, lng, accuracy, heading } = userLocation;

    if (!hasInitialCenteredRef.current && (lat !== 51.505 || lng !== -0.09)) {
      map.setView([lat, lng], 17);
      hasInitialCenteredRef.current = true;
    } else if (autoFollow) {
      map.panTo([lat, lng], { animate: true, duration: 0.3 });
    }

    const themeColor = userColor || (userRole === 'runner' ? '#10B981' : '#2563EB');
    const angle = heading || 0;

    const iconHtml = `
      <div class="relative flex items-center justify-center" style="transform: rotate(${angle}deg)">
        <div class="absolute w-9 h-9 rounded-full opacity-40 animate-ping" style="background-color: ${themeColor}"></div>
        <div class="absolute -top-3.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[9px]" style="border-bottom-color: ${themeColor}"></div>
        <div class="w-5 h-5 rounded-full border-2 border-white shadow-xl flex items-center justify-center" style="background-color: ${themeColor}">
          <div class="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'user-pulse-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    if (markersRef.current.userMarker) {
      markersRef.current.userMarker.setLatLng([lat, lng]);
      markersRef.current.userMarker.setIcon(customIcon);
    } else {
      markersRef.current.userMarker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    }

    if (markersRef.current.accuracyCircle) {
      markersRef.current.accuracyCircle.setLatLng([lat, lng]);
      markersRef.current.accuracyCircle.setRadius(accuracy || 15);
    } else {
      markersRef.current.accuracyCircle = L.circle([lat, lng], {
        radius: accuracy || 15,
        color: themeColor,
        weight: 2,
        fillColor: themeColor,
        fillOpacity: 0.12
      }).addTo(map);
    }
  }, [userLocation, autoFollow, userRole, userColor]);

  // Update Pins (Runner Dropped Radar Pins - Displays Exact Runner Name & Color)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.pins.forEach((item) => {
      if (item.marker) map.removeLayer(item.marker);
      if (item.circle) map.removeLayer(item.circle);
    });
    markersRef.current.pins = [];

    const now = Date.now();

    pins.forEach((pin, index) => {
      const isLatest = index === pins.length - 1;
      const minutesAgo = Math.max(0, Math.floor((now - pin.timestamp) / 60000));
      const uncertaintyRadiusMeters = Math.min(1500, Math.max(30, minutesAgo * 120));

      const runnerName = pin.runnerName || 'Runner';
      let pinColor = pin.runnerColor || '#EF4444';
      let badgeIcon = pin.runnerAvatar || '📍';
      let badgeTitle = runnerName;

      if (pin.isDecoy) {
        pinColor = '#A855F7';
        badgeIcon = '👻';
        badgeTitle = `${runnerName} (Decoy)`;
      } else if (pin.isDroneSweep) {
        pinColor = '#06B6D4';
        badgeIcon = '🛰️';
        badgeTitle = `Drone: ${runnerName}`;
      }

      const timeText = minutesAgo === 0 ? 'NOW' : `${minutesAgo}m ago`;

      const pinHtml = `
        <div class="relative flex flex-col items-center cursor-pointer">
          ${isLatest ? `<div class="absolute -top-1 w-10 h-10 rounded-full opacity-60 animate-ping" style="background-color: ${pinColor}"></div>` : ''}
          <div class="px-2.5 py-1 rounded-full text-[11px] font-mono font-black text-white shadow-2xl border-2 border-white flex items-center gap-1.5 whitespace-nowrap"
               style="background-color: ${pinColor}">
            <span>${badgeIcon} ${badgeTitle}</span>
            <span class="opacity-80 text-[9px] bg-black/40 px-1.5 py-0.2 rounded-full font-bold">• ${timeText}</span>
          </div>
          <div class="w-3.5 h-3.5 rotate-45 -mt-2 border-r-2 border-b-2 border-white shadow-md" style="background-color: ${pinColor}"></div>
        </div>
      `;

      const pinIcon = L.divIcon({
        html: pinHtml,
        className: 'tactical-pin-marker',
        iconSize: [110, 48],
        iconAnchor: [55, 42]
      });

      const marker = L.marker([pin.lat, pin.lng], { icon: pinIcon }).addTo(map);
      marker.bindPopup(`
        <div class="p-2 font-sans text-xs">
          <div class="font-bold text-slate-900">${runnerName} Pin</div>
          <div class="text-slate-500 mt-0.5">${minutesAgo}m ago (${new Date(pin.timestamp).toLocaleTimeString()})</div>
          <div class="text-slate-700 font-mono mt-1 font-bold">Foot Search Radius: ~${uncertaintyRadiusMeters}m</div>
        </div>
      `);

      let circle = null;
      if (userRole === 'hunter') {
        circle = L.circle([pin.lat, pin.lng], {
          radius: uncertaintyRadiusMeters,
          color: pinColor,
          weight: 2,
          dashArray: '6, 8',
          fillColor: pinColor,
          fillOpacity: Math.max(0.05, 0.16 - minutesAgo * 0.015)
        }).addTo(map);
      }

      markersRef.current.pins.push({ marker, circle });
    });
  }, [pins, userRole]);

  // Update Teammates (Fellow Runners for Runners, Fellow Hunters for Hunters)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.teammates.forEach((m) => map.removeLayer(m));
    markersRef.current.teammates = [];

    const isRunnerRole = userRole === 'runner';

    teammates.forEach((teammate) => {
      if (!teammate.location) return;

      const teammateColor = teammate.color || (isRunnerRole ? '#10B981' : '#2563EB');
      const teammateAvatar = teammate.avatar || (isRunnerRole ? '🏃' : '🚔');

      const teammateHtml = `
        <div class="flex flex-col items-center">
          <div class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-white shadow-lg border border-white whitespace-nowrap flex items-center gap-1"
               style="background-color: ${teammateColor}">
            <span>${teammateAvatar}</span>
            <span>${teammate.name || (isRunnerRole ? 'Runner' : 'Hunter')}</span>
          </div>
          <div class="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
               style="background-color: ${teammateColor}"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: teammateHtml,
        className: 'teammate-marker',
        iconSize: [85, 32],
        iconAnchor: [42, 26]
      });

      const m = L.marker([teammate.location.lat, teammate.location.lng], { icon }).addTo(map);
      markersRef.current.teammates.push(m);
    });
  }, [teammates, userRole]);

  // Update Spotted Runners (Visible to Hunters ONLY when within 5 meters!)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.spottedRunners.forEach((item) => {
      if (item.marker) map.removeLayer(item.marker);
      if (item.circle) map.removeLayer(item.circle);
    });
    markersRef.current.spottedRunners = [];

    if (userRole !== 'hunter') return;

    spottedRunners.forEach((spotted) => {
      if (!spotted.location) return;

      const spottedHtml = `
        <div class="relative flex flex-col items-center cursor-pointer animate-bounce">
          <div class="absolute -top-1 w-9 h-9 rounded-full bg-rose-500 opacity-70 animate-ping"></div>
          <div class="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-600 text-white shadow-2xl border-2 border-white flex items-center gap-1 whitespace-nowrap">
            <span>⚡ SPOTTED: ${spotted.runnerName || 'Runner'}</span>
            <span class="text-[9px] bg-black/40 px-1 rounded">(&le;5m)</span>
          </div>
          <div class="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-lg"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: spottedHtml,
        className: 'spotted-runner-marker',
        iconSize: [110, 36],
        iconAnchor: [55, 30]
      });

      const marker = L.marker([spotted.location.lat, spotted.location.lng], { icon }).addTo(map);
      const circle = L.circle([spotted.location.lat, spotted.location.lng], {
        radius: 5,
        color: '#F43F5E',
        weight: 3,
        fillColor: '#F43F5E',
        fillOpacity: 0.35
      }).addTo(map);

      markersRef.current.spottedRunners.push({ marker, circle });
    });
  }, [spottedRunners, userRole]);

  // Update Tripwires
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.tripwires.forEach((item) => {
      if (item.marker) map.removeLayer(item.marker);
      if (item.circle) map.removeLayer(item.circle);
    });
    markersRef.current.tripwires = [];

    tripwires.forEach((tw) => {
      const isTripped = tw.triggered;
      const color = isTripped ? '#F43F5E' : '#0EA5E9';

      const twHtml = `
        <div class="flex flex-col items-center">
          <div class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-white shadow-md border border-white"
               style="background-color: ${color}">
            ${isTripped ? '🚨 TRIPPED' : '📡 BEACON'}
          </div>
          <div class="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md animate-pulse"
               style="background-color: ${color}"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: twHtml,
        className: 'tripwire-marker',
        iconSize: [70, 30],
        iconAnchor: [35, 24]
      });

      const marker = L.marker([tw.lat, tw.lng], { icon }).addTo(map);
      const circle = L.circle([tw.lat, tw.lng], {
        radius: 50,
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: isTripped ? 0.3 : 0.1
      }).addTo(map);

      markersRef.current.tripwires.push({ marker, circle });
    });
  }, [tripwires]);

  const recenter = () => {
    const map = mapInstanceRef.current;
    if (map && userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
      setAutoFollow(true);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[220px] select-none overflow-hidden bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full min-h-[220px] z-0" />

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Recenter Button */}
        <button
          onClick={recenter}
          className={`p-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all active:scale-95 ${
            autoFollow
              ? 'bg-blue-600 text-white border-blue-400'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title="Recenter Location"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Google Maps Layer Switcher (Streets vs Satellite) */}
        <button
          onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
          className="p-3 rounded-2xl shadow-xl border backdrop-blur-md bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800 active:scale-95 text-xs font-mono font-bold flex items-center justify-center"
          title="Toggle Google Satellite / Streets"
        >
          {mapType === 'streets' ? <Layers className="w-4 h-4" /> : <MapIcon className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* Map Tile Badge (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-[10px] text-slate-300 font-mono shadow-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Google Maps ({mapType === 'satellite' ? 'Satellite' : 'Roads'})</span>
        {pins.length > 0 && (
          <span className="text-rose-400 font-bold">• {pins.length} Pin{pins.length > 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  );
}
