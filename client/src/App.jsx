import { Routes, Route } from "react-router-dom";
import SiteLayout from "./components/layout/SiteLayout";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Landing />} />
        {/* Next parts add login, register, query, results, booking, nurse, appointments and the doctor dashboard here */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}