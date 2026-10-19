import { useEffect, useRef, useState } from 'react'

export const MIN_DB = -60
export const MAX_DB = 0
const START_DB = -45
export const SPEEDS = [1, 1.25, 1.5, 0.85]
export const SLEEP_STEPS = [0, 15, 30, 60]
const REVERB_WET = 0.6
const FAVORITES_KEY = 'player-favorites'

function dbToGain(db) {
  return db <= MIN_DB ? 0 : 10 ** (db / 20)
}

function createReverbImpulse(context) {
  const length = Math.floor(context.sampleRate * 2.5)
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channelIndex = 0; channelIndex < 2; channelIndex += 1) {
    const channel = impulse.getChannelData(channelIndex)
    for (let sample = 0; sample < length; sample += 1) {
      channel[sample] = (Math.random() * 2 - 1) * (1 - sample / length) ** 2
    }
  }
  return impulse
}

function readFavorites() {
  try {
    return JSON.parse(window.localStorage.getItem(FAVORITES_KEY)) || []
  } catch (error) {
    console.warn('Не удалось прочитать избранное из localStorage:', error)
    return []
  }
}

// Плеер: плейлист, громкость в дБ, shuffle/repeat, скорость, реверб, таймер сна и избранное.
// Звук идёт через Web Audio: источник → анализатор → (сухой + реверб) → общий gain → выход.
// Громкость стоит в самом конце цепочки, поэтому анализатор видит полный сигнал и
// визуализатор с фоном работают даже при -45 дБ. AudioContext создаётся только после клика:
// без жеста браузер его не запустит.
export function useAudio(tracks) {
  const audioRef = useRef(null)
  const graphRef = useRef(null)
  const frameRef = useRef(0)
  // Громкость трека 0…1 для фона и визуализатора: читается каждый кадр без перерисовки React.
  const levelRef = useRef(0)
  const controlsRef = useRef({})
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volumeDb, setVolumeDb] = useState(START_DB)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [reverb, setReverb] = useState(false)
  const [sleepMinutes, setSleepMinutes] = useState(0)
  const [favorites, setFavorites] = useState(readFavorites)

  const track = tracks[index]

  function applyAudioSettings() {
    const audio = audioRef.current
    const gain = muted ? 0 : dbToGain(volumeDb)
    const graph = graphRef.current
    if (graph) {
      graph.master.gain.value = gain
      graph.wet.gain.value = reverb ? REVERB_WET : 0
    } else if (audio) {
      audio.volume = gain
    }
  }

  useEffect(applyAudioSettings, [volumeDb, muted, reverb])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => setTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    // При включённом repeat у элемента стоит loop, и ended не приходит.
    const onEnded = () => controlsRef.current.next()
    const onError = () => setError(audio.src)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      window.cancelAnimationFrame(frameRef.current)
      graphRef.current?.context.close()
      graphRef.current = null
    }
  }, [])

  // Контент приходит асинхронно: первый трек подставляем, когда плейлист появился.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio.getAttribute('src') && tracks[0]) audio.src = tracks[0].src
  }, [tracks])

  useEffect(() => {
    audioRef.current.defaultPlaybackRate = SPEEDS[speedIndex]
    audioRef.current.playbackRate = SPEEDS[speedIndex]
  }, [speedIndex])

  useEffect(() => {
    audioRef.current.loop = repeat
  }, [repeat])

  useEffect(() => {
    if (!sleepMinutes) return undefined
    const timer = window.setTimeout(() => {
      audioRef.current.pause()
      setSleepMinutes(0)
    }, sleepMinutes * 60000)
    return () => window.clearTimeout(timer)
  }, [sleepMinutes])

  useEffect(() => {
    const root = document.documentElement
    const graph = graphRef.current
    if (!playing || !graph) {
      root.style.setProperty('--level', '0')
      levelRef.current = 0
      return undefined
    }

    const bins = new Uint8Array(graph.analyser.frequencyBinCount)
    let smoothed = 0

    function tick() {
      graph.analyser.getByteFrequencyData(bins)
      // Берём низкие и средние частоты: на них держится бит.
      let sum = 0
      const range = Math.floor(bins.length * 0.25)
      for (let bin = 0; bin < range; bin += 1) sum += bins[bin]
      const level = Math.min(1, sum / range / 180)
      smoothed += (level - smoothed) * 0.18
      root.style.setProperty('--level', smoothed.toFixed(3))
      levelRef.current = smoothed
      frameRef.current = window.requestAnimationFrame(tick)
    }

    tick()
    return () => window.cancelAnimationFrame(frameRef.current)
  }, [playing])

  function connectGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (graphRef.current || !AudioContextClass) return
    const context = new AudioContextClass()
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.75
    const convolver = context.createConvolver()
    convolver.buffer = createReverbImpulse(context)
    const wet = context.createGain()
    const master = context.createGain()

    context.createMediaElementSource(audioRef.current).connect(analyser)
    analyser.connect(master)
    analyser.connect(convolver)
    convolver.connect(wet)
    wet.connect(master)
    master.connect(context.destination)

    audioRef.current.volume = 1
    graphRef.current = { context, analyser, wet, master }
    applyAudioSettings()
  }

  async function play() {
    const audio = audioRef.current
    if (!audio || !track) return
    setError('')
    try {
      connectGraph()
      if (graphRef.current?.context.state === 'suspended') await graphRef.current.context.resume()
      await audio.play()
    } catch (playError) {
      console.error('Playback failed:', playError)
      setError(playError.message)
    }
  }

  function toggle() {
    if (audioRef.current.paused) play()
    else audioRef.current.pause()
  }

  function select(nextIndex) {
    const audio = audioRef.current
    if (nextIndex === index) {
      audio.currentTime = 0
    } else {
      audio.src = tracks[nextIndex].src
      setIndex(nextIndex)
      setTime(0)
      setDuration(0)
    }
    return play()
  }

  function next() {
    if (tracks.length < 2) {
      audioRef.current.currentTime = 0
      play()
      return
    }
    if (!shuffle) {
      select((index + 1) % tracks.length)
      return
    }
    let random
    do random = Math.floor(Math.random() * tracks.length)
    while (random === index)
    select(random)
  }

  function previous() {
    // Как в большинстве плееров: в начале трека — предыдущий, дальше — перемотка в начало.
    if (audioRef.current.currentTime > 3 || tracks.length < 2) {
      audioRef.current.currentTime = 0
      return
    }
    select((index - 1 + tracks.length) % tracks.length)
  }

  function seek(seconds) {
    audioRef.current.currentTime = seconds
  }

  function toggleFavorite(src) {
    const nextFavorites = favorites.includes(src) ? favorites.filter((item) => item !== src) : [...favorites, src]
    setFavorites(nextFavorites)
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites))
    } catch (storageError) {
      console.warn('Не удалось сохранить избранное в localStorage:', storageError)
    }
  }

  controlsRef.current = { next, previous, toggle, play, pause: () => audioRef.current.pause() }

  // Системные кнопки и экран блокировки.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist })
    navigator.mediaSession.setActionHandler('play', () => controlsRef.current.play())
    navigator.mediaSession.setActionHandler('pause', () => controlsRef.current.pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => controlsRef.current.previous())
    navigator.mediaSession.setActionHandler('nexttrack', () => controlsRef.current.next())
  }, [track])

  return {
    tracks,
    index,
    track,
    playing,
    muted,
    volumeDb,
    time,
    duration,
    error,
    shuffle,
    repeat,
    speed: SPEEDS[speedIndex],
    reverb,
    sleepMinutes,
    favorites,
    levelRef,
    graphRef,
    play,
    toggle,
    next,
    previous,
    select,
    seek,
    toggleFavorite,
    setVolumeDb,
    toggleMute: () => setMuted((value) => !value),
    toggleShuffle: () => setShuffle((value) => !value),
    toggleRepeat: () => setRepeat((value) => !value),
    cycleSpeed: () => setSpeedIndex((value) => (value + 1) % SPEEDS.length),
    toggleReverb: () => setReverb((value) => !value),
    cycleSleep: () => setSleepMinutes((value) => SLEEP_STEPS[(SLEEP_STEPS.indexOf(value) + 1) % SLEEP_STEPS.length]),
  }
}
