import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Pause, Play, Volume2 } from 'lucide-react'
import { resolveAssetUrl } from '../utils/assetUrl'

const MINI_BAR_COUNT = 13

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00'
  const minutes = Math.floor(seconds / 60)
  return String(minutes).padStart(2, '0') + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
}

const MusicExperience = forwardRef(function MusicExperience({ music }, ref) {
  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const miniBarsRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const frameRef = useRef(0)
  const autoplayAttemptedRef = useRef(false)
  const volumeRef = useRef(0.6)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [error, setError] = useState('')
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)

  useImperativeHandle(ref, () => ({
    play,
    pause: () => audioRef.current?.pause(),
    restart: () => {
      if (audioRef.current) audioRef.current.currentTime = 0
      play()
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined

    function resizeCanvas() {
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * scale)
      canvas.height = Math.round(window.innerHeight * scale)
      context.setTransform(scale, 0, 0, scale, 0, 0)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.cancelAnimationFrame(frameRef.current)
      audioRef.current?.pause()
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (!music?.src || autoplayAttemptedRef.current) return
    autoplayAttemptedRef.current = true
    const audio = audioRef.current
    audio.volume = volumeRef.current
    audio.play().catch((playError) => {
      if (playError.name === 'NotAllowedError') setAutoplayBlocked(true)
      else setError('Не удалось включить музыку')
    })
  }, [music?.src])

  useEffect(() => {
    if (!isPlaying || analyserRef.current) return undefined

    function startVisualizer() {
      connectAnalyser()
      audioContextRef.current?.resume().catch((resumeError) => {
        setError('Не удалось включить визуализацию музыки')
        console.warn('AudioContext resume failed:', resumeError)
      })
    }

    document.addEventListener('pointerdown', startVisualizer, { once: true })
    return () => {
      document.removeEventListener('pointerdown', startVisualizer)
    }
  }, [isPlaying])

  if (!music?.src) return null

  function draw() {
    const analyser = analyserRef.current
    if (!analyser) return

    const frequencies = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(frequencies)
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (canvas && context) {
      const width = window.innerWidth
      const height = window.innerHeight
      const count = Math.max(32, Math.min(90, Math.floor(width / 15)))
      const gap = width < 600 ? 4 : 7
      const barWidth = (width - gap * (count - 1)) / count
      context.clearRect(0, 0, width, height)
      for (let row = 0; row < 3; row += 1) {
        const baseline = height * (0.18 + row * 0.32)
        context.fillStyle = row === 1 ? 'rgba(189, 157, 235, .3)' : 'rgba(225, 185, 146, .24)'
        for (let index = 0; index < count; index += 1) {
          const position = index / (count - 1)
          const bin = Math.min(frequencies.length - 1, Math.round(3 + position * 115 + row * 5))
          const strength = frequencies[bin] / 255
          const barHeight = Math.max(2, Math.pow(strength, 1.2) * 95 * volumeRef.current)
          context.fillRect(index * (barWidth + gap), baseline - barHeight, barWidth, barHeight * 2)
        }
      }
    }

    const miniBars = miniBarsRef.current?.children
    if (miniBars) {
      for (let index = 0; index < miniBars.length; index += 1) {
        const bin = 3 + index * 6
        const strength = frequencies[bin] / 255
        miniBars[index].style.height = `${Math.max(3, Math.pow(strength, 1.15) * 28 * volumeRef.current)}px`
      }
    }

    frameRef.current = window.requestAnimationFrame(draw)
  }

  function connectAnalyser() {
    const audio = audioRef.current
    if (!audio || audioContextRef.current || !(window.AudioContext || window.webkitAudioContext)) return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const audioContext = new AudioContextClass()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.8
    audioContext.createMediaElementSource(audio).connect(analyser)
    analyser.connect(audioContext.destination)
    audioContextRef.current = audioContext
    analyserRef.current = analyser
    if (!audio.paused) draw()
  }

  async function play() {
    const audio = audioRef.current
    if (!audio || !audio.paused) return

    setError('')
    try {
      audio.volume = volumeRef.current
      connectAnalyser()
      const playback = audio.play()
      const resume = audioContextRef.current?.state === 'suspended'
        ? audioContextRef.current.resume()
        : Promise.resolve()
      await Promise.all([playback, resume])
      setAutoplayBlocked(false)
    } catch {
      setError('Не удалось включить музыку')
    }
  }

  function togglePlayback() {
    if (audioRef.current?.paused) play()
    else audioRef.current?.pause()
  }

  function handlePlay() {
    setIsPlaying(true)
    window.cancelAnimationFrame(frameRef.current)
    draw()
  }

  function handlePause() {
    setIsPlaying(false)
    window.cancelAnimationFrame(frameRef.current)
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (const bar of miniBarsRef.current?.children || []) bar.style.height = '3px'
  }

  function handleVolumeChange(event) {
    const nextVolume = Number(event.target.value)
    setVolume(nextVolume)
    volumeRef.current = nextVolume
    if (audioRef.current) audioRef.current.volume = nextVolume
  }

  return (
    <>
      <canvas ref={canvasRef} className="bio-visualizer" aria-hidden="true" />
      {autoplayBlocked && (
        <div className="bio-entry-overlay" role="dialog" aria-modal="true" aria-label="Вход со звуком">
          <div className="bio-entry-card">
            <span className="bio-entry-symbol" aria-hidden="true">S.</span>
            <p className="bio-entry-label">PERSONAL SPACE / AUDIO ON</p>
            <h2>Нажми, чтобы войти<span>.</span></h2>
            <p>Музыка и визуализация запустятся после клика.</p>
            <button type="button" autoFocus onClick={play}>Войти со звуком <Play size={16} fill="currentColor" /></button>
            <button type="button" className="bio-entry-skip" onClick={() => setAutoplayBlocked(false)}>Продолжить без звука</button>
          </div>
        </div>
      )}
      <div className="bio-music-player" aria-label="Музыкальный плеер">
        <audio
          ref={audioRef}
          src={resolveAssetUrl(music.src)}
          preload="metadata"
          loop
          onPlay={handlePlay}
          onPause={handlePause}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
          onError={() => setError('Не удалось загрузить трек')}
        />
        <button
          type="button"
          className="bio-music-toggle"
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Приостановить музыку' : 'Включить музыку'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <div className="bio-music-info">
          <span>{isPlaying ? '♫' : autoplayBlocked ? '▶' : 'Ⅱ'} {isPlaying ? 'PLAYING' : 'PAUSED'}</span>
          <strong>{music.title}</strong>
          <div className="bio-music-volume">
            <Volume2 size={14} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              aria-label="Громкость музыки"
            />
          </div>
          <time>{formatTime(position)} / {formatTime(duration)}</time>
        </div>
        <div className="bio-music-levels" ref={miniBarsRef} aria-hidden="true">
          {Array.from({ length: MINI_BAR_COUNT }, (_, index) => <i key={index} />)}
        </div>
        {error && <p className="bio-music-error" role="status">{error}</p>}
      </div>
    </>
  )
})

export default MusicExperience
