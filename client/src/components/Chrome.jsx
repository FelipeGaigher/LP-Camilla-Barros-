import { useEffect, useState } from 'react'

/** Textura de grao. Sutil de proposito: perceptivel de relance, invisivel de perto. */
export function Grain({ enabled = true }) {
  if (!enabled) return null
  return <div className="grain" aria-hidden="true" />
}

/** Tela de carregamento curta, so para evitar o "flash" de conteudo cru. */
export function LoadingScreen({ enabled = true, label = 'Dra. Camilla' }) {
  const [done, setDone] = useState(!enabled)

  useEffect(() => {
    if (!enabled) return
    const t = setTimeout(() => setDone(true), 900)
    return () => clearTimeout(t)
  }, [enabled])

  if (!enabled) return null
  return (
    <div className={`loader ${done ? 'is-done' : ''}`} aria-hidden="true">
      <span className="loader__mark">{label}</span>
    </div>
  )
}

/** Monta o link do WhatsApp a partir do numero e da mensagem do painel. */
export function waLink(number, message) {
  const digits = String(number || '').replace(/\D/g, '')
  if (!digits) return ''
  const text = encodeURIComponent(message || 'Ola! Vim pelo site.')
  return `https://wa.me/${digits}?text=${text}`
}

/** Botao flutuante do WhatsApp, aparece depois do primeiro scroll. */
export function WhatsAppFloat({ number, message, label = 'Falar no WhatsApp' }) {
  const [visible, setVisible] = useState(false)
  const href = waLink(number, message)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!href) return null

  return (
    <a
      className={`wa-float ${visible ? 'is-visible' : ''}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      <WhatsAppIcon />
      <span>{label}</span>
    </a>
  )
}

export function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23z" />
    </svg>
  )
}

export function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
