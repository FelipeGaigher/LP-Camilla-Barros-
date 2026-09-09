import { useSiteData } from '../context/SiteDataContext'
import Reveal, { RevealGroup, RevealItem } from './Reveal'
import { scrollToAnchor } from './SmoothScroll'
import EditableText from './editable/EditableText'

export default function Sintomas() {
  const { data } = useSiteData()
  const s = data.sintomas

  const go = (e, href) => { if (scrollToAnchor(href)) e.preventDefault() }

  return (
    <section id="sintomas" className="section">
      <div className="container">
        <Reveal className="section-head">
          <EditableText path="sintomas.eyebrow" className="eyebrow" />
          <EditableText as="h2" path="sintomas.title" />
          <EditableText as="p" path="sintomas.intro" className="lead" multiline />
        </Reveal>

        <RevealGroup className="sintomas__grid" stagger={0.06}>
          {s.items?.map((item, i) => (
            <RevealItem className="sintoma" key={i} y={18}>
              <span className="sintoma__index">{String(i + 1).padStart(2, '0')}</span>
              <EditableText as="h3" path={`sintomas.items.${i}.title`} />
              <EditableText as="p" path={`sintomas.items.${i}.text`} multiline />
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
