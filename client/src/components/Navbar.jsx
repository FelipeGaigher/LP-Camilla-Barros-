import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSiteData } from '../context/SiteDataContext'
import { irPara } from '../lib/navegacao'
import { linksVisiveis, destinoCta } from '../lib/secoes'
import { waLink } from './Chrome'

export default function Navbar() {
  const { data } = useSiteData()
  const navigate = useNavigate()
  const nav = data.nav
  // Secao desligada no painel tira o link daqui junto. Ver lib/secoes.js.
  const links = linksVisiveis(nav.links, data.visibility)
  const ctaHref = destinoCta(
    nav.cta.href,
    data.visibility,
    waLink(data.contato?.whatsapp?.number, data.contato?.whatsapp?.message),
  )
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
    // irPara resolve ancora, rota e link externo. Sem ele um href de rota faria
    // navegacao cheia, recarregando o bundle e perdendo o estado da SPA.
    irPara(e, href, navigate)
    if (!href?.startsWith('http')) setOpen(false)
  }

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''} ${hidden ? 'is-hidden' : ''}`}>
      <div className="container nav__inner">
        {/* O lockup completo so e legivel a partir de ~200px de largura, e no
            menu nao cabe. Por isso aqui vai o monograma isolado, sem o nome
            repetido ao lado: quem le a marca ja le o CB. */}
        <a className="nav__logo" href="#top" onClick={(e) => go(e, '#top')}>
          <img src={nav.logoImage || '/marca/logo-monograma.png'} alt={nav.logoText} />
        </a>

        <nav className="nav__links" aria-label="Navegação principal">
          {links.map((l) => (
            <a key={l.href} className="nav__link" href={l.href} onClick={(e) => go(e, l.href)}>
              {l.label}
            </a>
          ))}
          <a className="btn btn--primary" href={ctaHref} onClick={(e) => go(e, ctaHref)}>
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
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>
            {l.label}
          </a>
        ))}
        <a className="btn btn--primary" href={ctaHref} onClick={(e) => go(e, ctaHref)}>
          {nav.cta.label}
        </a>
      </div>
    </header>
  )
}
