import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { COLORS, FONTS, BUSINESS } from '../constants.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';

const NAV_LINKS = [
  { to: '/',            label: 'Home' },
  { to: '/services',    label: 'Services' },
  { to: '/about',       label: 'About' },
  { to: '/contact',     label: 'Contact' },
];

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/', { replace: true });
  }

  const navStyle = {
    backgroundColor: COLORS.blue,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  };

  const linkStyle = ({ isActive }) => ({
    color: isActive ? COLORS.red : COLORS.white,
    fontWeight: isActive ? '700' : '500',
    fontFamily: FONTS.body,
    fontSize: '1rem',
    padding: '0.25rem 0',
    borderBottom: isActive ? `2px solid ${COLORS.red}` : '2px solid transparent',
    transition: 'color 0.2s, border-color 0.2s',
  });

  return (
    <nav style={navStyle} aria-label='Main navigation'>
      <div className='nav-container'>
        <NavLink to='/' aria-label={`${BUSINESS.name} home`}>
          <img
            src='/assets/Tailwinds_Logo.png'
            alt={BUSINESS.name}
            style={{ height: '48px', display: 'block' }}
          />
        </NavLink>

        <button
          className='nav-hamburger'
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label='Toggle navigation menu'
          aria-expanded={menuOpen}
          style={{ color: COLORS.white }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <ul className={`nav-links${menuOpen ? ' nav-links--open' : ''}`}>
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to} style={linkStyle} onClick={() => setMenuOpen(false)}>
                {label}
              </NavLink>
            </li>
          ))}
          {user ? (
            <>
              <li>
                <NavLink to='/portal' style={linkStyle} onClick={() => setMenuOpen(false)}>
                  My Account
                </NavLink>
              </li>
              <li>
                <button onClick={() => { handleSignOut(); setMenuOpen(false); }} style={navBtnStyle}>
                  Sign Out
                </button>
              </li>
            </>
          ) : (
            <li>
              <NavLink to='/login' style={linkStyle} onClick={() => setMenuOpen(false)}>
                Sign In
              </NavLink>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

const navBtnStyle = {
  background: 'none',
  border: 'none',
  color: COLORS.white,
  fontFamily: FONTS.body,
  fontSize: '1rem',
  fontWeight: '500',
  cursor: 'pointer',
  padding: '0.25rem 0',
};

export default Nav;
