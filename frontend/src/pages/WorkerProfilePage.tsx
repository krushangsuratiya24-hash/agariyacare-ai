// Redirects to new ProfilePage — legacy route
import { Navigate } from 'react-router-dom';
export default function WorkerProfilePage() {
  return <Navigate to="/profile" replace />;
}
