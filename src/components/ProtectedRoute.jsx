import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../features/auth/AuthContext.jsx';

/**
 * Wraps a route that requires authentication.
 * Redirects unauthenticated users to /login, preserving the attempted path
 * in location state so LoginPage can redirect back after a successful login.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // Session is still resolving — render nothing

  if (!user) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
