import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useSiteData } from '../context/SiteDataContext'
import Reveal from './Reveal'
import EditableText from './editable/EditableText'

export default function Faq() {
  const { data } = useSiteData()
  const f = data.faq
  const [open, setOpen] = useState(0)

  if (!f.items?.length) return null

  return (
    <section id="faq" className="section section--surface">
      <div className="container faq__grid">
        <Reveal>
          <EditableText path="faq.eyebrow" className="eyebrow" />
          <EditableText as="h2" path="faq.title" style={{ marginTop: '1.25rem' }} />
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
                  <EditableText path={`faq.items.${i}.q`} />
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
                      <EditableText as="p" path={`faq.items.${i}.a`} multiline />
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
