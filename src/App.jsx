import { useRef, useState } from 'react';
import logo from '../images/logo.png';
import { tracks, releases } from './data/tracks.js';
import { getWidgetUrl } from './soundcloud.js';
import { useSoundCloud } from './useSoundCloud.js';
import BackgroundVisualizer from './BackgroundVisualizer.jsx';
import BackgroundAtmosphere from './BackgroundAtmosphere.jsx';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PlaybackMark({ playing }) {
  return playing ? (
    <span className="playing-mark" aria-hidden="true"><i /><i /><i /></span>
  ) : (
    <svg className="play-mark" viewBox="0 0 16 16" aria-hidden="true">
      <path d="m5 3 8 5-8 5Z" fill="currentColor" />
    </svg>
  );
}

function VolumeIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m11 4-5 4H3v8h3l5 4V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {muted ? (
        <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <>
          <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const iframeRef = useRef(null);
  const initialWidgetUrl = useRef(getWidgetUrl(tracks[0].url));
  const track = tracks[selectedIndex];
  const player = useSoundCloud({ iframeRef, track });
  const lastVolumeRef = useRef(100);

  function changeVolume(value) {
    if (value > 0) lastVolumeRef.current = value;
    player.setVolume(value);
  }

  function toggleMute() {
    if (player.volume === 0) {
      player.setVolume(lastVolumeRef.current);
    } else {
      lastVolumeRef.current = player.volume;
      player.setVolume(0);
    }
  }

  function selectTrack(index) {
    if (index === selectedIndex) {
      player.togglePlayback();
    } else {
      setSelectedIndex(index);
    }
  }

  return (
    <>
      <BackgroundAtmosphere playing={player.playing} title={track.title} trackId={track.slug} />
      <BackgroundVisualizer
        playing={player.playing}
        position={player.position}
        duration={player.duration}
        trackId={track.slug}
        colorCue={track.visualizerColorCue}
      />
      <main className="site">
        <header className="site-header">
          <h1><img src={logo} alt="tusumie" width="1280" height="500" /></h1>
        </header>

        <section className="music" aria-label="Music">
          <div className="song-picker">
            <div className="featured-artwork">
              <img key={track.id} src={track.artwork} alt={`${track.title} cover`} width="500" height="500" />
            </div>
            <ol className="track-list" aria-label="Choose a song">
              {tracks.map((song, index) => {
                const selected = selectedIndex === index;
                return (
                  <li key={song.id} className={`track-row${selected ? ' is-selected' : ''}`}>
                    <button
                      className="track-select"
                      onClick={() => selectTrack(index)}
                      aria-current={selected ? 'true' : undefined}
                      aria-label={`${selected && player.playing ? 'Pause' : 'Play'} ${song.title}`}
                    >
                      <span className="track-number">
                        {selected ? <PlaybackMark playing={player.playing} /> : String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="track-title">{song.title}</span>
                    </button>
                    <a
                      className="track-external"
                      href={song.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${song.title} on SoundCloud`}
                      title="Open on SoundCloud"
                    ><ArrowIcon /></a>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="player" aria-label={`${track.title} player`}>
            <iframe
              ref={iframeRef}
              title="SoundCloud music player"
              src={initialWidgetUrl.current}
              allow="autoplay"
              height="120"
              scrolling="no"
            />
            <div className="player-controls">
              <button
                type="button"
                className="volume-toggle"
                onClick={toggleMute}
                aria-label={player.volume === 0 ? 'Unmute' : 'Mute'}
                aria-pressed={player.volume === 0}
                title={player.volume === 0 ? 'Unmute' : 'Mute'}
              ><VolumeIcon muted={player.volume === 0} /></button>
              <input
                className="volume-slider"
                type="range"
                min="0"
                max="100"
                step="1"
                value={player.volume}
                onChange={(event) => changeVolume(Number(event.target.value))}
                aria-label="Volume"
                aria-valuetext={`${player.volume}%`}
                style={{ '--volume-fill': `${player.volume}%` }}
              />
              <output className="volume-value" aria-hidden="true">{player.volume}%</output>
            </div>
            {player.error && (
              <p className="player-error" role="status">
                Player unavailable. <a href={track.url} target="_blank" rel="noopener noreferrer">Listen on SoundCloud <span aria-hidden="true">↗</span></a>
              </p>
            )}
          </div>
        </section>

        <section className="releases" aria-label="Spotify releases">
          {releases.map((release) => (
            <a key={release.title} className="release" href={release.url} target="_blank" rel="noopener noreferrer">
              <img src={release.artwork} alt="" width="64" height="64" loading="lazy" />
              <span className="release-copy"><span>{release.title}</span><span className="release-platform">Spotify</span></span>
              <ArrowIcon />
            </a>
          ))}
        </section>
        <footer className="site-footer">&lt;3</footer>
      </main>
    </>
  );
}
