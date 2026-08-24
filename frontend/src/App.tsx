import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppShell from 'src/components/shell/AppShell';
import HomePage from 'src/pages/HomePage';
import LibraryPage from 'src/pages/LibraryPage';
import PracticeOverviewPage from 'src/pages/PracticeOverviewPage';
import PracticeDetailsPage from 'src/pages/PracticeDetailsPage';
import PracticeCreatePage from 'src/pages/PracticeCreatePage';
import NotificationsPage from 'src/pages/NotificationsPage';
import SubjectDetailPage from 'src/pages/SubjectDetailPage';
import DeckDetailPage from 'src/pages/DeckDetailPage';
import SubjectForm from 'src/components/library/SubjectForm';
import DeckEditor from 'src/components/library/DeckEditor';
import CardStandaloneForm from 'src/components/library/CardStandaloneForm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/practice" element={<PracticeOverviewPage />} />
          <Route path="/practice/new" element={<PracticeCreatePage />} />
          <Route path="/practice/:practiceSessionId" element={<PracticeDetailsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
          <Route path="/decks/:deckId" element={<DeckDetailPage />} />
          <Route path="/subjects/new" element={<SubjectForm mode="create" />} />
          <Route path="/subjects/:subjectId/edit" element={<SubjectForm mode="edit" />} />
          <Route path="/decks/new" element={<DeckEditor mode="create" />} />
          <Route path="/decks/:deckId/edit" element={<DeckEditor mode="edit" />} />
          <Route path="/cards/new" element={<CardStandaloneForm mode="create" />} />
          <Route path="/cards/:cardId/edit" element={<CardStandaloneForm mode="edit" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
