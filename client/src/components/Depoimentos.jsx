import { useSiteData } from '../context/SiteDataContext'
import Reveal, { RevealGroup, RevealItem } from './Reveal'
import EditableText from './editable/EditableText'

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
          <EditableText path="depoimentos.eyebrow" className="eyebrow" />
          <EditableText as="h2" path="depoimentos.title" />
          <EditableText as="p" path="depoimentos.intro" className="lead" multiline />
        </Reveal>

        <RevealGroup className="depo__grid" stagger={0.09}>
          {d.items.map((item, i) => (
            <RevealItem as="article" className="depo__card" key={i}>
              <EditableText as="p" className="depo__quote" path={`depoimentos.items.${i}.quote`} multiline />
              <div className="depo__who">
                <EditableText as="strong" path={`depoimentos.items.${i}.name`} />
                <EditableText path={`depoimentos.items.${i}.context`} />
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="depo__foot">
          <span>Relatos publicados com autorização dos pacientes.</span>
          {d.googleUrl && (
            <a className="arrow-link" style={{ color: 'inherit' }} href={d.googleUrl} target="_blank" rel="noopener noreferrer">
              Ver avaliações no Google
            </a>
          )}
        </Reveal>
      </div>
    </section>
  )
}
