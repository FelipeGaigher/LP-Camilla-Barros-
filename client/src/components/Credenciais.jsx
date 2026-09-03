import { useSiteData } from '../context/SiteDataContext'
import Reveal, { RevealGroup, RevealItem } from './Reveal'

/**
 * Faixa logo abaixo do hero com nome, CRO e os tres valores da clinica.
 * Alem de posicionar, cumpre a exigencia do Art. 43 (nome + denominacao + CRO).
 */
export default function Credenciais() {
  const { data } = useSiteData()
  const c = data.credenciais

  return (
    <section className="section section--tight cred">
      <div className="container">
        <Reveal className="cred__top">
          <span className="cred__name">{c.name}</span>
          <div className="cred__meta">
            <span>{c.role}</span>
            <span>{c.cro}</span>
            {c.atuacao && <span>{c.atuacao}</span>}
          </div>
        </Reveal>

        <RevealGroup className="cred__values">
          {c.valores?.map((v, i) => (
            <RevealItem className="cred__value" key={i}>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
