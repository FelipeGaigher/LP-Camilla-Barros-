import { useEffect, useState, useRef } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import { scrollToAnchor } from './SmoothScroll'

export default function Navbar() {
  const { data } = useSiteData()
  const nav = data.nav
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      setHidden(y > 260 && y > lastY.current && !open)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const go = (e, href) => {
    if (scrollToAnchor(href)) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''} ${hidden ? 'is-hidden' : ''}`}>
      <div className="container nav__inner">
        <a className="nav__logo" href="#top" onClick={(e) => go(e, '#top')}>
          {nav.logoImage ? <img src={nav.logoImage} alt={nav.logoText} /> : nav.logoText}
        </a>

        <nav className="nav__links" aria-label="Navegacao principal">
          {nav.links.map((l) => (
            <a key={l.href} className="nav__link" href={l.href} onClick={(e) => go(e, l.href)}>
              {l.label}
            </a>
          ))}
          <a className="btn btn--primary" href={nav.cta.href} onClick={(e) => go(e, nav.cta.href)}>
            {nav.cta.label}
          </a>
        </nav>

        <button
          className={`nav__burger ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
        >
          <span /><span />
        </button>
      </div>

      <div className={`nav__drawer ${open ? 'is-open' : ''}`}>
        {nav.links.map((l) => (
          <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>
            {l.label}
          </a>
        ))}
        <a className="btn btn--primary" href={nav.cta.href} onClick={(e) => go(e, nav.cta.href)}>
          {nav.cta.label}
        </a>
      </div>
    </header>
  )
}
