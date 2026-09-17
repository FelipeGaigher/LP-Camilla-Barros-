import { useSiteData } from '../context/SiteDataContext'
import { useNavigate } from 'react-router-dom'
import Reveal from './Reveal'
import { irPara } from '../lib/navegacao'
import EditableText from './editable/EditableText'
import { destinoExiste } from '../lib/secoes'
import EditableImage from './editable/EditableImage'

export default function Sobre() {
  const { data } = useSiteData()
  const navigate = useNavigate()
  const s = data.sobre
  const go = (e, href) => irPara(e, href, navigate)

  return (
    <section id="sobre" className="section section--surface">
      <div className="container sobre__grid">
        <Reveal className="sobre__portrait">
          <EditableImage path="sobre.image" alt={s.alt || s.title} placeholder="Retrato da Dra. Camilla" loading="lazy" />
        </Reveal>

        <div>
          <Reveal>
            <EditableText path="sobre.eyebrow" className="eyebrow" />
            <EditableText as="h2" path="sobre.title" style={{ marginTop: '1.25rem' }} />
            <EditableText as="p" path="sobre.lead" className="sobre__lead" multiline />
          </Reveal>

          <Reveal className="sobre__text" delay={0.08}>
            {s.paragraphs?.map((p, i) => (
              <EditableText as="p" key={i} path={`sobre.paragraphs.${i}`} multiline />
            ))}
          </Reveal>

          {s.formacao?.length > 0 && (
            <Reveal delay={0.14}>
              <ul className="sobre__formacao">
                {s.formacao.map((f, i) => (
                  <li key={i}>
                    <EditableText path={`sobre.formacao.${i}.label`} />
                    <EditableText path={`sobre.formacao.${i}.detail`} />
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {s.cta?.label && destinoExiste(s.cta.href, data.visibility) && (
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
