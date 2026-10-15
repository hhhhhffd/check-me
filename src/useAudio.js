import { useEffect, useRef, useState } from 'react'

const START_VOLUME = 0.55

// Управляет фоновым треком и пишет его громкость (0…1) в CSS-переменную --level на <html>,
// от которой пульсирует свет за стеклом. AudioContext создаётся только после клика пользователя:
// без жеста браузер его не запустит.
export function useAudio(src) {
  const audioRef = useRef(null)
  const contextRef = useRef(null)
  const analyserRef = useRef(null)
  const frameRef = useRef(0)
  // Та же громкость, что и в --level, но без чтения стилей — её каждый кадр берёт WebGL-фон.
  const levelRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!src) return undefined
    const audio = new Audio(src)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = START_VOLUME
    audioRef.current = audio

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => setTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onError = () => setError('Track failed to load: ' + src)
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
      contextRef.current?.close()
      contextRef.current = null
      analyserRef.current = null
    }
  }, [src])

  useEffect(() => {
    const root = document.documentElement
    if (!playing || !analyserRef.current) {
      root.style.setProperty('--level', '0')
      levelRef.current = 0
      return undefined
    }

    const analyser = analyserRef.current
    const bins = new Uint8Array(analyser.frequencyBinCount)
    let smoothed = 0

    function tick() {
      analyser.getByteFrequencyData(bins)
      // Берём низкие и средние частоты: на них держится бит.
      let sum = 0
      const range = Math.floor(bins.length * 0.25)
      for (let index = 0; index < range; index += 1) sum += bins[index]
      const level = Math.min(1, sum / range / 180)
      smoothed += (level - smoothed) * 0.18
      root.style.setProperty('--level', smoothed.toFixed(3))
      levelRef.current = smoothed
      frameRef.current = window.requestAnimationFrame(tick)
    }

    tick()
    return () => window.cancelAnimationFrame(frameRef.current)
  }, [playing])

  function connectAnalyser() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (contextRef.current || !AudioContextClass) return
    const context = new AudioContextClass()
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.75
    context.createMediaElementSource(audioRef.current).connect(analyser)
    analyser.connect(context.destination)
    contextRef.current = context
    analyserRef.current = analyser
  }

  async function play() {
    const audio = audioRef.current
    if (!audio) return
    setError('')
    try {
      connectAnalyser()
      if (contextRef.current?.state === 'suspended') await contextRef.current.resume()
      await audio.play()
    } catch (playError) {
      console.error('Playback failed:', playError)
      setError(playError.message)
    }
  }

  function toggle() {
    if (audioRef.current?.paused) play()
    else audioRef.current?.pause()
  }

  function seek(seconds) {
    if (audioRef.current) audioRef.current.currentTime = seconds
  }

  function toggleMute() {
    if (!audioRef.current) return
    audioRef.current.muted = !audioRef.current.muted
    setMuted(audioRef.current.muted)
  }

  return { playing, muted, time, duration, error, levelRef, play, toggle, seek, toggleMute }
}
