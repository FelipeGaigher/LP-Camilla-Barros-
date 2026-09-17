import { useSiteData } from '../context/SiteDataContext'
import { useNavigate } from 'react-router-dom'
import Reveal, { RevealGroup, RevealItem } from './Reveal'
import { irPara } from '../lib/navegacao'
import EditableText from './editable/EditableText'
import Icone from './Icone'
import { destinoExiste } from '../lib/secoes'

/** Um desenho por sinal, na ordem dos itens. Fallback para quando a Camilla
 *  acrescenta um sinal pelo painel e nao escolhe icone. */
const PADRAO = ['dente', 'gota', 'sorriso', 'denteLascado', 'lua', 'floco']

export default function Sintomas() {
  const { data } = useSiteData()
  const navigate = useNavigate()
  const s = data.sintomas

  const go = (e, href) => irPara(e, href, navigate)

  return (
    <section id="sintomas" className="section">
      <div className="container">
        <div className="sintomas__layout">
          <Reveal className="section-head">
            <EditableText path="sintomas.eyebrow" className="eyebrow" />
            <EditableText as="h2" path="sintomas.title" />
            <EditableText as="p" path="sintomas.intro" className="lead" multiline />
          </Reveal>

          <RevealGroup className="sintomas__grid" stagger={0.06}>
            {s.items?.map((item, i) => (
              <RevealItem className="sintoma" key={i} y={18}>
                <span className="sintoma__topo">
                  <Icone name={item.icon || PADRAO[i % PADRAO.length]} size={22} />
                  <span className="sintoma__index">{String(i + 1).padStart(2, '0')}</span>
                </span>
                <EditableText as="h3" path={`sintomas.items.${i}.title`} />
                <EditableText as="p" path={`sintomas.items.${i}.text`} multiline />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        <Reveal className="sintomas__foot">
          <p className="muted" style={{ fontSize: 'var(--fs-small)', maxWidth: '46ch' }}>
            Nenhum destes sinais fecha um diagnóstico sozinho. A avaliação presencial é o que define a causa.
          </p>
          {/* Era um arrow-link discreto, do mesmo peso do paragrafo cinza ao
              lado. E o unico CTA entre o hero e o formulario, no ponto em que a
              pessoa acabou de se reconhecer num sintoma: virou botao. */}
          {destinoExiste('#contato', data.visibility) && (
            <a className="btn btn--primary sintomas__cta" href="#contato" onClick={(e) => go(e, '#contato')}>
              Marcar uma avaliação
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </a>
          )}
        </Reveal>
      </div>
    </section>
  )
}
