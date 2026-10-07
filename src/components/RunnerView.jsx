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
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
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

      {/* Top Mobile Bar */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-md flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="text-[11px] font-mono font-black uppercase text-emerald-400 tracking-wider">
              RUNNER • ON FOOT
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

      {/* High-Stakes 30-Second Warning Alarm Banner */}
      {isWarningActive && (
        <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white px-4 py-2.5 flex items-center justify-between animate-pulse shadow-xl z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
            <span className="text-xs font-black uppercase tracking-wider">
              CRITICAL: PIN REVEAL IN {Math.ceil(timeLeftMs / 1000)}s!
            </span>
          </div>
          <span className="text-xs font-mono font-bold">CHANGE COURSE!</span>
        </div>
      )}

      {/* Floating Big Countdown HUD Pill (Vertical Layout on Mobile) */}
      <div className="absolute top-16 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="p-3 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                NEXT RADAR BROADCAST
              </div>
              <div
                className={`text-2xl font-mono font-black ${
                  timeLeftMs <= 30000 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {formatTimer(timeLeftMs)}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
              SURVIVE CLOCK
            </div>
            <div className="text-sm font-mono font-black text-white">
              {formatTimer(gameTimeLeftMs)}
            </div>
          </div>
        </div>

        {/* Decoy Mode Banner */}
        {decoyMode && (
          <div className="p-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-xl flex items-center justify-between pointer-events-auto animate-fadeIn">
            <span>🎯 Tap any street on the Google Map to deploy your Decoy Pin!</span>
            <button
              onClick={() => setDecoyMode(false)}
              className="underline text-[11px] ml-2 font-bold"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Google Map View (The Hero Element) */}
      <div className="flex-1 min-h-0 w-full relative z-0">
        <TacticalMap
          userLocation={userLocation}
          pins={myPins}
          userRole="runner"
          onMapClick={handleMapClick}
        />
      </div>

      {/* Bottom Vertical Tactical Drawer (Built for Mobile) */}
      <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 shadow-2xl z-20 flex flex-col gap-2.5 max-h-[50vh] touch-scroll overflow-y-auto overscroll-contain flex-shrink-0">
        <div className="flex items-center justify-between pb-1 flex-shrink-0">
          <div className="text-[11px] font-mono uppercase font-black text-slate-400 tracking-wider">
            Runner Tactical Gear
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
          <div className="flex flex-col gap-2 animate-fadeIn pb-2">
            {/* Decoy Pin Full-Width Card */}
            <button
              onClick={handleDecoyClick}
              disabled={player.powerups.decoysLeft <= 0}
              className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                player.powerups.decoysLeft > 0
                  ? 'bg-purple-950/60 hover:bg-purple-900/60 border-purple-700 text-purple-200 active:scale-98 shadow-md'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Deploy Decoy Pin</div>
                  <div className="text-[11px] text-purple-300/80">
                    Drops false coordinates on hunter radar
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-purple-900/80 text-purple-300 border border-purple-700">
                {player.powerups.decoysLeft} LEFT
              </span>
            </button>

            {/* Radar Jammer Full-Width Card */}
            <button
              onClick={handleJammerClick}
              disabled={player.powerups.jammersLeft <= 0}
              className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                player.powerups.jammersLeft > 0
                  ? 'bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-700 text-cyan-200 active:scale-98 shadow-md'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Radar Jammer (+3m)</div>
                  <div className="text-[11px] text-cyan-300/80">
                    Delays next hunter location reveal by 3 minutes
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-cyan-900/80 text-cyan-300 border border-cyan-700">
                {player.powerups.jammersLeft} LEFT
              </span>
            </button>

            {/* Catch Code & Surrender Row */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Show Catch Code */}
              <button
                onClick={() => setShowCodeModal(true)}
                className="py-3 px-3 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono flex items-center justify-center gap-2 active:scale-95"
              >
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Code: {player.catchCode}</span>
              </button>

              {/* Yield / Caught */}
              <button
                onClick={onSurrender}
                className="py-3 px-3 rounded-2xl border border-rose-900/60 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-bold font-mono flex items-center justify-center gap-2 active:scale-95"
              >
                <Flag className="w-4 h-4 text-rose-400" />
                <span>I'm Caught</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Catch Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl flex flex-col items-center text-center">
            <h3 className="text-base font-bold text-white">
              Runner Catch Verification
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              If cornered in person, show this code to the hunter to register the tag.
            </p>

            <div className="my-4 p-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center">
              <div className="text-4xl font-mono font-black tracking-widest text-cyan-400">
                {player.catchCode}
              </div>
              <div className="mt-3 p-2 bg-white rounded-xl shadow-md">
                <QRCodeSVG value={`TRAMPIS_CATCH_${player.id}_${player.catchCode}`} size={130} />
              </div>
            </div>

            <button
              onClick={() => setShowCodeModal(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
