import { useState } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import Reveal from './Reveal'
import EditableText from './editable/EditableText'
import { embedUrl } from '../lib/mediaUrl'

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
          <EditableText path="video.eyebrow" className="eyebrow" />
          <EditableText as="h2" path="video.title" style={{ marginTop: '1.25rem' }} />
          <EditableText as="p" path="video.text" className="lead" style={{ marginTop: '1.5rem' }} multiline />
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
          <EditableText as="p" path="video.caption" className="videosec__caption" />
        </Reveal>
      </div>
    </section>
  )
}
