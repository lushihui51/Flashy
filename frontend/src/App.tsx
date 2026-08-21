import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppShell from 'src/components/shell/AppShell';
import HomePage from 'src/pages/HomePage';
import LibraryPage from 'src/pages/LibraryPage';
import PracticePage from 'src/pages/PracticePage';
import NotificationsPage from 'src/pages/NotificationsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
