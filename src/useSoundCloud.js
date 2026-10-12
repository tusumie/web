import { useCallback, useEffect, useRef, useState } from 'react'
import { loadSoundCloudApi, widgetOptions } from './soundcloud'

const emptyState = {
  ready: false,
  playing: false,
  position: 0,
  duration: 0,
  error: null,
  sound: null,
}
const LOAD_TIMEOUT = 20000
const playbackError = 'SoundCloud could not load this track. Open it on SoundCloud to listen.'

function normalizeUrl(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/$/, '')}`
  } catch {
    return url
  }
}

// The iframe keeps its initial src. Subsequent selections use Widget.load so
// the same visible SoundCloud player and its event listeners stay connected.
export function useSoundCloud({ iframeRef, track, onFinish }) {
  const [state, setState] = useState(emptyState)
  const [volume, setVolumeState] = useState(100)
  const volumeRef = useRef(100)
  const controllerRef = useRef(null)
  const trackRef = useRef(track)
  const onFinishRef = useRef(onFinish)
  const previousUrlRef = useRef(track.url)
  const playbackIntentRef = useRef(null)
  trackRef.current = track
  onFinishRef.current = onFinish

  useEffect(() => {
    let disposed = false
    let controller

    loadSoundCloudApi().then((SC) => {
      if (disposed || !iframeRef.current) return

      const widget = SC.Widget(iframeRef.current)
      const events = SC.Widget.Events
      const initialUrl = new URL(iframeRef.current.src).searchParams.get('url') || trackRef.current.url
      controller = {
        widget,
        loading: true,
        loadingUrl: initialUrl,
        loadId: 0,
        verifying: false,
        ready: false,
        playing: false,
        acceptedUrl: null,
        duration: 0,
        finished: false,
        playbackRevision: 0,
        positionRevision: 0,
        timer: null,
      }
      controllerRef.current = controller

      const isCurrent = (id) => !disposed && controller.loadId === id
      const acceptsEvents = () => !disposed && controller.ready
        && normalizeUrl(controller.acceptedUrl) === normalizeUrl(trackRef.current.url)

      const startTimer = () => {
        window.clearTimeout(controller.timer)
        const id = controller.loadId
        controller.timer = window.setTimeout(() => {
          if (!isCurrent(id)) return
          controller.loading = false
          controller.verifying = false
          controller.ready = false
          if (normalizeUrl(controller.loadingUrl) !== normalizeUrl(trackRef.current.url)) {
            controller.reconcile()
          } else {
            setState((current) => ({ ...current, ready: false, playing: false, error: playbackError }))
          }
        }, LOAD_TIMEOUT)
      }

      const completeLoad = (id) => {
        if (!isCurrent(id) || !controller.loading || controller.verifying) return
        controller.verifying = true
        widget.getCurrentSound((sound) => {
          if (!isCurrent(id) || !controller.loading) return
          controller.verifying = false

          // A load can finish after the user has already selected another song.
          // Finish this request, then load only the latest selection.
          if (normalizeUrl(controller.loadingUrl) !== normalizeUrl(trackRef.current.url)) {
            window.clearTimeout(controller.timer)
            controller.loading = false
            controller.reconcile()
            return
          }
          if (!sound) return
          if (sound.permalink_url && normalizeUrl(sound.permalink_url) !== normalizeUrl(controller.loadingUrl)) return

          window.clearTimeout(controller.timer)
          controller.loading = false
          controller.ready = true
          controller.acceptedUrl = controller.loadingUrl
          controller.duration = Number(sound.duration) || 0
          controller.finished = false
          widget.setVolume(volumeRef.current)
          setState({ ...emptyState, ready: true, sound, duration: controller.duration })

          const valid = () => isCurrent(id) && acceptsEvents()
          widget.getDuration((duration) => {
            if (!valid() || !Number.isFinite(duration)) return
            controller.duration = Math.max(0, duration)
            setState((current) => ({ ...current, duration: controller.duration }))
          })
          const positionRevision = controller.positionRevision
          widget.getPosition((position) => {
            if (valid() && controller.positionRevision === positionRevision && Number.isFinite(position)) {
              setState((current) => ({ ...current, position: Math.max(0, position) }))
            }
          })
          const playbackRevision = controller.playbackRevision
          widget.isPaused((paused) => {
            if (valid() && controller.playbackRevision === playbackRevision) {
              controller.playing = !paused
              setState((current) => ({ ...current, playing: !paused }))
            }
          })
          // A picker click can arrive before either the API or iframe is ready.
          // Apply the latest explicit intent after restoring the volume.
          const intent = playbackIntentRef.current
          if (intent && normalizeUrl(intent.url) === normalizeUrl(controller.acceptedUrl)) {
            if (intent.playing) widget.play()
            else widget.pause()
          }
        })
      }

      controller.reconcile = () => {
        if (disposed || controller.loading) return
        const url = trackRef.current.url
        if (controller.ready && normalizeUrl(controller.acceptedUrl) === normalizeUrl(url)) return
        controller.loadId += 1
        const id = controller.loadId
        controller.loading = true
        controller.loadingUrl = url
        controller.verifying = false
        controller.ready = false
        controller.playing = false
        controller.finished = false
        controller.duration = 0
        setState({ ...emptyState })
        widget.pause()
        startTimer()
        widget.load(url, {
          ...widgetOptions,
          auto_play: false,
          callback: () => completeLoad(id),
        })
      }

      const syncPosition = (event) => {
        if (!acceptsEvents()) return
        controller.positionRevision += 1
        if (Number.isFinite(event?.currentPosition)) {
          setState((current) => ({ ...current, position: Math.max(0, event.currentPosition) }))
        } else {
          const id = controller.loadId
          const revision = controller.positionRevision
          widget.getPosition((position) => {
            if (isCurrent(id) && acceptsEvents() && controller.positionRevision === revision && Number.isFinite(position)) {
              setState((current) => ({ ...current, position: Math.max(0, position) }))
            }
          })
        }
      }

      const bindings = [
        [events.READY, () => {
          // A readiness probe issued before iframe initialization may not have
          // answered yet. READY supplies another opportunity to read metadata.
          controller.verifying = false
          completeLoad(controller.loadId)
        }],
        [events.PLAY, (event) => {
          if (!acceptsEvents()) return
          controller.finished = false
          controller.playing = true
          playbackIntentRef.current = { url: trackRef.current.url, playing: true }
          controller.playbackRevision += 1
          setState((current) => ({ ...current, playing: true, error: null }))
          syncPosition(event)
        }],
        [events.PAUSE, (event) => {
          if (!acceptsEvents()) return
          controller.playing = false
          playbackIntentRef.current = { url: trackRef.current.url, playing: false }
          controller.playbackRevision += 1
          setState((current) => ({ ...current, playing: false }))
          syncPosition(event)
        }],
        [events.PLAY_PROGRESS, syncPosition],
        [events.SEEK, syncPosition],
        [events.FINISH, () => {
          if (!acceptsEvents() || controller.finished) return
          controller.finished = true
          controller.playing = false
          playbackIntentRef.current = { url: trackRef.current.url, playing: false }
          controller.playbackRevision += 1
          controller.positionRevision += 1
          setState((current) => ({ ...current, playing: false, position: controller.duration || current.position }))
          onFinishRef.current?.()
        }],
        [events.ERROR, () => {
          if (disposed) return
          window.clearTimeout(controller.timer)
          controller.loading = false
          controller.verifying = false
          controller.ready = false
          if (normalizeUrl(controller.loadingUrl) !== normalizeUrl(trackRef.current.url)) {
            controller.reconcile()
          } else {
            setState((current) => ({ ...current, ready: false, playing: false, error: playbackError }))
          }
        }],
      ].filter(([event]) => event)

      controller.unbind = () => bindings.forEach(([event]) => widget.unbind(event))
      bindings.forEach(([event, listener]) => widget.bind(event, listener))
      startTimer()
      // Also covers an iframe that became ready before the API script arrived.
      completeLoad(controller.loadId)
    }).catch((error) => {
      if (!disposed) setState((current) => ({ ...current, error: error.message, ready: false, playing: false }))
    })

    return () => {
      disposed = true
      if (controller) {
        window.clearTimeout(controller.timer)
        controller.unbind?.()
        if (controllerRef.current === controller) controllerRef.current = null
      }
    }
  }, [iframeRef])

  useEffect(() => {
    if (previousUrlRef.current === track.url) return
    previousUrlRef.current = track.url
    playbackIntentRef.current = { url: track.url, playing: true }
    setState({ ...emptyState })
    const controller = controllerRef.current
    if (!controller) return
    controller.ready = false
    controller.widget.pause()
    controller.reconcile()
  }, [track.url])

  const togglePlayback = useCallback(() => {
    const controller = controllerRef.current
    const url = trackRef.current.url
    const intent = playbackIntentRef.current
    const hasIntent = intent && normalizeUrl(intent.url) === normalizeUrl(url)
    const ready = controller?.ready && normalizeUrl(controller.acceptedUrl) === normalizeUrl(url)
    const nextPlaying = !(hasIntent ? intent.playing : ready && controller.playing)
    playbackIntentRef.current = { url, playing: nextPlaying }
    if (!ready) {
      if (!nextPlaying) controller?.widget.pause()
      return
    }
    if (controller.finished && nextPlaying) {
      controller.finished = false
      controller.widget.seekTo(0)
    }
    if (nextPlaying) {
      controller.widget.play()
    } else {
      controller.widget.pause()
    }
  }, [])

  const seekTo = useCallback((milliseconds) => {
    const controller = controllerRef.current
    if (!controller?.ready || !Number.isFinite(milliseconds)
      || normalizeUrl(controller.acceptedUrl) !== normalizeUrl(trackRef.current.url)) return
    const position = Math.max(0, Math.min(milliseconds, controller.duration || milliseconds))
    controller.positionRevision += 1
    controller.widget.seekTo(position)
    setState((current) => ({ ...current, position }))
  }, [])

  const setVolume = useCallback((value) => {
    if (!Number.isFinite(value)) return
    const nextVolume = Math.max(0, Math.min(100, value))
    volumeRef.current = nextVolume
    setVolumeState(nextVolume)
    const controller = controllerRef.current
    if (controller?.ready
      && normalizeUrl(controller.acceptedUrl) === normalizeUrl(trackRef.current.url)) {
      controller.widget.setVolume(nextVolume)
    }
  }, [])

  return { ...state, togglePlayback, seekTo, volume, setVolume }
}
