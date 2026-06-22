import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import ChallengesPage from './pages/Challenges';
import CreateChallengePage from './pages/CreateChallenge';
import ChallengeDetailPage from './pages/ChallengeDetail';
import CheckinCenterPage from './pages/CheckinCenter';
import RankingPage from './pages/Ranking';
import AnalyticsPage from './pages/Analytics';
import CertificatesPage from './pages/Certificates';
import PointsCenterPage from './pages/PointsCenter';
import PointsMallPage from './pages/PointsMall';
import AppLayout from './components/layout/AppLayout';
import useAuthStore from './store/auth';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/challenges"
          element={
            <RequireAuth>
              <AppLayout>
                <ChallengesPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/challenges/create"
          element={
            <RequireAuth>
              <AppLayout>
                <CreateChallengePage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/challenges/:id"
          element={
            <RequireAuth>
              <AppLayout>
                <ChallengeDetailPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/checkin"
          element={
            <RequireAuth>
              <AppLayout>
                <CheckinCenterPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/ranking"
          element={
            <RequireAuth>
              <AppLayout>
                <RankingPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequireAuth>
              <AppLayout>
                <AnalyticsPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/certificates"
          element={
            <RequireAuth>
              <AppLayout>
                <CertificatesPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/points"
          element={
            <RequireAuth>
              <AppLayout>
                <PointsCenterPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/mall"
          element={
            <RequireAuth>
              <AppLayout>
                <PointsMallPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
