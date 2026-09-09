import { useState } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import Reveal from './Reveal'

function embedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0`
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`
  return null
}

export default function VideoSection() {
  const { data } = useSiteData()
  const v = data.video
  const [playing, setPlaying] = useState(false)

  const embed = embedUrl(v.videoUrl)
  const isFile = v.videoUrl && !embed

  return (
    <section id="video" className="section">
      <div className="container videosec__grid">
        <Reveal>
          <span className="eyebrow">{v.eyebrow}</span>
          <h2 style={{ marginTop: '1.25rem' }}>{v.title}</h2>
          <p className="lead" style={{ marginTop: '1.5rem' }}>{v.text}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="videosec__player">
            {!v.videoUrl && <div className="placeholder-box">Video de apresentacao da Camilla</div>}

            {isFile && (
              <video
                src={v.videoUrl}
                poster={v.poster || undefined}
                controls={playing}
                playsInline
                preload="metadata"
                onPlay={() => setPlaying(true)}
                ref={(el) => { if (el && playing && el.paused) el.play().catch(() => {}) }}
              />
            )}

            {embed && playing && (
              <iframe
                src={embed}
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            )}

            {embed && !playing && v.poster && <img src={v.poster} alt={v.title} />}

            {v.videoUrl && !playing && (
              <button className="videosec__play" onClick={() => setPlaying(true)} aria-label="Reproduzir video">
                <span>
                  <svg width="20" height="22" viewBox="0 0 20 22" fill="var(--accent)" aria-hidden="true">
                    <path d="M19 9.27a2 2 0 0 1 0 3.46L3 21.99a2 2 0 0 1-3-1.73V1.74A2 2 0 0 1 3 .01l16 9.26z" />
                  </svg>
                </span>
              </button>
            )}
          </div>
          {v.caption && <p className="videosec__caption">{v.caption}</p>}
        </Reveal>
      </div>
    </section>
  )
}
