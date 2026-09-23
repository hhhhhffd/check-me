import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, Volume2 } from 'lucide-react'
import { resolveAssetUrl } from '../utils/assetUrl'

const MINI_BAR_COUNT = 13

export default function MusicExperience({ music }) {
  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const miniBarsRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const frameRef = useRef(0)
  const autoplayAttemptedRef = useRef(false)
  const volumeRef = useRef(0.6)
  const [visualizerRoot, setVisualizerRoot] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [error, setError] = useState('')
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  useEffect(() => {
    setVisualizerRoot(document.getElementById('bio-visualizer-root'))
  }, [])

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
  }, [visualizerRoot])

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
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!analyser || !canvas || !context) return

    const frequencies = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(frequencies)
    const width = window.innerWidth
    const height = window.innerHeight
    const count = Math.max(28, Math.min(72, Math.floor(width / 16)))
    const gap = width < 600 ? 4 : 7
    const barWidth = (width - gap * (count - 1)) / count
    context.clearRect(0, 0, width, height)
    const rows = Math.max(4, Math.ceil(height / 190))
    const rowHeight = height / rows

    for (let row = 0; row < rows; row += 1) {
      const baseline = rowHeight * (row + 0.5)
      context.fillStyle = row % 2 === 0 ? 'rgba(216, 226, 167, 0.42)' : 'rgba(225, 137, 96, 0.34)'
      for (let index = 0; index < count; index += 1) {
        const position = index / (count - 1)
        const bin = Math.min(frequencies.length - 3, Math.round(2 + Math.pow(position, 1.7) * 105 + row * 4))
        const strength = (frequencies[bin] + frequencies[bin + 1] + frequencies[bin + 2]) / (3 * 255)
        const barHeight = Math.max(2, Math.pow(strength, 1.3) * rowHeight * 0.76 * volumeRef.current)
        context.fillRect(index * (barWidth + gap), baseline - barHeight, barWidth, barHeight * 2)
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

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return

    if (!audio.paused) {
      audio.pause()
      return
    }

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

  function handlePlay() {
    setIsPlaying(true)
    window.cancelAnimationFrame(frameRef.current)
    draw()
  }

  function handlePause() {
    setIsPlaying(false)
    window.cancelAnimationFrame(frameRef.current)
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, window.innerWidth, window.innerHeight)
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
      {visualizerRoot && createPortal(
        <canvas ref={canvasRef} className="bio-visualizer" aria-hidden="true" />,
        visualizerRoot,
      )}
      <div className="bio-music-player" aria-label="Музыкальный плеер">
        <audio
          ref={audioRef}
          src={resolveAssetUrl(music.src)}
          preload="none"
          loop
          onPlay={handlePlay}
          onPause={handlePause}
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
          <span>{isPlaying ? 'NOW PLAYING' : autoplayBlocked ? 'TAP TO START' : 'SOUND OFF'} / HAZE MODE</span>
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
        </div>
        <div className="bio-music-levels" ref={miniBarsRef} aria-hidden="true">
          {Array.from({ length: MINI_BAR_COUNT }, (_, index) => <i key={index} />)}
        </div>
        {error && <p className="bio-music-error" role="status">{error}</p>}
      </div>
    </>
  )
}
