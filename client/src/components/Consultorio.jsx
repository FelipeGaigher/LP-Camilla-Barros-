import { useSiteData } from '../context/SiteDataContext'
import Reveal, { RevealGroup, RevealItem } from './Reveal'

export default function Consultorio() {
  const { data } = useSiteData()
  const c = data.consultorio

  return (
    <section id="consultorio" className="section">
      <div className="container">
        <Reveal className="consultorio__head">
          <div>
            <span className="eyebrow">{c.eyebrow}</span>
            <h2 style={{ marginTop: '1.25rem' }}>{c.title}</h2>
          </div>
          <div>
            <p className="lead">{c.text}</p>
            {c.ctaMaps?.href && (
              <a
                className="btn btn--ghost"
                href={c.ctaMaps.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: '1.75rem' }}
              >
                {c.ctaMaps.label}
              </a>
            )}
          </div>
        </Reveal>

        <RevealGroup className="consultorio__gallery" stagger={0.07}>
          {c.gallery?.map((g, i) => (
            <RevealItem as="figure" key={i} y={22}>
              {g.image ? (
                <img src={g.image} alt={g.alt || ''} loading="lazy" />
              ) : (
                <div className="placeholder-box">{g.alt || 'Foto do espaco'}</div>
              )}
            </RevealItem>
          ))}
        </RevealGroup>

        {c.diferenciais?.length > 0 && (
          <RevealGroup className="consultorio__diferenciais">
            {c.diferenciais.map((d, i) => (
              <RevealItem key={i} y={18}>
                <h3>{d.title}</h3>
                <p>{d.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  )
}
