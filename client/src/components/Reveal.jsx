import { motion, useReducedMotion } from 'motion/react'

const EASE = [0.33, 1, 0.68, 1]

/**
 * Entrada padrao do site: sobe 28px e aparece, uma unica vez.
 * `delay` em segundos, `as` troca a tag renderizada.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  duration = 0.8,
  amount = 0.25,
  className,
  as = 'div',
  ...rest
}) {
  const reduce = useReducedMotion()
  const Tag = motion[as] || motion.div

  if (reduce) {
    const Plain = as
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    )
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Revela filhos em cascata. Use com <Reveal.Item> como filho direto. */
export function RevealGroup({ children, className, stagger = 0.08, amount = 0.2, ...rest }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className} {...rest}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, className, y = 24, as = 'div', ...rest }) {
  const Tag = motion[as] || motion.div
  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
