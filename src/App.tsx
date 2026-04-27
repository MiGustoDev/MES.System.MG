import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ProgrammingPage } from './pages/ProgrammingPage';
import { ProductionPage } from './pages/ProductionPage';
import { HistoryPage } from './pages/HistoryPage';
import { PlantScreenPage } from './pages/PlantScreenPage';
import { ConversorPage } from './pages/ConversorPage';

import { Login } from './components/Login';
import { useAuth } from './contexts/AuthContext';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (currentPage === 'plant-screen') {
    return <PlantScreenPage onBack={() => setCurrentPage('dashboard')} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'programming':
        return <ProgrammingPage />;
      case 'production':
        return <ProductionPage />;
      case 'history':
        return <HistoryPage />;
      case 'conversor':
        return <ConversorPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
