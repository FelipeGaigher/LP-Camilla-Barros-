import { motion, useReducedMotion } from 'motion/react'
import { useSiteData } from '../context/SiteDataContext'
import { scrollToAnchor } from './SmoothScroll'
import { WhatsAppIcon } from './Chrome'
import { useEditMode } from '../context/EditModeContext'
import EditableText from './editable/EditableText'
import EditableImage from './editable/EditableImage'

const EASE = [0.33, 1, 0.68, 1]

/** Ícones dos selos que flutuam sobre o retrato. */
const ICONS = {
  check: <path d="M20 6 9 17l-5-5" />,
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  escudo: <path d="M12 3 4 6v6c0 4.4 3.2 8.5 8 9.6 4.8-1.1 8-5.2 8-9.6V6l-8-3z" />,
}

function ChipIcon({ name }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {ICONS[name] || ICONS.check}
    </svg>
  )
}

export default function Hero() {
  const { data } = useSiteData()
  const hero = data.hero
  const cred = data.credenciais
  const reduce = useReducedMotion()
  const { isEditing } = useEditMode()

  const go = (e, href) => {
    if (scrollToAnchor(href)) e.preventDefault()
  }

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
            <a className="btn btn--primary" href={hero.ctaPrimary.href} onClick={(e) => go(e, hero.ctaPrimary.href)}>
              <WhatsAppIcon size={17} />
              <EditableText path="hero.ctaPrimary.label" />
            </a>
            {hero.ctaSecondary?.label && (
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
              <ChipIcon name={chip.icon} />
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
