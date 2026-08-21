import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import AppShell from 'src/components/layout/AppShell';
import DashboardOverview from 'src/pages/DashboardOverview';
import SubjectsOverview from 'src/pages/SubjectsOverview';
import PracticesOverview from 'src/pages/PracticesOverview';
import DecksOverview from 'src/pages/DecksOverview';
import DeckDetail from 'src/pages/DeckDetail';
import PracticeRunner from 'src/pages/PracticeRunner';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardOverview />} />
          <Route path="/subjects" element={<SubjectsOverview />} />
          <Route path="/decks" element={<DecksOverview />} />
          <Route path="/decks/:deckId" element={<DeckDetail />} />
          <Route path="/practices" element={<PracticesOverview />} />
          <Route path="/practices/:sessionId" element={<PracticeRunner />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
