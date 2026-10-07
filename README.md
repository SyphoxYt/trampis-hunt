# 🎯 Trampis Hunt — Real-World Tactical GPS Pursuit

A real-world outdoor manhunt game for mobile devices inspired by tactical manhunt challenges.

Players are split into two teams: **Runners** (on foot) and **Hunters** (mobile/vehicles/foot). Every 10 minutes, the runners' live GPS coordinates are forcefully broadcasted to all hunters with radar pings and audio alarms. Runners must use stealth, timing, and tactical abilities to evade capture.

Designed with a clean, warm **Claude-inspired aesthetic** (warm stone, terracotta `#D97757` accents, high-contrast dark radar mode, crisp typography).

---

## ⚡ Game Concept & Rules

### 🏃 Team 1: The Runners (On Foot)
- **Rules**: Must move entirely on foot (no cars or motorized transport).
- **The Ping**: Every 10 minutes (configurable), your GPS location is broadcasted to all hunters.
- **Audio Warning**: 30 seconds before every ping, an urgent audio alert and countdown begins so you can change direction or break line-of-sight.
- **Tactical Gear**:
  - 👻 **Decoy Pin (1 Charge)**: Tap anywhere on your tactical map to broadcast a false location and send hunters in the wrong direction.
  - ⚡ **Radar Jammer (1 Charge)**: Delay the next mandatory pin drop by +3 minutes.
- **Catch Code**: Every runner has a secret 4-digit code and QR badge. If physically trapped, give this code to the hunter or tap *Surrender*.

### 🚗 / 🚶 Team 2: The Hunters (Pursuers)
- **Rules**: Can pursue on foot, bicycles, or vehicles.
- **Tactical Radar**: Receives timestamped runner pins with **Uncertainty Radius Circles** (showing the maximum distance a runner on foot could have fled since the last ping).
- **Teammate Tracking**: Live locations of fellow hunters are displayed in real-time to execute pincer traps and road cordons.
- **Capture Mechanism**:
  - **Proximity Tag**: Tag button enables when within 25 meters of the runner.
  - **Catch Code**: Enter the runner's 4-digit verification code.

---

## 🚀 Running the Game

The project includes a realtime Node.js + Socket.io server and a responsive mobile web client.

### 1. Start Server & Play Immediately
```bash
cd trampis-hunt
npm run server
```

The terminal will display:
```
========================================
🎯 TRAMPIS HUNT SERVER IS LIVE!
💻 Local:   http://localhost:3001
📱 Mobile:  http://192.168.0.xxx:3001
========================================
```

- Any phone connected to the same Wi-Fi (or mobile hotspot) can open the **Mobile URL** in Chrome or Safari.
- In the lobby, click the **Invite / QR Code** button to let friends scan with their phone camera and join instantly!

---

## 📱 Building the Android APK (`.apk`)

The project is built with **Capacitor** and includes a complete native Android project ready for compilation.

### Option 1: Free Automated Cloud Build (GitHub Actions)
A preconfigured workflow is included at [`.github/workflows/build-apk.yml`](file:///C:/Users/User/.gemini/antigravity/scratch/trampis-hunt/.github/workflows/build-apk.yml):
1. Push this folder to a GitHub repository.
2. Go to the **Actions** tab on GitHub.
3. Run the **Build Android APK** workflow.
4. Download the compiled `trampis-hunt-debug.apk` directly from GitHub Artifacts!

### Option 2: Build Locally with Android Studio
1. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
2. In Android Studio, click:
   `Build > Build Bundle(s) / APK(s) > Build APK(s)`
3. The APK will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 3: Instant Progressive Web App (PWA) Install
Because Trampis Hunt includes a Web Manifest, service worker, and high-accuracy GPS permissions:
1. Open `http://<your-ip>:3001` on any Android device in Chrome.
2. Tap the browser menu `⋮` > **"Install app"** or **"Add to Home screen"**.
3. It installs as a full-screen, native-feeling app icon on the home screen with full vibration, audio, and geolocation access!

---

## 🛠️ Project Structure

- `server/index.js` — Realtime Express + Socket.io game state server (room sync, game loop, timers, tags).
- `src/services/sound.js` — Procedural Web Audio API sound synthesizer (radar sonar pings, 30s countdown ticks, hunter sirens, capture fanfare). Zero external dependencies.
- `src/services/geolocation.js` — High-accuracy GPS watcher with distance calculations and simulated testing fallback.
- `src/components/Map.jsx` — Leaflet tactical radar map with custom ripple markers, teammates, and expanding uncertainty circles.
- `src/components/Lobby.jsx` — Claude-styled lobby with room QR codes, randomized team splitting, and rule sliders.
- `src/components/RunnerView.jsx` — High-stakes Runner HUD with 10-minute countdown clock, decoy pin trigger, and jammer ability.
- `src/components/HunterView.jsx` — Tactical Hunter Command with live radar, runner proximity intel, and capture modal.
- `src/components/GameOverView.jsx` — Victory screen with stats, timeline, and rematch launcher.
- `android/` — Full native Android platform configured with location, vibration, and wake lock permissions.
