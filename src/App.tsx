import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import NewNotePage from './pages/NewNotePage'
import NoteDetailPage from './pages/NoteDetailPage'
import SharePage from './pages/SharePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/new"       element={<NewNotePage />} />
        <Route path="/note/:id"  element={<NoteDetailPage />} />
        <Route path="/share"     element={<SharePage />} />
        <Route path="/settings"  element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
