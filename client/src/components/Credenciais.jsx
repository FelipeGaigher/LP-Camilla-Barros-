import { useSiteData } from '../context/SiteDataContext'
import Reveal, { RevealGroup, RevealItem } from './Reveal'
import EditableText from './editable/EditableText'

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
          <EditableText path="credenciais.name" className="cred__name" />
          <div className="cred__meta">
            <EditableText path="credenciais.role" />
            <EditableText path="credenciais.cro" />
            <EditableText path="credenciais.atuacao" />
          </div>
        </Reveal>

        <RevealGroup className="cred__values">
          {c.valores?.map((v, i) => (
            <RevealItem className="cred__value" key={i}>
              <EditableText as="h3" path={`credenciais.valores.${i}.title`} />
              <EditableText as="p" path={`credenciais.valores.${i}.text`} multiline />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
