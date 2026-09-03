import { useSiteData } from '../context/SiteDataContext'
import Reveal, { RevealGroup, RevealItem } from './Reveal'
import { scrollToAnchor } from './SmoothScroll'

export default function Sintomas() {
  const { data } = useSiteData()
  const s = data.sintomas

  const go = (e, href) => { if (scrollToAnchor(href)) e.preventDefault() }

  return (
    <section id="sintomas" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">{s.eyebrow}</span>
          <h2>{s.title}</h2>
          {s.intro && <p className="lead">{s.intro}</p>}
        </Reveal>

        <RevealGroup className="sintomas__grid" stagger={0.06}>
          {s.items?.map((item, i) => (
            <RevealItem className="sintoma" key={i} y={18}>
              <span className="sintoma__index">{String(i + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="sintomas__foot">
          <p className="muted" style={{ fontSize: 'var(--fs-small)', maxWidth: '46ch' }}>
            Nenhum destes sinais fecha um diagnostico sozinho. A avaliacao presencial e o que define a causa.
          </p>
          <a className="arrow-link" href="#contato" onClick={(e) => go(e, '#contato')}>
            Marcar uma avaliacao
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
        </Reveal>
      </div>
    </section>
  )
}
