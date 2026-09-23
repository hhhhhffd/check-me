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
    return () => {
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
    audio.play().then(async () => {
      connectAnalyser()
      if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume()
    }).catch((playError) => {
      if (playError.name === 'NotAllowedError') setAutoplayBlocked(true)
      else setError('Не удалось включить музыку')
    })
  }, [music?.src])

  useEffect(() => {
    if (!autoplayBlocked) return undefined

    function startOnInteraction(event) {
      if (event.target instanceof Element && event.target.closest('.bio-music-player')) return
      const audio = audioRef.current
      if (!audio || !audio.paused) return
      connectAnalyser()
      const resume = audioContextRef.current?.state === 'suspended'
        ? audioContextRef.current.resume()
        : Promise.resolve()
      Promise.all([audio.play(), resume]).then(() => {
        setAutoplayBlocked(false)
      }).catch((playError) => {
        if (playError.name !== 'NotAllowedError') setError('Не удалось включить музыку')
      })
    }

    document.addEventListener('pointerdown', startOnInteraction)
    document.addEventListener('keydown', startOnInteraction)
    return () => {
      document.removeEventListener('pointerdown', startOnInteraction)
      document.removeEventListener('keydown', startOnInteraction)
    }
  }, [autoplayBlocked])

  if (!music?.src) return null

  function draw() {
    const analyser = analyserRef.current
    if (!analyser) return

    const frequencies = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(frequencies)

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
      if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume()
      await audio.play()
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
    for (const bar of miniBarsRef.current?.children || []) bar.style.height = '3px'
  }

  function handleVolumeChange(event) {
    const nextVolume = Number(event.target.value)
    setVolume(nextVolume)
    volumeRef.current = nextVolume
    if (audioRef.current) audioRef.current.volume = nextVolume
  }

  return (
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
  )
})

export default MusicExperience
