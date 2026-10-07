# botw-map

Offline BOTW companion map. Tauri 2 + React. All map data ships in `assets/`; progress is local SQLite.

## Install (Arch)

Once on the AUR:

```bash
yay -S botw-map
```

Until then, from this repo:

```bash
cd aur/botw-map && makepkg -si
```

To publish AUR: add your AUR SSH key as GitHub secret `AUR_SSH_PRIVATE_KEY`, then run the `aur` workflow after a release.

## Dev

```bash
npm install
npm run tauri:dev
```

Needs Node 18+, Rust, and `zstd`. `postinstall` unpacks offline map data.

```bash
npm run tauri:build
```

CI builds `.deb`, AppImage, `.exe` (NSIS), and `.msi` on version tags (`v*`).

Unofficial fan project. Not affiliated with Nintendo.
