import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';
import AppShell from 'src/components/shell/AppShell';
import HomePage from 'src/pages/HomePage';
import LibraryPage from 'src/pages/LibraryPage';
import PracticeOverviewPage from 'src/pages/PracticeOverviewPage';
import PracticeCreatePage from 'src/pages/PracticeCreatePage';
import PracticeDetailsPage from 'src/pages/PracticeDetailsPage';
import PracticeRunPage from 'src/pages/PracticeRunPage';
import DeckConfigurationEditor from 'src/components/library/DeckConfigurationEditor';
import SubjectDetailPage from 'src/pages/SubjectDetailPage';
import DeckDetailPage from 'src/pages/DeckDetailPage';
import SubjectForm from 'src/components/library/SubjectForm';
import DeckEditor from 'src/components/library/DeckEditor';
import CardStandaloneForm from 'src/components/library/CardStandaloneForm';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppShell />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/practice" element={<PracticeOverviewPage />} />
      <Route path="/practice/new" element={<PracticeCreatePage />} />
      <Route path="/practice/:practiceSessionId" element={<PracticeDetailsPage />} />
      <Route path="/practice/:practiceSessionId/run" element={<PracticeRunPage />} />
      <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
      <Route path="/decks/:deckId" element={<DeckDetailPage />} />
      <Route path="/subjects/new" element={<SubjectForm mode="create" />} />
      <Route path="/subjects/:subjectId/edit" element={<SubjectForm mode="edit" />} />
      <Route path="/decks/new" element={<DeckEditor mode="create" />} />
      <Route path="/decks/:deckId/edit" element={<DeckEditor mode="edit" />} />
      <Route path="/cards/new" element={<CardStandaloneForm mode="create" />} />
      <Route path="/deck-configurations/new" element={<DeckConfigurationEditor mode="create" />} />
      <Route
        path="/deck-configurations/:configId/edit"
        element={<DeckConfigurationEditor mode="edit" />}
      />
      <Route path="/cards/:cardId/edit" element={<CardStandaloneForm mode="edit" />} />
    </Route>,
  ),
);

export default function App() {
  return <RouterProvider router={router} />;
}
