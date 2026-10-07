import React, { useState, useEffect } from 'react';
import TacticalMap from './Map';
import BatterySaverHUD from './BatterySaverHUD';
import {
  Crosshair,
  Target,
  Clock,
  Compass,
  Volume2,
  VolumeX,
  AlertCircle,
  Plane,
  Radar,
  ChevronUp,
  ChevronDown,
  BatteryCharging,
  Navigation
} from 'lucide-react';
import { calculateDistanceMeters, formatDistance, calculateBearing, getGpsQuality } from '../services/geolocation';
import { sound } from '../services/sound';
import { wakeLock } from '../services/wakeLock';

export default function HunterView({
  room,
  player,
  userLocation,
  teammateLocations = [],
  onTagRunner,
  onUseDroneScan,
  onDeployTripwire
}) {
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [catchCodeInput, setCatchCodeInput] = useState('');
  const [showTagModal, setShowTagModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [tagError, setTagError] = useState('');
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [tripwireDeployMode, setTripwireDeployMode] = useState(false);
  const [isBatterySaver, setIsBatterySaver] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const players = Object.values(room?.players || {});
  const runners = players.filter((p) => p.role === 'runner');
  const activeRunners = runners.filter((p) => !p.isCaught);
  const caughtRunners = runners.filter((p) => p.isCaught);

  const pins = room?.gameState?.pinHistory || [];
  const tripwires = room?.gameState?.tripwires || [];

  const droneScansLeft = player?.powerups?.droneScansLeft ?? 1;
  const tripwiresLeft = player?.powerups?.tripwiresLeft ?? 2;

  // Screen Wake Lock
  useEffect(() => {
    wakeLock.request();
    return () => {
      wakeLock.release();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, (room?.gameState?.endsAt || 0) - now);
      setTimeLeftMs(diff);
    }, 1000);
    return () => clearInterval(timer);
  }, [room]);

  const formatTimer = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const runnersWithDistance = runners.map((r) => {
    const runnerPins = pins.filter((p) => p.runnerId === r.id);
    const lastPin = runnerPins[runnerPins.length - 1];

    let dist = null;
    let bearing = null;
    if (userLocation && lastPin) {
      dist = calculateDistanceMeters(
        userLocation.lat,
        userLocation.lng,
        lastPin.lat,
        lastPin.lng
      );
      bearing = calculateBearing(
        userLocation.lat,
        userLocation.lng,
        lastPin.lat,
        lastPin.lng
      );
    }
    return {
      ...r,
      lastPin,
      distanceMeters: dist,
      bearing
    };
  });

  const activeWithDistance = runnersWithDistance.filter((r) => !r.isCaught && r.distanceMeters != null);
  activeWithDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const nearestRunner = activeWithDistance[0];

  const handleOpenTag = (runner) => {
    setSelectedRunner(runner);
    setCatchCodeInput('');
    setTagError('');
    setShowTagModal(true);
  };

  const handleConfirmTag = () => {
    if (!selectedRunner) return;
    setTagError('');

    onTagRunner(
      {
        runnerId: selectedRunner.id,
        catchCodeInput
      },
      (res) => {
        if (res.success) {
          sound.playCaptureKlaxon();
          setShowTagModal(false);
        } else {
          sound.playErrorBuzz();
          setTagError(res.message || 'Tag verification failed.');
        }
      }
    );
  };

  const handleDroneScanClick = () => {
    if (droneScansLeft <= 0) return;
    sound.playDroneScan();
    onUseDroneScan();
  };

  const handleMapClick = (latlng) => {
    if (tripwireDeployMode) {
      onDeployTripwire({ lat: latlng.lat, lng: latlng.lng });
      setTripwireDeployMode(false);
      sound.playRadioChirp();
    }
  };

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const gpsInfo = getGpsQuality(userLocation?.accuracy);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden relative">
      {/* Battery Saver AMOLED HUD */}
      {isBatterySaver && (
        <BatterySaverHUD
          userRole="hunter"
          player={player}
          timeLeftFormatted={formatTimer(timeLeftMs)}
          gameTimeFormatted={formatTimer(timeLeftMs)}
          activeRunnersCount={activeRunners.length}
          nearestDistanceFormatted={
            nearestRunner
              ? `${formatDistance(nearestRunner.distanceMeters)} (${nearestRunner.bearing?.cardinal || ''})`
              : null
          }
          onExit={() => setIsBatterySaver(false)}
        />
      )}

      {/* Top Mobile Bar */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <div>
            <div className="text-[11px] font-mono font-black uppercase text-blue-400 tracking-wider">
              HUNTER COMMAND
            </div>
            <div className="text-xs text-slate-300 font-semibold flex items-center gap-2">
              <span>{player.name}</span>
              <span className={`text-[10px] font-mono font-bold ${gpsInfo.color}`}>
                • {gpsInfo.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBatterySaver(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95"
            title="AMOLED Battery Saver"
          >
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Floating Nearest Prey Intel Card (Vertical Mobile Hero HUD) */}
      <div className="absolute top-16 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="p-3 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                {nearestRunner ? `NEAREST TARGET: ${nearestRunner.name}` : 'SEARCHING RADAR'}
              </div>
              <div className="text-xl font-mono font-black text-cyan-400">
                {nearestRunner
                  ? `${formatDistance(nearestRunner.distanceMeters)} ${nearestRunner.bearing ? `(${nearestRunner.bearing.cardinal})` : ''}`
                  : `${activeRunners.length} Active Targets`}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
              TIME LEFT
            </div>
            <div className="text-sm font-mono font-black text-white">
              {formatTimer(timeLeftMs)}
            </div>
          </div>
        </div>

        {/* Tripwire Placement Mode Banner */}
        {tripwireDeployMode && (
          <div className="p-2.5 bg-cyan-600 text-white rounded-xl text-xs font-bold shadow-xl flex items-center justify-between pointer-events-auto animate-fadeIn">
            <span>📡 Tap any road or intersection on the Google Map to arm your tripwire!</span>
            <button
              onClick={() => setTripwireDeployMode(false)}
              className="underline text-[11px] ml-2 font-bold"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Google Maps View (The Hero Element) */}
      <div className="flex-1 w-full h-full relative z-0">
        <TacticalMap
          userLocation={userLocation}
          pins={pins}
          teammates={teammateLocations}
          tripwires={tripwires}
          userRole="hunter"
          onMapClick={handleMapClick}
        />
      </div>

      {/* Bottom Vertical Tactical Drawer (Built for Mobile) */}
      <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 shadow-2xl z-20 flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-1">
          <div className="text-[11px] font-mono uppercase font-black text-slate-400 tracking-wider">
            Hunter Tracking & Capture
          </div>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
          >
            <span>{drawerOpen ? 'Collapse' : 'Expand'}</span>
            {drawerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {drawerOpen && (
          <div className="flex flex-col gap-2.5 animate-fadeIn">
            {/* BIG PRIMARY TAG RUNNER BUTTON */}
            <button
              onClick={() => handleOpenTag(nearestRunner || activeRunners[0])}
              disabled={activeRunners.length === 0}
              className={`w-full py-4 rounded-2xl font-black font-mono text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-98 ${
                activeRunners.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-rose-950/60 animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Crosshair className="w-5 h-5" />
              <span>
                {nearestRunner ? `TAG ${nearestRunner.name.toUpperCase()}` : 'TAG RUNNER'}
              </span>
            </button>

            {/* Tactical Gear Full-Width Vertical Cards */}
            <div className="flex flex-col gap-2">
              {/* Drone Recon Sweep */}
              <button
                onClick={handleDroneScanClick}
                disabled={droneScansLeft <= 0}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                  droneScansLeft > 0
                    ? 'bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-700 text-cyan-200 active:scale-98 shadow-md'
                    : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Drone Recon Sweep</div>
                    <div className="text-[11px] text-cyan-300/80">
                      Forces instant radar coordinates for all active runners
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-cyan-900/80 text-cyan-300 border border-cyan-700">
                  {droneScansLeft} LEFT
                </span>
              </button>

              {/* Perimeter Motion Tripwire */}
              <button
                onClick={() => setTripwireDeployMode(true)}
                disabled={tripwiresLeft <= 0}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                  tripwiresLeft > 0
                    ? 'bg-blue-950/60 hover:bg-blue-900/60 border-blue-700 text-blue-200 active:scale-98 shadow-md'
                    : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                    <Radar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Arm Perimeter Tripwire</div>
                    <div className="text-[11px] text-blue-300/80">
                      Place sensor beacon on map • Alerts squad if breached
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-blue-900/80 text-blue-300 border border-blue-700">
                  {tripwiresLeft} LEFT
                </span>
              </button>
            </div>

            {/* Target Roster Vertical List */}
            <div className="pt-1 flex flex-col gap-1.5">
              <div className="text-[10px] font-mono uppercase font-bold text-slate-400">
                Runner Targets ({activeRunners.length} Active / {caughtRunners.length} Tagged)
              </div>
              <div className="max-h-28 overflow-y-auto flex flex-col gap-1">
                {runners.map((r) => {
                  const isCaught = r.isCaught;
                  return (
                    <div
                      key={r.id}
                      onClick={() => !isCaught && handleOpenTag(r)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                        isCaught
                          ? 'bg-slate-900/40 border-slate-800 opacity-50'
                          : 'bg-slate-800/90 hover:border-rose-500 border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isCaught ? 'bg-slate-500' : 'bg-rose-500 animate-pulse'
                          }`}
                        />
                        <span className="font-bold text-white">{r.name}</span>
                      </div>

                      <div className="font-mono text-[11px]">
                        {isCaught ? (
                          <span className="text-slate-400">Captured</span>
                        ) : (
                          <span className="text-cyan-400 font-bold">
                            {formatDistance(r.distanceMeters || null)} {r.bearing ? `(${r.bearing.cardinal})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tag Verification Modal */}
      {showTagModal && selectedRunner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl flex flex-col">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-rose-500" />
              <span>Confirm Tag: {selectedRunner.name}</span>
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              Ask runner for their 4-digit code, or tag automatically if within 25 meters.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                Runner 4-Digit Passcode
              </label>
              <input
                type="text"
                maxLength={4}
                value={catchCodeInput}
                onChange={(e) => setCatchCodeInput(e.target.value)}
                placeholder="0000"
                className="w-full px-3 py-3 rounded-2xl border border-slate-700 bg-slate-800 font-mono text-2xl text-center font-bold tracking-widest text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {tagError && (
              <div className="mt-2 text-xs text-rose-400 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{tagError}</span>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleConfirmTag}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Crosshair className="w-4 h-4" />
                <span>{catchCodeInput.length === 4 ? 'VERIFY CODE & TAG' : 'PROXIMITY TAG (<25m)'}</span>
              </button>
              <button
                onClick={() => setShowTagModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
