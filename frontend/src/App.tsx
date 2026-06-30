import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import AppShell from 'src/components/layout/AppShell';
import DashboardOverview from 'src/pages/DashboardOverview';
import SubjectsOverview from 'src/pages/SubjectsOverview';
import PracticesOverview from './pages/PracticesOverview';
import DecksOverview from './pages/DecksOverview';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardOverview />} />
          <Route path="/subjects" element={<SubjectsOverview />} />
          <Route path="/decks" element={<DecksOverview />} />
          <Route path="/practices" element={<PracticesOverview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
