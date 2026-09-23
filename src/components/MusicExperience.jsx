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
  const volumeRef = useRef(0.6)
  const [visualizerRoot, setVisualizerRoot] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [error, setError] = useState('')

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
    const gradient = context.createLinearGradient(0, height, 0, height * 0.34)
    gradient.addColorStop(0, 'rgba(185, 145, 255, 0.6)')
    gradient.addColorStop(0.55, 'rgba(147, 107, 235, 0.35)')
    gradient.addColorStop(1, 'rgba(125, 85, 210, 0)')

    context.clearRect(0, 0, width, height)
    context.fillStyle = gradient
    context.shadowColor = 'rgba(156, 109, 255, 0.35)'
    context.shadowBlur = 12

    for (let index = 0; index < count; index += 1) {
      const position = index / (count - 1)
      const bin = Math.min(frequencies.length - 3, Math.round(2 + Math.pow(position, 1.7) * 105))
      const strength = (frequencies[bin] + frequencies[bin + 1] + frequencies[bin + 2]) / (3 * 255)
      const barHeight = Math.max(3, Math.pow(strength, 1.3) * height * 0.72 * volumeRef.current)
      context.fillRect(index * (barWidth + gap), height - barHeight, barWidth, barHeight)
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
      if (!audioContextRef.current && (window.AudioContext || window.webkitAudioContext)) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        const audioContext = new AudioContextClass()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.8
        audioContext.createMediaElementSource(audio).connect(analyser)
        analyser.connect(audioContext.destination)
        audioContextRef.current = audioContext
        analyserRef.current = analyser
      }
      if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume()
      await audio.play()
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
          <span>{isPlaying ? 'NOW PLAYING' : 'SOUND OFF'} / HAZE MODE</span>
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
