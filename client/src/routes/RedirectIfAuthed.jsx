import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/ui";

// Wraps login and register. Once signed in, goes back to where the person was headed.
export default function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  const { state } = useLocation();

  if (loading) return <div className="mx-auto max-w-xl px-5"><Loading /></div>;
  if (!user) return children;

  const from = state?.from;
  const home = user.role === "DOCTOR" ? "/doctor" : "/dashboard";
  const target = from && from.pathname !== "/login" ? `${from.pathname}${from.search ?? ""}` : home;
  return <Navigate to={target} replace state={from?.state} />;
}