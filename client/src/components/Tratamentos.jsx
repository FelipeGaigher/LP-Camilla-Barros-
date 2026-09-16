import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { useSiteData } from '../context/SiteDataContext'
import Reveal from './Reveal'
import EditableText from './editable/EditableText'

/**
 * Cards empilhados no scroll (sticky stack), o mesmo efeito do site da
 * Dra. Vanessa feito no Framer, aqui em React puro.
 *
 * Como funciona: cada card e `position: sticky` com um `top` deslocado pelo
 * indice, entao eles param um por cima do outro. Enquanto o proximo sobe,
 * o card de baixo encolhe, criando a pilha.
 * Nada de pinning por JS: o browser resolve o sticky sozinho.
 *
 * Roda em qualquer largura. O que muda no celular e so a proporcao do card
 * e o quanto de cada um fica espiando, e isso e tudo media query.
 */
export default function Tratamentos() {
  const { data } = useSiteData()
  const t = data.tratamentos
  const stackRef = useRef(null)

  // O progresso da saida e medido aqui, na pilha inteira, e nao card a card.
  // Motivo: o card e `position: sticky`, e um elemento grudado devolve sempre
  // o mesmo getBoundingClientRect. Medindo nele, o useScroll congela e a
  // escala nunca sai de 1 — o empilhamento aparecia, o encolher nao.
  // `.stack` nao gruda, entao o progresso dela anda de verdade.
  const { scrollYProgress } = useScroll({
    target: stackRef,
    offset: ['start start', 'end start'],
  })

  if (!t.items?.length) return null

  return (
    <section id="tratamentos" className="section section--surface">
      <div className="container">
        <Reveal className="section-head">
          <EditableText path="tratamentos.eyebrow" className="eyebrow" />
          <EditableText as="h2" path="tratamentos.title" />
          <EditableText as="p" path="tratamentos.intro" className="lead" multiline />
        </Reveal>
      </div>

      <div className="container">
        <div className="stack" ref={stackRef}>
          {t.items.map((item, i) => (
            <StackCard
              key={i}
              item={item}
              index={i}
              total={t.items.length}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function StackCard({ item, index, total, progress }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()

  // Entrada: enquanto o card sobe da base ate encostar no topo, a foto
  // interna faz um zoom-out suave. Aqui medir no proprio card funciona,
  // porque nesse trecho ele ainda nao grudou.
  const { scrollYProgress: enterProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start start'],
  })
  const imageScale = useTransform(enterProgress, [0, 1], [1.18, 1])

  // Saida: com o card ja grudado no topo, o proximo sobe por cima e este
  // encolhe. Cada card ocupa uma fatia igual do progresso da pilha, e a
  // fatia dele e justamente o trecho em que o card seguinte o cobre.
  // So escala, sem fade: os cards param colados um sobre o outro, entao
  // qualquer transparencia faz o texto do card de tras vazar pelo da frente.
  const targetScale = 1 - (total - index) * 0.028
  const inicio = index / total
  const fim = (index + 1) / total
  const exitScale = useTransform(progress, [inicio, fim], [1, targetScale])

  // A pilha roda em toda largura; quem desliga e so o prefers-reduced-motion.
  // O `top` de cada card mora no CSS, via --i: o desconto por card muda de
  // 22px no desktop para 9px no celular, e isso e decisao de media query.
  const stacked = !reduce
  const style = stacked ? { scale: exitScale } : undefined

  return (
    <div className="stack__item" ref={ref} style={{ '--i': String(index) }}>
      <motion.article className="stack__card" style={style}>
        <div className="stack__body">
          <span className="stack__number">{item.number || String(index + 1).padStart(2, '0')}</span>
          <EditableText as="h3" className="stack__title" path={`tratamentos.items.${index}.title`} />
          <EditableText as="p" className="stack__summary" path={`tratamentos.items.${index}.summary`} multiline />
          {item.list?.length > 0 && (
            <ul className="stack__list">
              {item.list.map((li, k) => (
                <EditableText as="li" key={k} path={`tratamentos.items.${index}.list.${k}`} />
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
