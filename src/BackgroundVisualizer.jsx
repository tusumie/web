import { useEffect, useRef } from 'react';
import waveforms from './data/waveforms.json';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const pastelColors = [
  [236, 165, 178],
  [173, 226, 186],
  [173, 193, 239],
];

function colorChannels(color) {
  const hex = color.match(/^#([a-f\d]{3}|[a-f\d]{6})$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
    return [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16));
  }

  const rgb = color.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  return rgb ? rgb.slice(1, 4).map(Number) : [164, 164, 164];
}

function pastelAt(fraction, cueElapsed, inkChannels, blend) {
  // One RGB cycle spans the canvas and drifts with the track's playback time.
  const phase = (fraction * pastelColors.length + cueElapsed / 16_000) % pastelColors.length;
  const left = Math.floor(phase);
  const right = (left + 1) % pastelColors.length;
  const mix = phase - left;
  const channels = inkChannels.map((ink, channel) => {
    const pastel = pastelColors[left][channel] * (1 - mix) + pastelColors[right][channel] * mix;
    return Math.round(ink + (pastel - ink) * blend);
  });

  return `rgb(${channels.join(', ')})`;
}

function amplitudeAt(waveform, index) {
  if (index < 0 || index > waveform.samples.length - 1) return 0;

  const left = Math.floor(index);
  const right = Math.min(left + 1, waveform.samples.length - 1);
  const fraction = index - left;
  const value = waveform.samples[left] * (1 - fraction) + waveform.samples[right] * fraction;

  return clamp(value / waveform.height, 0, 1);
}

export default function BackgroundVisualizer({ playing, position, duration, trackId, colorCue }) {
  const canvasRef = useRef(null);
  const playbackRef = useRef(null);
  const drawRef = useRef(null);

  useEffect(() => {
    playbackRef.current = {
      playing,
      position: Number.isFinite(position) ? Math.max(0, position) : 0,
      duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
      trackId,
      colorCue: Number.isFinite(colorCue) ? Math.max(0, colorCue) : null,
      receivedAt: performance.now(),
    };
    // Also reflect a seek immediately while playback is paused.
    if (!playing) drawRef.current?.(performance.now());
  }, [playing, position, duration, trackId, colorCue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId = null;
    let lastDrawnAt = 0;
    let width = 0;
    let height = 0;
    let ink = '#a4a4a4';
    let inkChannels = colorChannels(ink);

    const stop = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    };

    const draw = (now) => {
      context.clearRect(0, 0, width, height);
      if (motionPreference.matches || document.hidden) return;

      const playback = playbackRef.current;
      const waveform = playback && waveforms[playback.trackId];
      if (!waveform?.samples?.length || !waveform.height || !playback.duration) return;

      // Stop advancing if the widget stalls without sending a pause event.
      const elapsed = playback.playing ? clamp(now - playback.receivedAt, 0, 500) : 0;
      const currentPosition = clamp(playback.position + elapsed, 0, playback.duration);
      const cueElapsed = playback.colorCue === null ? -1 : currentPosition - playback.colorCue;
      const transition = clamp(cueElapsed / 600, 0, 1);
      const colorBlend = transition * transition * (3 - 2 * transition);
      const currentSample = (currentPosition / playback.duration) * (waveform.samples.length - 1);
      // A twelve-second window of the track's actual amplitude envelope scrolls past.
      const sampleWindow = (12_000 / playback.duration) * (waveform.samples.length - 1);
      const barCount = Math.max(36, Math.min(180, Math.floor(width / 9)));
      const spacing = width / (barCount - 1);
      const maxBarHeight = Math.min(height * 0.28, 240);
      const centerY = height * 0.54;

      context.strokeStyle = ink;
      context.lineWidth = width < 600 ? 1.5 : 2;
      context.lineCap = 'round';

      for (let bar = 0; bar < barCount; bar += 1) {
        const fraction = bar / (barCount - 1);
        const amplitude = amplitudeAt(waveform, currentSample + (fraction - 0.5) * sampleWindow);
        if (amplitude === 0) continue;

        const barHeight = amplitude * maxBarHeight;
        const x = bar * spacing;
        // Fade into the sky at the edges and soften the area beneath the player.
        const edgeFade = Math.sin(fraction * Math.PI) ** 0.7;
        const centerFade = 0.6 + Math.abs(fraction - 0.5) * 0.8;
        context.globalAlpha = edgeFade * centerFade;
        context.strokeStyle = colorBlend > 0 ? pastelAt(fraction, cueElapsed, inkChannels, colorBlend) : ink;
        context.beginPath();
        context.moveTo(x, centerY - barHeight / 2);
        context.lineTo(x, centerY + barHeight / 2);
        context.stroke();
      }

      context.globalAlpha = 1;
    };
    drawRef.current = draw;

    const animate = (now) => {
      frameId = null;
      if (!playing || motionPreference.matches || document.hidden) return;

      if (now - lastDrawnAt >= 1000 / 30) {
        draw(now);
        lastDrawnAt = now;
      }
      frameId = requestAnimationFrame(animate);
    };

    const start = () => {
      stop();
      if (motionPreference.matches) {
        context.clearRect(0, 0, width, height);
        return;
      }
      if (document.hidden) return;

      draw(performance.now());
      if (playing) frameId = requestAnimationFrame(animate);
    };

    const resize = () => {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      ink = getComputedStyle(canvas).getPropertyValue('--visualizer-color').trim() || '#a4a4a4';
      inkChannels = colorChannels(ink);
      if (!motionPreference.matches && !document.hidden) draw(performance.now());
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
    motionPreference.addEventListener('change', start);
    resize();
    start();

    return () => {
      stop();
      drawRef.current = null;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionPreference.removeEventListener('change', start);
    };
  }, [playing, trackId]);

  return (
    <canvas
      ref={canvasRef}
      className={`background-visualizer${playing ? ' is-playing' : ''}${Number.isFinite(colorCue) && position >= colorCue ? ' is-pastel' : ''}`}
      aria-hidden="true"
    />
  );
}
