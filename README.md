# botw-map

Offline desktop companion map for *The Legend of Zelda: Breath of the Wild*.

Browse Hyrule with real marker data (shrines, koroks, towers, quests, chests, bosses, and more), filter and search, build hunt routes, mark progress locally, and sync completions from map screenshots. Everything runs offline after install. Progress is stored on your machine in SQLite.

Unofficial fan project. Not affiliated with Nintendo.

## Download

Grab the latest build from [Releases](https://github.com/swap/botw-map/releases).

| Platform | File |
| --- | --- |
| Windows | `.exe` installer (NSIS) |
| Debian / Ubuntu | `.deb` |
| Linux (portable) | `.AppImage` |
| Arch Linux | see below |

## Windows

1. Open the latest [release](https://github.com/swap/botw-map/releases).
2. Download the Windows `.exe` installer.
3. Run it and follow the prompts.
4. Start **BOTW Map** from the Start menu.

If SmartScreen warns about an unknown publisher, choose **More info** → **Run anyway** (unsigned fan build).

## Arch Linux

### AUR (when the package is listed)

```bash
yay -S botw-map
```

Same idea with other AUR helpers (`paru -S botw-map`, etc.).

### If the AUR package is not available yet

**Option A — install the release `.deb` contents via the PKGBUILD in this repo**

```bash
git clone https://github.com/swap/botw-map.git
cd botw-map/aur/botw-map
makepkg -si
```

That downloads the published `.deb` from GitHub Releases and installs it with pacman.

**Option B — use the AppImage**

1. Download `BOTW.Map_*_amd64.AppImage` from [Releases](https://github.com/swap/botw-map/releases).
2. Make it executable and run it:

```bash
chmod +x BOTW.Map_*_amd64.AppImage
./BOTW.Map_*_amd64.AppImage
```

**Option C — convert / install the `.deb` yourself**

```bash
# download BOTW.Map_*_amd64.deb from Releases, then e.g.:
sudo pacman -S debtap   # or use another deb→pkg converter you prefer
```

Or build from source (see below).

## Debian / Ubuntu

```bash
sudo apt install ./BOTW.Map_*_amd64.deb
```

Use the `.deb` from [Releases](https://github.com/swap/botw-map/releases).

## Features

- Interactive Hyrule map (pan / zoom) with offline map tiles
- Markers: shrines, koroks, towers, labs, quests, memories, chests, bosses, services, and more
- Category filters and search
- Marker details with local guide images and notes
- Mark complete (hides finished markers; can show them again in settings)
- Route builder for hunts (auto or custom pins)
- Screenshot sync: drop a map screenshot to mark matching spots complete
- Fully offline; no account

## Build from source

Needs **Node.js 18+**, **Rust**, and **zstd**.

```bash
git clone https://github.com/swap/botw-map.git
cd botw-map
npm install
npm run tauri:dev    # run
npm run tauri:build  # package for your OS
```

`npm install` unpacks bundled map data from `assets/` into `public/data/`.

### Linux build deps (example)

```bash
# Arch
sudo pacman -S webkit2gtk-4.1 base-devel curl wget openssl appmenu-gtk-module libappindicator-gtk3 librsvg zstd

# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev zstd
```

## License / disclaimer

Fan-made companion only. Zelda, Breath of the Wild, and related marks belong to Nintendo. Map and marker data are redistributed for offline personal use; use at your own risk.
