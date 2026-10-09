# 🎯 Trampis Hunt — Real-World Tactical GPS Pursuit

A real-world outdoor manhunt game for mobile devices inspired by tactical manhunt challenges.

Players are split into two teams: **Runners** (on foot) and **Hunters** (pursuers on foot, bicycles, or vehicles). Every 10 minutes (configurable), active runners' GPS coordinates are forcefully broadcasted to all hunters with radar sonar pings, vibration alarms, and expanding uncertainty circles. Runners must use stealth, map positioning, and tactical abilities to evade capture.

Live Web App & Backend: [https://trampis-hunt.onrender.com](https://trampis-hunt.onrender.com)

---

## ⚡ Game Concept & Rules

### 🏃 Team 1: The Runners (On Foot)
- **Movement**: Must move entirely on foot (no cars or motorized transport).
- **Mandatory Pin Drops**: Every 10 minutes (customizable from 1 to 30 min), your location is pinpointed on the hunters' tactical radar.
- **Early Warning Radar**: 30 seconds before every ping, an urgent audio alert, pulsing countdown, and device vibration warn you to change direction or break line-of-sight.
- **Teammate Tracking**: Active runners see fellow runners' live locations on the satellite map to coordinate evasion routes. Captured runners stop transmitting.
- **Tactical Abilities**:
  - ⚡ **Radar Jammer (+3 min)**: Delays the hunters' next scheduled radar ping by 3 minutes.
  - 👻 **Decoy Pin**: Drops false coordinates at a location of your choice on the radar map.
- **Capture Verification**:
  - Each runner receives a unique 4-digit **Catch Code** and QR verification badge.
  - If cornered, provide your code to the hunter or tap **Surrender**.

---

### 🚗 / 🚶 Team 2: The Hunters (Pursuers)
- **Movement**: Can pursue on foot, bicycles, or vehicles.
- **Tactical Radar & Uncertainty Radius**: Receives timestamped runner pins with expanding uncertainty circles showing the maximum distance a runner on foot could have fled since the last ping.
- **Teammate Tracking**: Real-time live coordinates of fellow hunters to coordinate pincer movements and road cordons.
- **Tactical Abilities**:
  - ✈️ **Drone Recon Sweep**: Forces an instant, out-of-cycle radar ping revealing all active runner positions.
  - 📡 **Motion Tripwire**: Place sensor beacons on the satellite map that trip and buzz all hunters if a runner crosses within 25 meters.
- **Capture Mechanisms**:
  - 🎯 **Proximity Tag (≤ 5 meters)**: When within 5 meters of a runner, the tactical tag button unlocks. Server verifies high-accuracy GPS proximity.
  - 🔑 **Catch Code**: Enter the cornered runner's 4-digit code to verify the catch without GPS.

---

## ✨ Features & Polish

- **Custom Colors & Avatars**: Pick custom runner/hunter avatars (🥷, 🏃, 🦊, ⚡, 🐆, 🦅, 🎯, 🕵️, 🐺, 👻, 🔥, 💀) and signature marker colors that show on the radar and map markers.
- **Career & Season Stats**: Persistent match history, escape rate, tags made, tripwires triggered, and personal records stored locally on device.
- **Mobile Edge-to-Edge & Safe Area Insets**: Full support for Android and iOS notches, punch-holes, and gesture navigation bars via dynamic safe-area CSS environment variables.
- **Audio & Haptic Feedback**: Procedural Web Audio API sound synthesizer (sonar pulses, 30s alarm sirens, tripwire alerts, victory anthems) paired with device vibration patterns.
- **Host Room Management**:
  - End hunt early button with dedicated post-match summary.
  - Kick offline or disruptive players.
  - Balanced auto-team randomizer.
  - Reconnect hijacking protection with cryptographically secure session tokens.
- **Offline & Memory Resilient**: Bounded tactical pin history and game event logs preventing memory degradation during extended matches.

---

## 🚀 Running the Game

The project contains a realtime Node.js + Socket.IO server and a Vite React mobile web client.

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server & Client Locally
```bash
# Start backend server (port 3001)
npm run server

# In another terminal, start Vite dev server (port 5173)
npm run dev
```

Alternatively, build and serve production:
```bash
npm run build
npm start
```

### 3. Playing over Local Wi-Fi / Hotspot
1. Ensure both phones are on the same Wi-Fi network or mobile hotspot.
2. The terminal displays your local network IP (e.g., `http://192.168.1.xxx:3001`).
3. Tap **Invite / QR Code** in the lobby to let players scan and join directly from their phone camera.
4. Players can also tap **Server Settings** to connect to custom LAN endpoints or use the hosted Render server.

---

## 📱 Mobile App & Android APK (`.apk`)

The project is built with **Capacitor** and includes a complete native Android project.

### Option 1: Direct Local APK Build (PowerShell)
Run the automated build script:
```powershell
powershell -ExecutionPolicy Bypass -File build_apk.ps1
```
The compiled release/debug APK will be placed at the root directory:
```
trampis-hunt.apk (~8.8 MB)
```

### Option 2: Build via Android Studio
```bash
npm run build
npx cap sync android
npx cap open android
```
In Android Studio:
1. Select `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
2. Find the output in `android/app/build/outputs/apk/debug/app-debug.apk`.

### Option 3: Progressive Web App (PWA) Install
1. Open [https://trampis-hunt.onrender.com](https://trampis-hunt.onrender.com) (or your local LAN IP) in Chrome on Android or Safari on iOS.
2. Tap the browser menu `⋮` > **"Install app"** / **"Add to Home Screen"**.
3. Launches as a full-screen standalone application with high-accuracy GPS and vibration support.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet.
- **Backend**: Node.js, Express, Socket.IO with WebSocket transports.
- **Mobile Native**: Capacitor Android (`@capacitor/geolocation`, `@capacitor/core`).
- **Audio & Haptics**: Native Web Audio API procedural sound engine + Web Vibration API.
- **Mapping & Geolocation**: High-accuracy HTML5 Geolocation API, Haversine proximity validation, Esri World Imagery satellite tiles, OpenStreetMap humanitarian tiles.
