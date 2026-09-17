import { motion, useReducedMotion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { podeAnimar } from '../lib/motionEnv'
import { useSiteData } from '../context/SiteDataContext'
import { irPara } from '../lib/navegacao'
import { WhatsAppIcon, waLink } from './Chrome'
import { destinoExiste, destinoCta } from '../lib/secoes'
import { useEditMode } from '../context/EditModeContext'
import EditableText from './editable/EditableText'
import EditableImage from './editable/EditableImage'
import Icone from './Icone'

const EASE = [0.33, 1, 0.68, 1]

export default function Hero() {
  const { data } = useSiteData()
  const navigate = useNavigate()
  const hero = data.hero
  const cred = data.credenciais
  // Sem navegador (prerender de build) o tratamento e o mesmo de quem pediu
  // menos movimento: renderiza ja no estado final, sem passar por opacity: 0.
  const reduce = useReducedMotion() || !podeAnimar
  // Com a secao Contato desligada o CTA cairia num link morto. Ver lib/secoes.js.
  const ctaPrimario = destinoCta(
    hero.ctaPrimary.href,
    data.visibility,
    waLink(data.contato?.whatsapp?.number, data.contato?.whatsapp?.message),
  )
  const { isEditing } = useEditMode()

  // irPara resolve ancora, rota e link externo. Sem ele, um href de rota faria
  // navegacao cheia, recarregando o bundle e perdendo o estado da SPA.
  const go = (e, href) => irPara(e, href, navigate)

  const linhas = [hero.title, hero.titleAccent].filter(Boolean)
  const anim = (delay) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.75, ease: EASE, delay },
        }

  return (
    <section id="top" className="hero">
      <div className="container hero__grid">
        <div>
          <motion.span {...anim(0.35)}>
            <EditableText path="hero.eyebrow" className="eyebrow" />
          </motion.span>

          {/* Em edicao o titulo vira texto simples: a revelacao por linha usa
              overflow hidden, que atrapalha o cursor dentro do campo. */}
          {isEditing ? (
            <h1 className="hero__title">
              <EditableText as="span" path="hero.title" style={{ display: 'block' }} />
              <EditableText as="span" path="hero.titleAccent" className="italic" style={{ display: 'block' }} />
            </h1>
          ) : (
            <h1 className="hero__title">
              {linhas.map((linha, i) => (
                <span key={i} style={{ display: 'block', overflow: 'hidden' }}>
                  <motion.span
                    style={{ display: 'block' }}
                    className={i === 1 ? 'italic' : undefined}
                    data-cms-path={i === 0 ? 'hero.title' : 'hero.titleAccent'}
                    initial={reduce ? undefined : { y: '105%' }}
                    animate={reduce ? undefined : { y: 0 }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.45 + i * 0.08 }}
                  >
                    {linha}
                  </motion.span>
                </span>
              ))}
            </h1>
          )}

          <motion.div {...anim(0.7)}>
            <EditableText as="p" path="hero.subtitle" className="lead hero__lead" multiline />
          </motion.div>

          <motion.div className="btn-row hero__ctas" {...anim(0.82)}>
            {/* O icone so aparece quando o botao leva mesmo pro WhatsApp. Num
                CTA que rola pro formulario ele mentiria sobre o destino. */}
            <a className="btn btn--primary" href={ctaPrimario} onClick={(e) => go(e, ctaPrimario)}>
              {ctaPrimario?.includes('wa.me') && <WhatsAppIcon size={17} />}
              <EditableText path="hero.ctaPrimary.label" />
            </a>
            {/* O secundario so leva a outra secao da propria pagina. Com ela
                desligada nao ha fallback que faca sentido: o botao sai. */}
            {hero.ctaSecondary?.label && destinoExiste(hero.ctaSecondary.href, data.visibility) && (
              <a className="btn btn--ghost" href={hero.ctaSecondary.href} onClick={(e) => go(e, hero.ctaSecondary.href)}>
                <EditableText path="hero.ctaSecondary.label" />
              </a>
            )}
          </motion.div>
        </div>

        <motion.div
          className="hero__stage"
          initial={reduce ? undefined : { opacity: 0, scale: 0.96 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 0.25 }}
        >
          <div className="hero__blob" aria-hidden="true" />

          <div className="hero__portrait">
            {hero.media.type === 'video' && hero.media.video ? (
              <video
                src={hero.media.video}
                poster={hero.media.poster || undefined}
                autoPlay
                muted
                loop
                playsInline
                style={{ objectPosition: hero.media.objectPosition }}
              />
            ) : (
              <EditableImage
                path="hero.media.image"
                alt={hero.media.alt}
                placeholder="Foto da Camilla"
                style={{ objectPosition: hero.media.objectPosition }}
                fetchPriority="high"
              />
            )}
          </div>

          {hero.chips?.map((chip, i) => (
            <span className="hero__chip" key={i}>
              <Icone name={chip.icon} />
              <EditableText path={`hero.chips.${i}.label`} />
            </span>
          ))}

          <div className="hero__card">
            <EditableText as="strong" path="credenciais.name" />
            <span>
              <EditableText path="credenciais.role" />
              <br />
              <EditableText path="credenciais.cro" />
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
