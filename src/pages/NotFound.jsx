import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <section className="panel">
      <p className="eyebrow">404</p>
      <h1 className="panel-title">Page not found</h1>
      <p className="lead">The page you are looking for does not exist.</p>
      <Link className="primary-button" to="/">
        Go back home
      </Link>
    </section>
  )
}

export default NotFound
