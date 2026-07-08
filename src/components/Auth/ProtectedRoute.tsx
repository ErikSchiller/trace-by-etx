import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Props {
  children: React.ReactNode;
  requireOnboarded?: boolean;
  onlyDuringOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarded = true, onlyDuringOnboarding = false }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (onlyDuringOnboarding && user.onboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }
  if (requireOnboarded && !user.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
