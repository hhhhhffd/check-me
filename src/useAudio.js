import { useEffect, useRef, useState } from 'react'

export const MIN_DB = -60
export const MAX_DB = 0
const START_DB = -45
function dbToGain(db) {
  return db <= MIN_DB ? 0 : 10 ** (db / 20)
}

// Плеер: плейлист, громкость в дБ. Звук идёт через Web Audio: источник → анализатор → gain → выход.
// Громкость стоит в самом конце цепочки, поэтому анализатор видит полный сигнал и
// визуализатор с фоном работают даже при -45 дБ. AudioContext создаётся только после клика:
// без жеста браузер его не запустит.
export function useAudio(track) {
  const audioRef = useRef(null)
  const graphRef = useRef(null)
  const frameRef = useRef(0)
  // Громкость трека 0…1 для фона и визуализатора: читается каждый кадр без перерисовки React.
  const levelRef = useRef(0)
  const controlsRef = useRef({})
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volumeDb, setVolumeDb] = useState(START_DB)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  function applyAudioSettings() {
    const audio = audioRef.current
    const gain = muted ? 0 : dbToGain(volumeDb)
    const graph = graphRef.current
    if (graph) {
      graph.master.gain.value = gain
    } else if (audio) {
      audio.volume = gain
    }
  }

  useEffect(applyAudioSettings, [volumeDb, muted])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.loop = true
    audioRef.current = audio

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => setTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onError = () => setError(audio.src)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('error', onError)
      window.cancelAnimationFrame(frameRef.current)
      graphRef.current?.context.close()
      graphRef.current = null
    }
  }, [])

  // Контент приходит асинхронно: трек подставляем, когда он появился.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio.getAttribute('src') && track) audio.src = track.src
  }, [track])

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
    const master = context.createGain()

    context.createMediaElementSource(audioRef.current).connect(analyser)
    analyser.connect(master)
    master.connect(context.destination)

    audioRef.current.volume = 1
    graphRef.current = { context, analyser, master }
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

  function seek(seconds) {
    audioRef.current.currentTime = seconds
  }

  controlsRef.current = { play, pause: () => audioRef.current.pause() }

  // Системные кнопки и экран блокировки.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist })
    navigator.mediaSession.setActionHandler('play', () => controlsRef.current.play())
    navigator.mediaSession.setActionHandler('pause', () => controlsRef.current.pause())
  }, [track])

  return {
    track,
    playing,
    muted,
    volumeDb,
    time,
    duration,
    error,
    levelRef,
    graphRef,
    play,
    toggle,
    seek,
    setVolumeDb,
    toggleMute: () => setMuted((value) => !value),
  }
}
