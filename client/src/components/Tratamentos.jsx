import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { useSiteData } from '../context/SiteDataContext'
import Reveal from './Reveal'

/**
 * Cards empilhados no scroll (sticky stack), o mesmo efeito do site da
 * Dra. Vanessa feito no Framer, aqui em React puro.
 *
 * Como funciona: cada card e `position: sticky` com um `top` deslocado pelo
 * indice, entao eles param um por cima do outro. Enquanto o proximo sobe,
 * o card de baixo encolhe (scale) e some um pouco, criando a pilha.
 * Nada de pinning por JS: o browser resolve o sticky sozinho.
 */
export default function Tratamentos() {
  const { data } = useSiteData()
  const t = data.tratamentos
  const containerRef = useRef(null)

  if (!t.items?.length) return null

  return (
    <section id="tratamentos" className="section section--cream-deep" ref={containerRef}>
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">{t.eyebrow}</span>
          <h2>{t.title}</h2>
          {t.intro && <p className="lead">{t.intro}</p>}
        </Reveal>
      </div>

      <div className="container">
        <div className="stack">
          {t.items.map((item, i) => (
            <StackCard key={i} item={item} index={i} total={t.items.length} />
          ))}
        </div>
      </div>
    </section>
  )
}

/** No celular a pilha vira uma lista simples: empilhar em tela pequena
 *  esconde conteudo em vez de organizar. */
function useIsNarrow(query = '(max-width: 900px)') {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setNarrow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return narrow
}

function StackCard({ item, index, total }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const narrow = useIsNarrow()

  // Entrada: enquanto o card sobe da base ate encostar no topo, a foto
  // interna faz um zoom-out suave.
  const { scrollYProgress: enterProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start start'],
  })
  const imageScale = useTransform(enterProgress, [0, 1], [1.18, 1])

  // Saida: com o card ja grudado no topo, o proximo sobe por cima e este
  // encolhe. Quanto mais antigo o card, menor ele fica no fim da pilha.
  const targetScale = 1 - (total - index) * 0.035
  const { scrollYProgress: exitProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const exitScale = useTransform(exitProgress, [0, 1], [1, targetScale])
  const exitOpacity = useTransform(exitProgress, [0, 0.85, 1], [1, 1, 0.72])

  const stacked = !reduce && !narrow
  const style = stacked ? { scale: exitScale, opacity: exitOpacity } : undefined

  return (
    <div
      className="stack__item"
      ref={ref}
      style={stacked ? { top: `calc(6rem + ${index * 18}px)` } : undefined}
    >
      <motion.article className="stack__card" style={style}>
        <div className="stack__body">
          <span className="stack__number">{item.number || String(index + 1).padStart(2, '0')}</span>
          <h3 className="stack__title">{item.title}</h3>
          <p className="stack__summary">{item.summary}</p>
          {item.list?.length > 0 && (
            <ul className="stack__list">
              {item.list.map((li, k) => (
                <li key={k}>{li}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="stack__media">
          {item.image ? (
            <motion.img
              src={item.image}
              alt={item.alt || item.title}
              loading="lazy"
              style={stacked ? { scale: imageScale } : undefined}
            />
          ) : (
            <div className="placeholder-box">Foto do tratamento</div>
          )}
        </div>
      </motion.article>
    </div>
  )
}
