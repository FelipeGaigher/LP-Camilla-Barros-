import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { useSiteData } from '../context/SiteDataContext'
import { scrollToAnchor } from './SmoothScroll'

const EASE = [0.33, 1, 0.68, 1]

export default function Hero() {
  const { data } = useSiteData()
  const hero = data.hero
  const ref = useRef(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const mediaY = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const mediaScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])

  const hasMedia = Boolean(
    (hero.media.type === 'video' && hero.media.video) || (hero.media.type === 'image' && hero.media.image)
  )

  const go = (e, href) => { if (scrollToAnchor(href)) e.preventDefault() }

  const words = [hero.title, hero.titleAccent].filter(Boolean)

  return (
    <section id="top" ref={ref} className={`hero ${hasMedia ? 'has-media' : ''}`}>
      <motion.div
        className={`hero__media ${hasMedia ? '' : 'is-empty'}`}
        style={reduce ? undefined : { y: mediaY, scale: mediaScale }}
      >
        {hero.media.type === 'video' && hero.media.video && (
          <video
            src={hero.media.video}
            poster={hero.media.poster || undefined}
            autoPlay
            muted
            loop
            playsInline
            style={{ objectPosition: hero.media.objectPosition }}
          />
        )}
        {hero.media.type === 'image' && hero.media.image && (
          <img
            src={hero.media.image}
            alt={hero.media.alt}
            style={{ objectPosition: hero.media.objectPosition }}
            fetchPriority="high"
          />
        )}
      </motion.div>

      <div className="container hero__inner">
        <div className="hero__content">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
          >
            {hero.eyebrow}
          </motion.span>

          <h1 className="display hero__title">
            {words.map((line, i) => (
              <span key={i} style={{ display: 'block', overflow: 'hidden' }}>
                <motion.span
                  style={{ display: 'block' }}
                  className={i === 1 ? 'italic' : undefined}
                  initial={{ y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.95, ease: EASE, delay: 0.6 + i * 0.09 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            className="lead hero__lead"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.85 }}
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            className="btn-row hero__ctas"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.98 }}
          >
            <a
              className={hasMedia ? 'btn btn--light' : 'btn btn--primary'}
              href={hero.ctaPrimary.href}
              onClick={(e) => go(e, hero.ctaPrimary.href)}
            >
              {hero.ctaPrimary.label}
            </a>
            {hero.ctaSecondary?.label && (
              <a
                className={hasMedia ? 'btn btn--outline-light' : 'btn btn--ghost'}
                href={hero.ctaSecondary.href}
                onClick={(e) => go(e, hero.ctaSecondary.href)}
              >
                {hero.ctaSecondary.label}
              </a>
            )}
          </motion.div>
        </div>
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <span>Role</span>
        <span className="hero__scroll-line" />
      </div>
    </section>
  )
}
