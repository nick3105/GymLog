import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'

import AuthForm from './components/AuthForm'
import Layout from './components/Layout'
import { useJournal } from './journal'
import Create from './pages/Create'
import Settings from './pages/Settings'
import Coachees from './pages/Coachees'
import CoacheeDetail from './pages/CoacheeDetail'
import CoacheeBuilder from './pages/CoacheeBuilder'
import Home from './pages/Home'
import EditSession from './pages/EditSession'
import Review from './pages/Review'
import ReviewDetail from './pages/ReviewDetail'
import Session from './pages/Session'
import Start from './pages/Start'
import Weight from './pages/Weight'
import WeeklyVolume from './pages/WeeklyVolume'
import ExerciseProgress from './pages/ExerciseProgress'

// Signed out, every page shows Sign in; signed in, Sign in and Create account go home.
function SignedIn({ children }: { children: ReactNode }) {
  const { status } = useJournal()
  if (status === 'loading') return <p className="text-muted p-6">Opening your journal…</p>
  if (status === 'signed-out') return <Navigate to="/signin" replace />
  return children
}

function SignedOut({ children }: { children: ReactNode }) {
  const { status } = useJournal()
  if (status === 'loading') return <p className="text-muted p-6">Opening your journal…</p>
  if (status === 'signed-in') return <Navigate to="/" replace />
  return children
}

const router = createBrowserRouter([
  {
    path: '/signin',
    element: (
      <SignedOut>
        <AuthForm mode="login" />
      </SignedOut>
    ),
  },
  {
    path: '/register',
    element: (
      <SignedOut>
        <AuthForm mode="register" />
      </SignedOut>
    ),
  },
  {
    path: '/',
    element: (
      <SignedIn>
        <Layout />
      </SignedIn>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'start', element: <Start /> },
      { path: 'session', element: <Session /> },
      { path: 'create', element: <Navigate to="/review/create" replace /> },
      { path: 'review/create', element: <Create key="new" /> },
      { path: 'workouts/:id/edit', element: <Create key="edit" /> },
      { path: 'review', element: <Review /> },
      { path: 'review/:id', element: <ReviewDetail /> },
      { path: 'review/:id/edit', element: <EditSession /> },
      { path: 'weight', element: <Weight /> },
      { path: 'review/volume', element: <WeeklyVolume /> },
      { path: 'review/progress', element: <ExerciseProgress /> },
      { path: 'settings', element: <Settings /> },
      { path: 'coachees', element: <Coachees /> },
      { path: 'coachees/:coacheeId', element: <CoacheeDetail /> },
      { path: 'coachees/:coacheeId/create', element: <CoacheeBuilder /> },
      { path: 'coachees/:coacheeId/workouts/:id/edit', element: <CoacheeBuilder /> },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
