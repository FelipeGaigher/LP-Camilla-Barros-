import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Scroll suave global. E o que mais muda a percepcao de "site caro"
 * sem custar nada visualmente.
 */
export default function SmoothScroll({ enabled = true }) {
  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.6,
    })

    let rafId
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    window.__lenis = lenis

    return () => {
      cancelAnimationFrame(rafId)
      window.__lenis = null
      lenis.destroy()
    }
  }, [enabled])

  return null
}

/** Rola ate um seletor respeitando o Lenis, se ele estiver ativo. */
export function scrollToAnchor(href) {
  if (!href?.startsWith('#')) return false
  const el = document.querySelector(href)
  if (!el) return false
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -76 })
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}
