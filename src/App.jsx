import React, { useState, useEffect } from 'react';
import socket, { getSavedServerUrl, reconnectToServer } from './services/socket';
import { locationTracker } from './services/geolocation';
import { sound } from './services/sound';
import Lobby from './components/Lobby';
import RunnerView from './components/RunnerView';
import HunterView from './components/HunterView';
import GameOverView from './components/GameOverView';
import RulesModal from './components/RulesModal';
import {
  Compass,
  Moon,
  Sun,
  BookOpen,
  Wifi,
  WifiOff,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Zap,
  Plane,
  Radar,
  Settings,
  Server
} from 'lucide-react';

export default function App() {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('trampis_player_name') || `Operative_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [teammateLocations, setTeammateLocations] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(() => getSavedServerUrl());

  // Active Tactical Ability Banner displayed to everyone on both teams
  const [activeAbilityBanner, setActiveAbilityBanner] = useState(null);

  const handleNameChange = (val) => {
    setPlayerName(val);
    localStorage.setItem('trampis_player_name', val);
  };

  const showAbilityBanner = (bannerData) => {
    setActiveAbilityBanner(bannerData);
    setTimeout(() => {
      setActiveAbilityBanner((prev) => (prev?.id === bannerData.id ? null : prev));
    }, 6000);
  };

  // Socket Connection and Event Listeners
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setPlayerId(socket.id);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onRoomUpdated = (updatedRoom) => {
      setRoom(updatedRoom);
    };

    const onGameStarted = (updatedRoom) => {
      setRoom(updatedRoom);
      sound.playSonarPing();
      showAbilityBanner({
        id: `start_${Date.now()}`,
        title: '🚨 THE HUNT HAS COMMENCED',
        desc: 'Runners on foot must evade capture! Hunters have begun pursuit.',
        type: 'danger'
      });
    };

    const onPinWarning = () => {
      sound.playWarningTick(true);
    };

    const onMandatoryPinDropped = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      sound.playSonarPing();
      showAbilityBanner({
        id: `pin_${Date.now()}`,
        title: '📍 MANDATORY RADAR PIN DROP',
        desc: 'Runner GPS coordinates have been broadcasted to all hunters!',
        type: 'warning'
      });
    };

    // Universal Ability Broadcast received by ALL PLAYERS on BOTH TEAMS!
    const onUniversalAbilityAlert = (alertData) => {
      const myRole = room?.players?.[socket.id]?.role;
      const isRunner = myRole === 'runner';
      const desc = isRunner ? alertData.runnerDesc : alertData.hunterDesc;

      let bannerType = 'info';
      if (alertData.ability === 'drone') {
        sound.playDroneScan();
        bannerType = isRunner ? 'danger' : 'success';
      } else if (alertData.ability === 'tripwire') {
        sound.playTripwireAlert();
        bannerType = 'danger';
      } else if (alertData.ability === 'jammer') {
        sound.playJammerNoise();
        bannerType = isRunner ? 'success' : 'warning';
      } else if (alertData.ability === 'decoy') {
        sound.playRadioChirp();
        bannerType = 'info';
      }

      showAbilityBanner({
        id: `ab_${Date.now()}`,
        title: alertData.title,
        desc: desc || alertData.title,
        user: alertData.user,
        type: bannerType
      });
    };

    const onRunnerTagged = ({ runnerName, hunterName, room: updatedRoom }) => {
      setRoom(updatedRoom);
      sound.playCaptureKlaxon();
      showAbilityBanner({
        id: `tag_${Date.now()}`,
        title: '🎯 RUNNER CAPTURED!',
        desc: `Hunter ${hunterName} tracked down and tagged ${runnerName}!`,
        type: 'danger'
      });
    };

    const onGameEnded = ({ room: updatedRoom, reason }) => {
      setRoom(updatedRoom);
    };

    const onHunterLocationUpdated = ({ hunterId, hunterName, location }) => {
      setTeammateLocations((prev) => {
        const filtered = prev.filter((t) => t.id !== hunterId);
        return [...filtered, { id: hunterId, name: hunterName, location }];
      });
    };

    const onGameError = ({ message }) => {
      sound.playErrorBuzz();
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 5000);
    };

    const onQuickCommReceived = (msg) => {
      sound.playRadioChirp();
      showAbilityBanner({
        id: `comm_${Date.now()}`,
        title: `📻 RADIO COMMS • ${msg.senderName.toUpperCase()}`,
        desc: `"${msg.text}"`,
        type: 'info'
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_updated', onRoomUpdated);
    socket.on('game_started', onGameStarted);
    socket.on('pin_warning', onPinWarning);
    socket.on('mandatory_pin_dropped', onMandatoryPinDropped);
    socket.on('universal_ability_alert', onUniversalAbilityAlert);
    socket.on('quick_comm_received', onQuickCommReceived);
    socket.on('runner_tagged', onRunnerTagged);
    socket.on('game_ended', onGameEnded);
    socket.on('hunter_location_updated', onHunterLocationUpdated);
    socket.on('game_error', onGameError);

    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => setServerIp(data.ip))
      .catch(() => {});

    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
      setRoomCodeInput(joinCode.toUpperCase());
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_updated', onRoomUpdated);
      socket.off('game_started', onGameStarted);
      socket.off('pin_warning', onPinWarning);
      socket.off('mandatory_pin_dropped', onMandatoryPinDropped);
      socket.off('universal_ability_alert', onUniversalAbilityAlert);
      socket.off('runner_tagged', onRunnerTagged);
      socket.off('game_ended', onGameEnded);
      socket.off('hunter_location_updated', onHunterLocationUpdated);
      socket.off('game_error', onGameError);
    };
  }, [room]);

  // GPS Tracking Loop
  useEffect(() => {
    locationTracker.start(
      (loc) => {
        setUserLocation(loc);
        if (room && socket.connected) {
          socket.emit('update_location', loc);
        }
      },
      (err) => {
        console.warn('GPS init note:', err.message);
        if (!userLocation) {
          locationTracker.setSimulated(true, 51.505, -0.09);
        }
      }
    );

    return () => locationTracker.stop();
  }, [room]);

  // Handlers
  const handleCreateRoom = () => {
    sound.init();
    socket.emit('create_room', { playerName }, (res) => {
      if (res.success) {
        setRoom(res.room);
        setPlayerId(res.playerId);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!roomCodeInput.trim()) return;
    sound.init();
    socket.emit(
      'join_room',
      { roomCode: roomCodeInput.trim().toUpperCase(), playerName },
      (res) => {
        if (res.success) {
          setRoom(res.room);
          setPlayerId(res.playerId);
        } else {
          sound.playErrorBuzz();
          setErrorMessage(res.message);
          setTimeout(() => setErrorMessage(''), 4500);
        }
      }
    );
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room', () => {
      setRoom(null);
    });
  };

  const handleSetRole = (role) => {
    socket.emit('set_role', { role, targetPlayerId: playerId });
  };

  const handleRandomizeTeams = (mode = 'balanced') => {
    socket.emit('randomize_teams', { mode });
  };

  const handleUpdateSettings = (newSettings) => {
    socket.emit('update_settings', newSettings);
  };

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const handleUseDecoy = ({ lat, lng }) => {
    socket.emit('use_decoy_pin', { lat, lng });
  };

  const handleUseJammer = () => {
    socket.emit('use_radar_jammer');
  };

  const handleUseDroneScan = () => {
    socket.emit('use_drone_scan');
  };

  const handleDeployTripwire = ({ lat, lng }) => {
    socket.emit('deploy_tripwire', { lat, lng });
  };

  const handleSurrender = () => {
    if (confirm('Confirm surrender? You will yield as captured.')) {
      socket.emit('runner_surrender');
    }
  };

  const handleTagRunner = ({ runnerId, catchCodeInput }, cb) => {
    socket.emit('tag_runner', { runnerId, catchCodeInput }, cb);
  };

  const handleSendComm = (text) => {
    socket.emit('send_quick_comm', { text });
  };

  const handleTestAudio = () => {
    sound.init();
    sound.playSonarPing();
    showToast('🔊 AUDIO TEST: Sonar alert ping verified!');
  };

  const currentUser = room?.players?.[playerId] || {
    id: playerId,
    name: playerName,
    role: 'unassigned',
    powerups: {
      decoysLeft: 1,
      jammersLeft: 1,
      droneScansLeft: 1,
      tripwiresLeft: 2
    }
  };

  return (
    <div className={`h-full w-full overflow-hidden flex flex-col ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans antialiased`}>
      {/* Universal Tactical Header Bar */}
      <header className="h-14 px-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-40">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="Trampis Hunt Logo"
            className="w-8 h-8 rounded-xl border border-cyan-500/50 shadow-md object-cover"
          />
          <div>
            <div className="text-sm font-black tracking-tight text-white font-serif leading-none">
              Trampis Hunt
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
              <span>SQUAD PURSUIT</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {isConnected ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <Wifi className="w-2.5 h-2.5" /> LIVE
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-0.5">
                    <WifiOff className="w-2.5 h-2.5" /> RECONNECTING
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Test Button */}
          <button
            onClick={handleTestAudio}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700 transition active:scale-95"
            title="Test Phone Speaker / Unmute"
          >
            🔊
          </button>

          {/* Rules Button */}
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold transition active:scale-95"
            title="Field Rules"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Server / Crossplay Config Button */}
          <button
            onClick={() => setShowServerModal(true)}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700 transition active:scale-95"
            title="Crossplay Server Settings"
          >
            <Server className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            title="Toggle Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Universal Tactical Ability Announcement Banner (Visible to Both Teams!) */}
      {activeAbilityBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-fadeIn flex items-start gap-3 transition-all bg-slate-900/95 border-cyan-400/80 text-white">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 flex-shrink-0 mt-0.5">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black uppercase font-mono tracking-wider text-cyan-400">
              {activeAbilityBanner.title}
            </div>
            <div className="text-xs text-slate-200 mt-0.5 font-medium leading-snug">
              {activeAbilityBanner.desc}
            </div>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-rose-600 text-white rounded-2xl text-xs font-bold shadow-2xl border border-rose-400/40 animate-fadeIn flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {!room ? (
          /* Staging / Welcome / Join Screen */
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 max-w-md mx-auto w-full animate-fadeIn">
            <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4 sm:gap-5 my-auto">
              {/* Logo & Title */}
              <div className="flex flex-col items-center text-center">
                <img
                  src="/logo.jpg"
                  alt="Trampis Hunt Logo"
                  className="w-24 h-24 rounded-3xl border-2 border-cyan-500/40 shadow-xl object-cover mb-3"
                />
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  REAL-WORLD GPS PURSUIT
                </span>
                <h2 className="text-3xl font-serif font-black text-white mt-2">
                  Trampis Hunt
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Runners on foot vs Hunters on wheels. 10-minute radar pings. Don't get caught.
                </p>
              </div>

              {/* Codename Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                  Operative Codename
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Your Codename"
                  className="px-4 py-3 rounded-2xl border border-slate-800 bg-slate-950 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Host Game Button */}
              <button
                onClick={handleCreateRoom}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>HOST NEW HUNT</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">OR JOIN WITH CODE</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              {/* Join Code Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={5}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-800 bg-slate-950 text-sm font-mono font-black tracking-widest uppercase text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomCodeInput.trim()}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
                >
                  <span>Join</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Field Manual Link */}
              <button
                onClick={() => setShowRules(true)}
                className="text-center text-xs text-slate-400 hover:text-cyan-400 font-semibold transition flex items-center justify-center gap-1.5 pt-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>How to Play & Field Rules</span>
              </button>

              {/* Offline / Reconnecting Helper Card */}
              {!isConnected && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-2xl flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-400">
                    <span className="flex items-center gap-1.5">
                      <WifiOff className="w-3.5 h-3.5" /> RECONNECTING TO HOST
                    </span>
                    <button
                      onClick={() => setShowServerModal(true)}
                      className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] hover:bg-rose-500/30 font-bold underline"
                    >
                      Change IP
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-snug">
                    Connecting to <strong className="text-cyan-400 font-mono">{customServerUrl || 'https://trampis-hunt.onrender.com'}</strong>. Check your internet connection!
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : room.status === 'lobby' ? (
          <Lobby
            room={room}
            playerId={playerId}
            onSetRole={handleSetRole}
            onRandomizeTeams={handleRandomizeTeams}
            onUpdateSettings={handleUpdateSettings}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
            onOpenRules={() => setShowRules(true)}
            serverIp={serverIp}
          />
        ) : room.status === 'playing' ? (
          currentUser.role === 'runner' ? (
            <RunnerView
              room={room}
              player={currentUser}
              userLocation={userLocation}
              onUseDecoy={handleUseDecoy}
              onUseJammer={handleUseJammer}
              onSurrender={handleSurrender}
            />
          ) : (
            <HunterView
              room={room}
              player={currentUser}
              userLocation={userLocation}
              teammateLocations={teammateLocations}
              onTagRunner={handleTagRunner}
              onUseDroneScan={handleUseDroneScan}
              onDeployTripwire={handleDeployTripwire}
            />
          )
        ) : (
          <GameOverView
            room={room}
            playerId={playerId}
            onResetGame={handleResetGame}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Crossplay Server Settings Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Crossplay Connection</h3>
                <p className="text-[11px] text-slate-400">Sync between .APK and Web App</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If playing on the native <strong className="text-emerald-400">.APK</strong>, enter the host PC's Wi-Fi IP address so all devices join the same room.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                Host Server URL
              </label>
              <input
                type="text"
                value={customServerUrl}
                onChange={(e) => setCustomServerUrl(e.target.value)}
                placeholder="http://192.168.0.103:3001"
                className="px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {serverIp && (
              <button
                type="button"
                onClick={() => setCustomServerUrl(`http://${serverIp}:3001`)}
                className="text-left text-[11px] text-cyan-400 hover:underline font-mono"
              >
                Auto-fill Local LAN: http://{serverIp}:3001
              </button>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowServerModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  reconnectToServer(customServerUrl);
                  setShowServerModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition active:scale-95"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
