import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../features/auth/AuthContext.jsx';

/**
 * Wraps a route that requires admin access.
 * Unauthenticated users → /login (with return path in state).
 * Authenticated non-admins → / (silently, no hint that /admin exists).
 */
export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to='/' replace />;
  }

  return children;
}

AdminRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
