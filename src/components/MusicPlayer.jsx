import { MuteIcon, PauseIcon, PlayIcon, VolumeIcon } from './Icons'

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
}

function MusicPlayer({ music, audio, ui }) {
  const progress = audio.duration ? (audio.time / audio.duration) * 100 : 0

  return (
    <section className="card player" aria-label={ui.player}>
      <div className={'player-cover' + (audio.playing ? ' is-playing' : '')} aria-hidden="true">
        <i /><i /><i /><i />
      </div>
      <div className="player-main">
        <p className="player-title">{music.title} <span>· {music.artist}</span></p>
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
      </div>
      <div className="player-controls">
        <button type="button" className="player-play" onClick={audio.toggle} aria-label={audio.playing ? ui.pause : ui.play}>
          {audio.playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </button>
        <button type="button" onClick={audio.toggleMute} aria-label={audio.muted ? ui.unmute : ui.mute} aria-pressed={audio.muted}>
          {audio.muted ? <MuteIcon size={20} /> : <VolumeIcon size={20} />}
        </button>
      </div>
    </section>
  )
}

export default MusicPlayer
