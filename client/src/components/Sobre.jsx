import { useSiteData } from '../context/SiteDataContext'
import Reveal from './Reveal'
import { scrollToAnchor } from './SmoothScroll'

export default function Sobre() {
  const { data } = useSiteData()
  const s = data.sobre
  const go = (e, href) => { if (scrollToAnchor(href)) e.preventDefault() }

  return (
    <section id="sobre" className="section section--cream-deep">
      <div className="container sobre__grid">
        <Reveal className="sobre__portrait">
          {s.image ? (
            <img src={s.image} alt={s.alt || s.title} loading="lazy" />
          ) : (
            <div className="placeholder-box">Retrato da Dra. Camilla</div>
          )}
        </Reveal>

        <div>
          <Reveal>
            <span className="eyebrow">{s.eyebrow}</span>
            <h2 style={{ marginTop: '1.25rem' }}>{s.title}</h2>
            {s.lead && <p className="sobre__lead">{s.lead}</p>}
          </Reveal>

          <Reveal className="sobre__text" delay={0.08}>
            {s.paragraphs?.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </Reveal>

          {s.formacao?.length > 0 && (
            <Reveal delay={0.14}>
              <ul className="sobre__formacao">
                {s.formacao.map((f, i) => (
                  <li key={i}>
                    <span>{f.label}</span>
                    <span>{f.detail}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {s.cta?.label && (
            <Reveal className="sobre__cta" delay={0.18}>
              <a className="btn btn--primary" href={s.cta.href} onClick={(e) => go(e, s.cta.href)}>
                {s.cta.label}
              </a>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  )
}
