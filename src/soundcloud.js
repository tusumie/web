const API_URL = 'https://w.soundcloud.com/player/api.js'
const SCRIPT_ID = 'tusumie-soundcloud-widget-api'

export const widgetOptions = Object.freeze({
  auto_play: false,
  visual: false,
  show_artwork: false,
  show_user: false,
  show_comments: false,
  hide_related: true,
  show_reposts: false,
  sharing: false,
  color: '#323232',
})

export function getWidgetUrl(trackUrl) {
  const query = new URLSearchParams({ url: trackUrl, ...widgetOptions })
  return `https://w.soundcloud.com/player/?${query}`
}

let apiPromise

export function loadSoundCloudApi() {
  if (window.SC?.Widget) return Promise.resolve(window.SC)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID)
    const created = !script
    if (created) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = API_URL
      script.async = true
    }

    const cleanUp = () => {
      window.clearTimeout(timeout)
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }
    const fail = () => {
      cleanUp()
      script.remove()
      reject(new Error('SoundCloud could not connect. Open the track on SoundCloud to listen.'))
    }
    const onLoad = () => {
      if (!window.SC?.Widget) return fail()
      cleanUp()
      resolve(window.SC)
    }
    const onError = () => fail()
    const timeout = window.setTimeout(fail, 12000)

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
    if (created) document.head.appendChild(script)
  }).catch((error) => {
    apiPromise = undefined
    throw error
  })

  return apiPromise
}
