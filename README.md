# WebXR Cinema

Your video on a cinematic virtual screen. Works in desktop and mobile browsers and in Meta Quest VR.
Built with three.js 0.160 (loaded from a CDN, so no build step).

```
webxr-cinema/
├── index.html        page, overlay, import map
├── main.js           scene, video screen, controls, VR input
├── serve.py          local server with Range support (video seeking needs it)
└── assets/video.mp4  your video, re-encoded to H.264 (the original was MPEG-4 Part 2, which browsers cannot play)
```

## Setup

You need a web server. Opening `index.html` by double-click (`file://`) will not work.
Requires Python 3 (or Node, see below). Your computer needs internet access for the three.js CDN.

```bash
cd webxr-cinema
python3 serve.py          # http://localhost:8080
# alternative: npx http-server -p 8080 -c-1
```

To swap the video, replace `assets/video.mp4`. Use H.264 (yuv420p) and keep it at 16:9, or change `SW`/`SH` in `main.js`.
To re-encode: `ffmpeg -i in.mp4 -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart assets/video.mp4`

### Getting it onto the Quest (WebXR requires HTTPS or localhost)

Pick one:

**A. USB + adb (fastest, no HTTPS needed)**
1. Enable Developer Mode on the Quest (Meta Horizon phone app → Devices → Developer Mode), connect USB, accept the prompt in the headset.
2. On your computer: `adb reverse tcp:8080 tcp:8080`
3. In Quest Browser open `http://localhost:8080`. The headset treats localhost as secure.

**B. Temporary HTTPS tunnel (works over Wi-Fi)**
1. Run `python3 serve.py`, then in another terminal `npx cloudflared tunnel --url http://localhost:8080`
   (or `ngrok http 8080`).
2. Open the printed `https://…` link in Quest Browser.

**C. Host it** on Netlify, Vercel, GitHub Pages or Cloudflare Pages: upload the folder as is. HTTPS is automatic.

## Controls

| Where | Action | Result |
|---|---|---|
| Desktop | Drag mouse | Look around |
| Desktop | Scroll wheel | Zoom (FOV) |
| Desktop | Click screen / `Space` | Play / pause |
| Desktop | Click progress bar | Seek |
| Desktop | `←` / `→` | Seek ∓2 s |
| Desktop | `F` / `R` | Fullscreen / reset view |
| Mobile | Drag | Look around |
| Mobile | Tap screen | Play / pause |
| Mobile | Tap progress bar | Seek |
| Quest | Point + **trigger** (or hand pinch) on screen | Play / pause |
| Quest | Point + **trigger** on gold bar | Jump to that position |
| Quest | **Thumbstick left/right** | Scrub backward / forward |
| Quest | **Thumbstick up/down** | Make the screen larger / smaller |
| Quest | **Grip (squeeze)** | Bring the screen in front of you |
| Quest | **Aim at the paused screen for 3 s** | A gold ring fills, then the video plays automatically (`DWELL_SECONDS` in `main.js`) |

The room lighting and the glow behind the screen take their colour from the video as it plays.
The clip has no audio track, so there is no sound.

## Testing steps

1. **Desktop (Chrome/Edge/Firefox):** run the server, open `http://localhost:8080`, click **Start screening**. The video should play on the screen with a looping progress bar. Test drag, scroll, Space, arrows and clicking the bar.
2. **Mobile:** open `http://<your-computer-LAN-IP>:8080` on a phone on the same Wi-Fi. Tap **Start screening** (needed for autoplay). Drag to look around. The “Enter VR” button will say VR is unsupported on most phones, which is normal.
3. **Desktop WebXR without a headset (optional):** install the *Immersive Web Emulator* browser extension, reload, click **ENTER VR**, and use the emulated controllers to try trigger and grip.
4. **Quest:** open the page using option A, B or C above. Click **ENTER VR** at the bottom of the page. Check that: the video is playing, the ray turns white over the screen, trigger toggles pause, the bar scrubs, the thumbstick resizes the screen, grip recenters it, and pausing then holding the ray on the screen for 3 seconds auto-plays it (after a manual trigger toggle, move the ray off the screen first to re-arm it).

## Troubleshooting

- **“Video failed to load”**: you opened the file directly, or `assets/video.mp4` is missing. Use the server.
- **No “Enter VR” / “VR not supported”**: not HTTPS or localhost, or the browser has no WebXR (iOS Safari). Use Quest Browser or desktop Chrome.
- **Seeking jumps back to the start**: the server lacks HTTP Range support. Use `serve.py` or `npx http-server`.
- **Glow doesn’t follow the video colours**: happens only when opened from `file://`; use the server.
