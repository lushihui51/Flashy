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
import PracticeEditPage from 'src/pages/PracticeEditPage';
import RunPage from 'src/pages/RunPage';
import DeckBoardPage from 'src/pages/DeckBoardPage';
import DeckDetailPage from 'src/pages/DeckDetailPage';
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
      <Route path="/practices" element={<PracticeOverviewPage />} />
      <Route path="/practices/new" element={<PracticeCreatePage />} />
      <Route path="/practices/:practiceId" element={<PracticeDetailsPage />} />
      <Route path="/practices/:practiceId/edit" element={<PracticeEditPage />} />
      <Route path="/practices/:practiceId/decks/:deckId" element={<DeckBoardPage />} />
      <Route path="/runs/:runId" element={<RunPage />} />
      <Route path="/runs/:runId/decks/:deckId" element={<DeckBoardPage />} />
      <Route path="/decks/:deckId" element={<DeckDetailPage />} />
      <Route path="/decks/new" element={<DeckEditor mode="create" />} />
      <Route path="/decks/:deckId/edit" element={<DeckEditor mode="edit" />} />
      <Route path="/cards/new" element={<CardStandaloneForm mode="create" />} />
      <Route path="/cards/:cardId/edit" element={<CardStandaloneForm mode="edit" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Route>,
);

const router = createBrowserRouter(appRoutes);

export default function App() {
  return <RouterProvider router={router} />;
}
