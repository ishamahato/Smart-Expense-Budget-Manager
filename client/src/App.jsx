import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import { LoadingBlock } from './components/ui/Feedback';
import Login from './pages/Login';
import Register from './pages/Register';

// Everything behind the login wall is code-split so the auth screens stay light.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const AddExpense = lazy(() => import('./pages/AddExpense'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Analytics = lazy(() => import('./pages/Analytics'));
const RecurringExpenses = lazy(() => import('./pages/RecurringExpenses'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return <LoadingBlock label="Loading page…" className="py-24" />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Authenticated */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/expenses"
          element={
            <Suspense fallback={<PageFallback />}>
              <Expenses />
            </Suspense>
          }
        />
        <Route
          path="/expenses/new"
          element={
            <Suspense fallback={<PageFallback />}>
              <AddExpense />
            </Suspense>
          }
        />
        <Route
          path="/budgets"
          element={
            <Suspense fallback={<PageFallback />}>
              <Budgets />
            </Suspense>
          }
        />
        <Route
          path="/analytics"
          element={
            <Suspense fallback={<PageFallback />}>
              <Analytics />
            </Suspense>
          }
        />
        <Route
          path="/recurring"
          element={
            <Suspense fallback={<PageFallback />}>
              <RecurringExpenses />
            </Suspense>
          }
        />
        <Route
          path="/assistant"
          element={
            <Suspense fallback={<PageFallback />}>
              <AIAssistant />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageFallback />}>
              <Settings />
            </Suspense>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="*"
        element={
          <Suspense fallback={<PageFallback />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
}
