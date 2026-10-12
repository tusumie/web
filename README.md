# tusumie

React + Vite, with SoundCloud playback and a waveform background.

```sh
npm install
npm run dev
```

`npm run build` creates the static site in `dist/`. `npm run preview` serves that build locally. The build retains the existing `tusumie.com` CNAME and uses relative asset paths for GitHub Pages.

Songs, artwork, and the two existing release links are in `src/data/tracks.js`. The release links retain their original DistroKid destinations, which offer Spotify. The waveform data is cached in `src/data/waveforms.json`.

The SoundCloud Widget API controls playback. The background follows each track's recorded amplitude envelope at the current playback position; the SoundCloud iframe does not expose audio for live spectrum analysis. It pauses with playback and respects reduced motion. Nothing autoplays on page load.

The GitHub Pages workflow builds and deploys `dist/` on pushes to `main`. In the repository's Settings → Pages, set the deployment source to GitHub Actions. The custom domain remains `tusumie.com`.

The player includes volume and mute controls. Volume is retained when switching songs. In `tell ur world :)`, the background waveform fades into pastel RGB at 1:29.5; seeking before that point returns it to grayscale.
