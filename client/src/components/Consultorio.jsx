import { useSiteData } from '../context/SiteDataContext'
import Reveal, { RevealGroup, RevealItem } from './Reveal'
import EditableText from './editable/EditableText'
import EditableImage from './editable/EditableImage'

export default function Consultorio() {
  const { data } = useSiteData()
  const c = data.consultorio

  return (
    <section id="consultorio" className="section">
      <div className="container">
        <Reveal className="consultorio__head">
          <div>
            <EditableText path="consultorio.eyebrow" className="eyebrow" />
            <EditableText as="h2" path="consultorio.title" style={{ marginTop: '1.25rem' }} />
          </div>
          <div>
            <EditableText as="p" path="consultorio.text" className="lead" multiline />
            {c.ctaMaps?.href && (
              <a
                className="btn btn--ghost"
                href={c.ctaMaps.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: '1.75rem' }}
              >
                {c.ctaMaps.label}
              </a>
            )}
          </div>
        </Reveal>

        <RevealGroup className="consultorio__gallery" stagger={0.07}>
          {c.gallery?.map((g, i) => (
            <RevealItem as="figure" key={i} y={22}>
              <EditableImage
                path={`consultorio.gallery.${i}.image`}
                alt={g.alt || ''}
                placeholder={g.alt || 'Foto do espaco'}
                loading="lazy"
              />
            </RevealItem>
          ))}
        </RevealGroup>

        {c.diferenciais?.length > 0 && (
          <RevealGroup className="consultorio__diferenciais">
            {c.diferenciais.map((d, i) => (
              <RevealItem key={i} y={18}>
                <EditableText as="h3" path={`consultorio.diferenciais.${i}.title`} />
                <EditableText as="p" path={`consultorio.diferenciais.${i}.text`} multiline />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  )
}
