import { useSiteData } from '../context/SiteDataContext'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Credenciais from '../components/Credenciais'
import VideoSection from '../components/VideoSection'
import Tratamentos from '../components/Tratamentos'
import Sintomas from '../components/Sintomas'
import Sobre from '../components/Sobre'
import Consultorio from '../components/Consultorio'
import Depoimentos from '../components/Depoimentos'
import Faq from '../components/Faq'
import Contato from '../components/Contato'
import Footer from '../components/Footer'
import { WhatsAppFloat } from '../components/Chrome'

// A ordem real vem do painel (visibility.order). Este mapa so diz
// qual componente renderiza cada chave.
const SECTION_MAP = {
  credenciais: Credenciais,
  video: VideoSection,
  tratamentos: Tratamentos,
  sintomas: Sintomas,
  sobre: Sobre,
  consultorio: Consultorio,
  depoimentos: Depoimentos,
  faq: Faq,
  contato: Contato,
}

export default function HomePage() {
  const { data } = useSiteData()
  const vis = data.visibility
  const settings = data.settings

  const order = vis.order?.length ? vis.order : Object.keys(SECTION_MAP)

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        {order.map((key) => {
          const Component = SECTION_MAP[key]
          if (!Component || vis[key] === false) return null
          return <Component key={key} />
        })}
      </main>
      <Footer />
      {settings.whatsappFloat && (
        <WhatsAppFloat
          number={data.contato.whatsapp.number}
          message={data.contato.whatsapp.message}
          label={data.contato.whatsapp.label}
        />
      )}
    </>
  )
}
