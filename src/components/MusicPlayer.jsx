import { useEffect, useRef } from 'react'
import { MAX_DB, MIN_DB } from '../useAudio'
import { MuteIcon, PauseIcon, PlayIcon, VolumeIcon } from './Icons'

const BAR_COUNT = 40
const BAR_GAP = 4
const ACCENT = '#b900ff'
const ACCENT_SOFT = '#d9a2ff'

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
}

function formatDb(db) {
  return db <= MIN_DB ? '-∞ dB' : db + ' dB'
}

// Зеркальные столбики от нижней середины, как в визуализаторе исходного плеера.
// Цикл живёт, пока играет музыка и пока столбики не осядут.
function useVisualizer(canvasRef, audio) {
  const { playing, graphRef } = audio

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const heights = new Array(BAR_COUNT).fill(0)
    let frame = 0

    function draw() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = canvas.parentElement.offsetWidth
      const height = canvas.parentElement.offsetHeight
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const analyser = graphRef.current?.analyser
      const bins = new Uint8Array(analyser ? analyser.frequencyBinCount : 0)
      if (analyser && playing) analyser.getByteFrequencyData(bins)

      const barWidth = Math.max(1, width / (BAR_COUNT * 2) - BAR_GAP)
      const baseY = height - barWidth / 2
      const centerX = width / 2
      let settled = true

      ctx.lineCap = 'round'
      ctx.lineWidth = barWidth
      ctx.shadowBlur = 10
      ctx.shadowColor = ACCENT_SOFT
      for (let bar = 0; bar < BAR_COUNT; bar += 1) {
        const bin = Math.floor((bar / BAR_COUNT) * bins.length * 0.6)
        const target = ((bins[bin] || 0) / 255) * height * 0.7
        heights[bar] += target > heights[bar] ? (target - heights[bar]) * 0.25 : (target - heights[bar]) * 0.15
        const barHeight = Math.max(2, heights[bar])
        if (barHeight > 2.5) settled = false

        const gradient = ctx.createLinearGradient(0, baseY, 0, baseY - barHeight)
        gradient.addColorStop(0, ACCENT)
        gradient.addColorStop(1, ACCENT_SOFT)
        ctx.strokeStyle = gradient
        const offset = bar * (barWidth + BAR_GAP) + (barWidth + BAR_GAP) / 2
        ctx.beginPath()
        ctx.moveTo(centerX + offset, baseY)
        ctx.lineTo(centerX + offset, baseY - barHeight)
        ctx.moveTo(centerX - offset, baseY)
        ctx.lineTo(centerX - offset, baseY - barHeight)
        ctx.stroke()
      }

      if (playing || !settled) frame = window.requestAnimationFrame(draw)
    }

    draw()
    return () => window.cancelAnimationFrame(frame)
  }, [canvasRef, graphRef, playing])
}

function MusicPlayer({ audio, ui }) {
  const canvasRef = useRef(null)
  const { track } = audio
  const progress = audio.duration ? (audio.time / audio.duration) * 100 : 0
  const volumeProgress = ((audio.muted ? MIN_DB : audio.volumeDb) - MIN_DB) / (MAX_DB - MIN_DB) * 100

  useVisualizer(canvasRef, audio)

  // Пробел и M. Пока фокус на кнопке или поле ввода, клавиши остаются за ними.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target.closest('input, textarea, select, button, a, dialog')) return
      if (event.code === 'Space') audio.toggle()
      else if (event.code === 'KeyM') audio.toggleMute()
      else return
      event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <section className="card player" aria-label={ui.player}>
      <canvas className="player-visualizer" ref={canvasRef} aria-hidden="true" />

      <div className="player-top">
        <div className={'player-cover' + (audio.playing ? ' is-playing' : '')} aria-hidden="true">
          <i /><i /><i /><i />
        </div>
        <div className="player-meta">
          <p className="player-title">{track.title}</p>
          <p className="player-artist">{track.artist}</p>
        </div>
      </div>

      <div className="player-progress">
        <span>{formatTime(audio.time)}</span>
        <input
          type="range"
          min="0"
          max={audio.duration || 0}
          step="0.1"
          value={audio.time}
          onChange={(event) => audio.seek(Number(event.target.value))}
          style={{ '--progress': progress + '%' }}
          aria-label={ui.seek}
        />
        <span>{formatTime(audio.duration)}</span>
      </div>
      {audio.error && <p className="player-error">{ui.playbackError}</p>}

      <div className="player-bar">
        <div className="player-volume">
          <button type="button" className="player-icon" onClick={audio.toggleMute} aria-label={audio.muted ? ui.unmute : ui.mute} aria-pressed={audio.muted}>
            {audio.muted ? <MuteIcon size={19} /> : <VolumeIcon size={19} />}
          </button>
          <input
            type="range"
            min={MIN_DB}
            max={MAX_DB}
            step="1"
            value={audio.volumeDb}
            onChange={(event) => audio.setVolumeDb(Number(event.target.value))}
            style={{ '--progress': volumeProgress + '%' }}
            aria-label={ui.volume}
            aria-valuetext={formatDb(audio.volumeDb)}
          />
          <span className="player-db">{formatDb(audio.volumeDb)}</span>
        </div>
        <div className="player-transport">
          <button type="button" className="player-play" onClick={audio.toggle} aria-label={audio.playing ? ui.pause : ui.play}>
            {audio.playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </button>
        </div>
      </div>

    </section>
  )
}

export default MusicPlayer
