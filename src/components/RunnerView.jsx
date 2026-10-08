import React, { useState, useEffect } from 'react';
import TacticalMap from './Map';
import BatterySaverHUD from './BatterySaverHUD';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock,
  ShieldAlert,
  Zap,
  Volume2,
  VolumeX,
  Flag,
  AlertTriangle,
  Sparkles,
  Key,
  BatteryCharging,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { sound } from '../services/sound';
import { wakeLock } from '../services/wakeLock';
import { getGpsQuality } from '../services/geolocation';

export default function RunnerView({
  room,
  player,
  userLocation,
  onUseDecoy,
  onUseJammer,
  onSurrender
}) {
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [gameTimeLeftMs, setGameTimeLeftMs] = useState(0);
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [decoyMode, setDecoyMode] = useState(false);
  const [isBatterySaver, setIsBatterySaver] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const nextPinAt = room?.gameState?.nextPinAt || 0;
  const endsAt = room?.gameState?.endsAt || 0;

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
      const pinDiff = Math.max(0, nextPinAt - now);
      const gameDiff = Math.max(0, endsAt - now);

      setTimeLeftMs(pinDiff);
      setGameTimeLeftMs(gameDiff);

      const warningThreshold = (room?.settings?.warningSeconds || 30) * 1000;

      if (pinDiff <= warningThreshold && pinDiff > 0) {
        setIsWarningActive(true);
        if (pinDiff <= 10000 && Math.floor(pinDiff / 1000) !== Math.floor((pinDiff + 500) / 1000)) {
          sound.playWarningTick(true);
        }
      } else {
        setIsWarningActive(false);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [nextPinAt, endsAt, room]);

  const formatTimer = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDecoyClick = () => {
    if (player.powerups.decoysLeft <= 0) return;
    setDecoyMode(true);
  };

  const handleMapClick = (latlng) => {
    if (decoyMode) {
      onUseDecoy({ lat: latlng.lat, lng: latlng.lng });
      setDecoyMode(false);
      sound.playRadioChirp();
    }
  };

  const handleJammerClick = () => {
    if (player.powerups.jammersLeft <= 0) return;
    sound.playJammerNoise();
    onUseJammer();
  };

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const pinHistory = room?.gameState?.pinHistory || [];
  const myPins = pinHistory.filter((p) => p.runnerId === player.id);
  const gpsInfo = getGpsQuality(userLocation?.accuracy);

  return (
    <div className="w-full h-full touch-scroll overflow-y-auto overscroll-contain bg-slate-950 text-slate-100">
      {/* Battery Saver AMOLED Mode */}
      {isBatterySaver && (
        <BatterySaverHUD
          userRole="runner"
          player={player}
          timeLeftFormatted={formatTimer(timeLeftMs)}
          gameTimeFormatted={formatTimer(gameTimeLeftMs)}
          activeRunnersCount={1}
          nearestDistanceFormatted={null}
          onExit={() => setIsBatterySaver(false)}
          isWarningActive={isWarningActive}
        />
      )}

      <div className="max-w-xl mx-auto flex flex-col gap-3.5 p-4 sm:p-5 pb-28">
        {/* Top Header Bar */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${player.isCaught ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                {player.isCaught ? 'STATUS: CAPTURED' : 'RUNNER • ON FOOT'}
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

        {/* Captured Banner (If Player is Tagged) */}
        {player.isCaught && (
          <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-center gap-3 animate-fadeIn text-rose-200">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-rose-400" />
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wide text-rose-300">
                YOU WERE CAPTURED
              </div>
              <div className="text-xs text-rose-200 mt-0.5">
                Tagged by <strong className="text-white">{player.caughtBy || 'Hunter'}</strong>. You are now spectating.
              </div>
            </div>
          </div>
        )}

        {/* 30-Second Warning Alarm Banner */}
        {isWarningActive && !player.isCaught && (
          <div className="p-3 bg-rose-900 border border-rose-600 rounded-2xl flex items-center justify-between text-white animate-pulse shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span className="text-xs font-bold font-mono uppercase tracking-wider">
                RADAR PING IN {Math.ceil(timeLeftMs / 1000)}s!
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-200">CHANGE COURSE</span>
          </div>
        )}

        {/* Countdown & Hunt Clocks Card (In-Flow, Never Overlapping) */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                NEXT RADAR PING
              </div>
              <div className={`text-2xl font-mono font-black ${timeLeftMs <= 30000 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {formatTimer(timeLeftMs)}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
              HUNT CLOCK
            </div>
            <div className="text-base font-mono font-bold text-slate-200">
              {formatTimer(gameTimeLeftMs)}
            </div>
          </div>
        </div>

        {/* Decoy Placement Mode Notice */}
        {decoyMode && (
          <div className="p-3 bg-purple-900/80 border border-purple-500 rounded-2xl text-xs font-semibold text-purple-100 flex items-center justify-between animate-fadeIn">
            <span>Tap any street on the satellite map to drop false decoy!</span>
            <button
              onClick={() => setDecoyMode(false)}
              className="px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-700 text-xs font-bold text-purple-300 ml-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Satellite Map View (Dedicated In-Flow Container) */}
        <div className="w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-slate-800 shadow-sm relative">
          <TacticalMap
            userLocation={userLocation}
            pins={myPins}
            userRole="runner"
            onMapClick={handleMapClick}
          />
        </div>

        {/* Runner Powers & Survival Tools (Clean Vertical Stack) */}
        {!player.isCaught && (
          <div className="flex flex-col gap-2.5">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
              Survival Gear
            </div>

            {/* Radar Jammer (+3m) */}
            <button
              onClick={handleJammerClick}
              disabled={player.powerups.jammersLeft <= 0}
              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
                player.powerups.jammersLeft > 0
                  ? 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-white active:scale-98 shadow-sm cursor-pointer'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Radar Jammer (+3 min)</div>
                  <div className="text-[11px] text-slate-400">
                    Delays next hunter radar ping by 3 minutes
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-800 text-blue-300 border border-slate-700">
                {player.powerups.jammersLeft} LEFT
              </span>
            </button>

            {/* Decoy Pin */}
            <button
              onClick={handleDecoyClick}
              disabled={player.powerups.decoysLeft <= 0}
              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
                player.powerups.decoysLeft > 0
                  ? 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-white active:scale-98 shadow-sm cursor-pointer'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Deploy Decoy Pin</div>
                  <div className="text-[11px] text-slate-400">
                    Drops false coordinates on the hunter radar
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-800 text-purple-300 border border-slate-700">
                {player.powerups.decoysLeft} LEFT
              </span>
            </button>

            {/* Verification Code & Surrender Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setShowCodeModal(true)}
                className="py-3 px-3 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold font-mono flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
              >
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Code: {player.catchCode}</span>
              </button>

              <button
                onClick={onSurrender}
                className="py-3 px-3 rounded-2xl border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold font-mono flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
              >
                <Flag className="w-4 h-4 text-rose-400" />
                <span>Surrender</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Catch Code Verification Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl flex flex-col items-center text-center">
            <h3 className="text-base font-bold text-white">
              Runner Catch Verification Code
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              If cornered in person, give this code to the hunter to confirm tag.
            </p>

            <div className="my-4 p-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center w-full">
              <div className="text-4xl font-mono font-black tracking-widest text-emerald-400">
                {player.catchCode}
              </div>
              <div className="mt-3 p-2 bg-white rounded-xl shadow-md">
                <QRCodeSVG value={`TRAMPIS_CATCH_${player.id}_${player.catchCode}`} size={130} />
              </div>
            </div>

            <button
              onClick={() => setShowCodeModal(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
