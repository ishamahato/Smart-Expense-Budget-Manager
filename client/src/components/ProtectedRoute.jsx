import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';
import { LoadingBlock } from './ui/Feedback';

/**
 * Gate for authenticated pages. While the stored token is being validated we
 * render a loader rather than redirecting, so a refresh on a deep link does
 * not bounce the user to /login and lose their place.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  const location = useLocation();

  if (initialising) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <LoadingBlock label="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
