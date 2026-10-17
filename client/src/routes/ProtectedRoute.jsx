import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center text-ink-soft">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "DOCTOR" ? "/doctor" : "/dashboard"} replace />;
  }
  return <Outlet />;
}