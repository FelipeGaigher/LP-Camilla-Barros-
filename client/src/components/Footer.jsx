import { useSiteData } from '../context/SiteDataContext'
import { waLink, WhatsAppIcon, InstagramIcon } from './Chrome'
import { scrollToAnchor } from './SmoothScroll'

export default function Footer() {
  const { data } = useSiteData()
  const f = data.footer
  const nav = data.nav
  const c = data.contato
  const year = new Date().getFullYear()
  const wa = f.social.whatsapp || waLink(c.whatsapp.number, c.whatsapp.message)

  const go = (e, href) => { if (scrollToAnchor(href)) e.preventDefault() }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div>
            {/* No rodape cabe o lockup completo, invertido sobre a faixa escura. */}
            <img
              className="footer__mark"
              src="/marca/logo-lockup.png"
              alt={`${f.legal.profissional}, ${f.tagline}`}
            />
            <p className="footer__tagline">{f.tagline}</p>
            <div className="footer__social">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                  <WhatsAppIcon size={18} />
                </a>
              )}
              {f.social.instagram && (
                <a href={f.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <InstagramIcon />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4>Navegar</h4>
            <ul>
              {nav.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={(e) => go(e, l.href)}>
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="#contato" onClick={(e) => go(e, '#contato')}>Contato</a>
              </li>
            </ul>
          </div>

          <div>
            <h4>Endereco</h4>
            <ul>
              <li>
                {f.endereco.street}
                {f.endereco.complement ? `, ${f.endereco.complement}` : ''}
              </li>
              <li>{f.endereco.district}</li>
              <li>
                {f.endereco.city}/{f.endereco.state} &middot; {f.endereco.cep}
              </li>
              {f.endereco.mapsLink && (
                <li>
                  <a href={f.endereco.mapsLink} target="_blank" rel="noopener noreferrer">
                    Como chegar
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4>Atendimento</h4>
            <ul>
              {f.horarios?.map((h, i) => (
                <li key={i}>
                  {h.day}
                  <br />
                  {h.hours}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bloco obrigatorio: Art. 43 da Resolucao CFO 118/2012. Nao remover. */}
        <div className="footer__legal">
          <p className="footer__legal-line">
            <strong>{f.legal.profissional}</strong> &middot; {f.legal.denominacao} &middot; {f.legal.cro}
          </p>
          <p className="footer__legal-line">
            Responsavel Tecnico: {f.legal.responsavelTecnico}
            {f.legal.cnpj ? ` · CNPJ ${f.legal.cnpj}` : ''}
          </p>
          <p className="footer__aviso">{f.legal.aviso}</p>
        </div>

        <div className="footer__bottom">
          <span>
            &copy; {year} {f.logoText}. Todos os direitos reservados.
          </span>
          {f.credit?.label && (
            <a href={f.credit.href} target="_blank" rel="noopener noreferrer">
              {f.credit.label}
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}
