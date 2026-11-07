import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';
import AppShell from 'src/components/shell/AppShell';
import FailedPage from 'src/pages/FailedPage';
import HomePage from 'src/pages/HomePage';
import LibraryPage from 'src/pages/LibraryPage';
import NotFoundPage from 'src/pages/NotFoundPage';
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

// Exported so a test can mount the tree on a memory router; the cost is that an edit to this
// file reloads the page in development rather than refreshing it in place.
// eslint-disable-next-line react-refresh/only-export-components
export const appRoutes = createRoutesFromElements(
  <Route element={<AppShell />}>
    {/* The boundary sits below the shell's route, so a page that fails while it is being
        drawn leaves the top bar, the menu and the banner standing. (ADR 104) */}
    <Route errorElement={<FailedPage />}>
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
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Route>,
);

const router = createBrowserRouter(appRoutes);

export default function App() {
  return <RouterProvider router={router} />;
}
