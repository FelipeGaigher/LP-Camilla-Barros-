import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="container notfound">
      <div>
        <h1 className="display">404</h1>
        <p className="lead" style={{ margin: '1rem auto 2rem' }}>
          Essa pagina nao existe ou foi movida.
        </p>
        <Link className="btn btn--primary" to="/">
          Voltar para o inicio
        </Link>
      </div>
    </main>
  )
}
