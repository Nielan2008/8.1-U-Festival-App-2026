import { NavLink } from 'react-router-dom';

export default function Navbar({ pages }) {
  return (
    <nav className="navbar" aria-label="App navigation">
      {pages.map((page) => (
        <NavLink
          key={page.to}
          to={page.to}
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          <span className="icon">{page.to === '/' ? '🏠' : page.to === '/info' ? 'ℹ️' : page.to === '/schedule' ? '📅' : '🗺️'}</span>
          <span>{page.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
