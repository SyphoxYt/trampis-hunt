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
  spottedRunners = [],
  onTagRunner,
  onUseDroneScan,
  onDeployTripwire,
  onEndHunt,
  onKickPlayer
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

  const handleProximityTagDirect = (runner) => {
    onTagRunner(
      {
        runnerId: runner.id,
        catchCodeInput: ''
      },
      (res) => {
        if (res.success) {
          sound.playCaptureKlaxon();
        } else {
          sound.playErrorBuzz();
          alert(res.message || 'Proximity tag failed. You must be within 5m of the runner.');
        }
      }
    );
  };

  const handleConfirmTag = () => {
    if (!selectedRunner) return;
    setTagError('');

    const trimmed = catchCodeInput.trim();
    if (trimmed.length > 0 && trimmed.length !== 4) {
      setTagError('Runner catch code must be exactly 4 digits.');
      sound.playErrorBuzz();
      return;
    }

    onTagRunner(
      {
        runnerId: selectedRunner.id,
        catchCodeInput: trimmed
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
    <div className="w-full h-full touch-scroll overflow-y-auto overscroll-contain bg-slate-950 text-slate-100">
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

      <div className="max-w-xl mx-auto flex flex-col gap-3.5 p-4 sm:p-5 pb-28">
        {/* Top Header Bar */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                HUNTER • IN PURSUIT
              </div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <span>{player.name}</span>
                <span className={`text-[10px] font-mono ${gpsInfo.color}`}>
                  • {gpsInfo.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsBatterySaver(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
              title="AMOLED Battery Saver"
            >
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
              title="Toggle Sound"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            </button>
          </div>
        </div>

        {/* Hunt Radar Overview Card (In-Flow, Never Overlapping) */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                {nearestRunner ? `CLOSEST TARGET • ${nearestRunner.name.toUpperCase()}` : 'ACTIVE TARGETS'}
              </div>
              <div className="text-xl font-mono font-black text-blue-400">
                {nearestRunner
                  ? `${formatDistance(nearestRunner.distanceMeters)} ${nearestRunner.bearing ? `(${nearestRunner.bearing.cardinal})` : ''}`
                  : `${activeRunners.length} Active`}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
              TIME LEFT
            </div>
            <div className="text-base font-mono font-bold text-white">
              {formatTimer(timeLeftMs)}
            </div>
          </div>
        </div>

        {/* Tripwire Placement Mode Banner */}
        {tripwireDeployMode && (
          <div className="p-3 bg-blue-900/80 border border-blue-500 rounded-2xl text-xs font-semibold text-blue-100 flex items-center justify-between animate-fadeIn">
            <span>Tap any street or corner on the satellite map to arm tripwire sensor!</span>
            <button
              onClick={() => setTripwireDeployMode(false)}
              className="px-2.5 py-1 rounded-lg bg-blue-950 border border-blue-700 text-xs font-bold text-blue-300 ml-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Satellite Map View (Dedicated In-Flow Container) */}
        <div className="w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-slate-800 shadow-sm relative">
          <TacticalMap
            userLocation={userLocation}
            userColor={player?.color}
            userAvatar={player?.avatar}
            pins={pins}
            teammates={teammateLocations}
            spottedRunners={spottedRunners}
            tripwires={tripwires}
            userRole="hunter"
            onMapClick={handleMapClick}
          />
        </div>

        {/* Runner Targets List & Direct Tag Option (Option to pick who to tag!) */}
        <div className="flex flex-col gap-2.5">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
            <span>Target Roster ({activeRunners.length} Active / {caughtRunners.length} Captured)</span>
            <span className="text-[11px] text-slate-500 font-normal">Select runner to tag</span>
          </div>

          {runners.map((r) => {
            const isCaught = r.isCaught;
            const runnerDist = runnersWithDistance.find((item) => item.id === r.id);
            const distMeters = runnerDist?.distanceMeters;
            const isSpotted = spottedRunners.some((s) => s.runnerId === r.id);
            const inRange = (distMeters !== null && distMeters !== undefined && distMeters <= 5) || isSpotted;

            return (
              <div
                key={r.id}
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                  isCaught
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : inRange
                    ? 'bg-emerald-950/60 border-emerald-500 shadow-lg ring-1 ring-emerald-500/50'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
                      isCaught ? 'bg-slate-500' : inRange ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{r.name}</span>
                      {inRange && !isCaught && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                          ⚡ IN SIGHT (&le;5m)
                        </span>
                      )}
                      {r.isOnline === false && !isCaught && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800/50">
                          OFFLINE (PHONE DIED?)
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      {isCaught ? (
                        <span>Captured by {r.caughtBy || 'Hunter'}</span>
                      ) : inRange ? (
                        <span className="text-emerald-300 font-bold">
                          Live Contact: ~{distMeters != null ? `${distMeters}m` : '<5m'}
                        </span>
                      ) : distMeters != null ? (
                        <span className="text-slate-300">
                          Last Pin: {formatDistance(distMeters)} {runnerDist?.bearing ? `• ${runnerDist.bearing.cardinal}` : ''}
                        </span>
                      ) : (
                        <span>Awaiting radar telemetry</span>
                      )}
                    </div>
                  </div>
                </div>

                {!isCaught && (
                  <div className="flex items-center gap-2">
                    {room?.hostId === player?.id && r.isOnline === false && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Kick offline runner ${r.name}? If all active runners are gone, hunters win.`)) {
                            onKickPlayer && onKickPlayer(r.id);
                          }
                        }}
                        className="px-2.5 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-300 font-mono text-[10px] font-bold transition active:scale-95"
                        title="Runner phone died / offline: kick to eliminate"
                      >
                        Kick MIA
                      </button>
                    )}
                    {inRange && (
                      <button
                        onClick={() => handleProximityTagDirect(r)}
                        className="px-3.5 py-2.5 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md animate-pulse"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>PROXIMITY TAG</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenTag(r)}
                      className={`px-3.5 py-2.5 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                        inRange
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{inRange ? 'ENTER CODE' : `TAG ${r.name.toUpperCase()}`}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hunter Tactical Powers (Clean Vertical Stack) */}
        <div className="flex flex-col gap-2.5 pt-1">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
            Hunter Equipment
          </div>

          {/* Drone Recon Sweep */}
          <button
            onClick={handleDroneScanClick}
            disabled={droneScansLeft <= 0}
            className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
              droneScansLeft > 0
                ? 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-white active:scale-98 shadow-sm cursor-pointer'
                : 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Plane className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Drone Recon Sweep</div>
                <div className="text-[11px] text-slate-400">
                  Forces instant radar ping on all active runners
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-800 text-blue-300 border border-slate-700">
              {droneScansLeft} LEFT
            </span>
          </button>

          {/* Perimeter Tripwire */}
          <button
            onClick={() => setTripwireDeployMode(true)}
            disabled={tripwiresLeft <= 0}
            className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
              tripwiresLeft > 0
                ? 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-white active:scale-98 shadow-sm cursor-pointer'
                : 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Radar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Arm Motion Tripwire</div>
                <div className="text-[11px] text-slate-400">
                  Place sensor beacon on satellite map • Alerts if crossed
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-800 text-blue-300 border border-slate-700">
              {tripwiresLeft} LEFT
            </span>
          </button>
        </div>

        {/* Host Early End Hunt Control */}
        {room?.hostId === player?.id && (
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
            <button
              onClick={() => {
                if (window.confirm('End this hunt early for all players and show results?')) {
                  onEndHunt && onEndHunt();
                }
              }}
              className="w-full py-3 rounded-2xl bg-slate-900 border border-rose-900/60 hover:bg-rose-950/40 text-rose-400 font-mono font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>🏁 END HUNT EARLY (HOST)</span>
            </button>
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

            {(() => {
              const runnerDist = runnersWithDistance.find((item) => item.id === selectedRunner.id);
              const distMeters = runnerDist?.distanceMeters;
              const isSpotted = spottedRunners.some((s) => s.runnerId === selectedRunner.id);
              const inRange = (distMeters !== null && distMeters !== undefined && distMeters <= 5) || isSpotted;
              const hasCode = catchCodeInput.trim().length > 0;
              const isCodeComplete = catchCodeInput.trim().length === 4;

              return (
                <>
                  <div className="mt-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">Distance to Runner:</span>
                    <span className={`font-mono font-bold ${inRange ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {distMeters != null ? `${formatDistance(distMeters)}` : 'Radar Pin Only'}
                    </span>
                  </div>

                  {inRange ? (
                    <p className="text-xs text-emerald-400 mt-2 font-medium">
                      ✓ Runner is in live visual range (&le;5m)! You can tag immediately via proximity or enter their code.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-2">
                      Outside 5m proximity range ({distMeters != null ? `${distMeters}m` : 'no live contact'}). Enter {selectedRunner.name}'s exact 4-digit code to tag:
                    </p>
                  )}

                  <div className="mt-3 flex flex-col gap-2">
                    <label className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                      Runner 4-Digit Catch Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={catchCodeInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setCatchCodeInput(val);
                        setTagError('');
                      }}
                      placeholder="0000"
                      className="w-full px-3 py-3 rounded-2xl border border-slate-700 bg-slate-950 font-mono text-2xl text-center font-bold tracking-widest text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {tagError && (
                    <div className="mt-2.5 p-2 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                      <span>{tagError}</span>
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      onClick={handleConfirmTag}
                      disabled={hasCode ? !isCodeComplete : !inRange}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                        (hasCode && isCodeComplete) || (!hasCode && inRange)
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      <Crosshair className="w-4 h-4" />
                      <span>
                        {hasCode
                          ? isCodeComplete
                            ? 'VERIFY 4-DIGIT CODE & TAG'
                            : `ENTER 4 DIGITS (${catchCodeInput.length}/4)`
                          : inRange
                          ? 'REGISTER PROXIMITY TAG (<5m)'
                          : 'ENTER 4-DIGIT CODE TO TAG'}
                      </span>
                    </button>
                    <button
                      onClick={() => setShowTagModal(false)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
