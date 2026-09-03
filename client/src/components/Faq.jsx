import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useSiteData } from '../context/SiteDataContext'
import Reveal from './Reveal'

export default function Faq() {
  const { data } = useSiteData()
  const f = data.faq
  const [open, setOpen] = useState(0)

  if (!f.items?.length) return null

  return (
    <section id="faq" className="section section--cream-deep">
      <div className="container faq__grid">
        <Reveal>
          <span className="eyebrow">{f.eyebrow}</span>
          <h2 style={{ marginTop: '1.25rem' }}>{f.title}</h2>
        </Reveal>

        <Reveal className="faq__list" delay={0.08}>
          {f.items.map((item, i) => {
            const isOpen = open === i
            return (
              <div className={`faq__item ${isOpen ? 'is-open' : ''}`} key={i}>
                <button
                  className="faq__q"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                >
                  {item.q}
                  <span className="faq__icon" aria-hidden="true" />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-a-${i}`}
                      className="faq__a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                    >
                      <p>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
