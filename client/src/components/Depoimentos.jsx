import { useSiteData } from '../context/SiteDataContext'
import Reveal, { RevealGroup, RevealItem } from './Reveal'

/**
 * COMPLIANCE: os depoimentos aqui devem falar da EXPERIENCIA de atendimento
 * (acolhimento, pontualidade, clareza), nunca de resultado clinico obtido.
 * O Art. 44 do Codigo de Etica Odontologico veda identificacao de paciente
 * para autopromocao e qualquer garantia de resultado.
 */
export default function Depoimentos() {
  const { data } = useSiteData()
  const d = data.depoimentos

  if (!d.items?.length) return null

  return (
    <section id="depoimentos" className="section section--dark">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">{d.eyebrow}</span>
          <h2>{d.title}</h2>
          {d.intro && <p className="lead">{d.intro}</p>}
        </Reveal>

        <RevealGroup className="depo__grid" stagger={0.09}>
          {d.items.map((item, i) => (
            <RevealItem as="article" className="depo__card" key={i}>
              <p className="depo__quote">&ldquo;{item.quote}&rdquo;</p>
              <div className="depo__who">
                <strong>{item.name}</strong>
                <span>{item.context}</span>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="depo__foot">
          <span>Relatos publicados com autorizacao dos pacientes.</span>
          {d.googleUrl && (
            <a className="arrow-link" style={{ color: 'inherit' }} href={d.googleUrl} target="_blank" rel="noopener noreferrer">
              Ver avaliacoes no Google
            </a>
          )}
        </Reveal>
      </div>
    </section>
  )
}
