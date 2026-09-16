import { useSiteData } from '../context/SiteDataContext'
import { RevealGroup, RevealItem } from './Reveal'
import EditableText from './editable/EditableText'

/**
 * Faixa logo abaixo do hero com os tres valores da clinica.
 *
 * O bloco de nome, CRO e area de atuacao saiu daqui: o cartao do hero, logo
 * acima, ja traz os tres, e repetir a mesma linha a um scroll de distancia so
 * atrasava a chegada nos valores.
 *
 * A exigencia do Art. 43 (nome + denominacao + CRO visiveis no site) continua
 * cumprida em dois lugares — o cartao do hero e o rodape legal. Nao remover os
 * dois; um deles precisa existir em toda pagina.
 *
 * `credenciais.atuacao` deixa de aparecer no site. O campo segue no painel,
 * porque e a redacao que substitui "especialista em X" enquanto nao houver
 * titulo registrado no CRO — se um dia voltar a ser exibido, e esse texto.
 */
export default function Credenciais() {
  const { data } = useSiteData()
  const c = data.credenciais

  return (
    <section className="section section--tight cred">
      <div className="container">
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
