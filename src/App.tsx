import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import SpecialRequests from '@/pages/SpecialRequests';
import WholesaleProducts from '@/pages/WholesaleProducts';
import WholesaleAccess from '@/pages/WholesaleAccess';
import WholesaleManagement from '@/pages/WholesaleManagement';
import CustomerManagement from '@/pages/CustomerManagement';
import ExternalLinksManagement from '@/pages/ExternalLinksManagement';
import FinancialDashboard from '@/pages/FinancialDashboard';
import Settings from '@/pages/Settings';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/special-requests" element={<SpecialRequests />} />
            <Route path="/wholesale-products" element={<WholesaleProducts />} />
            <Route path="/wholesale-access" element={<WholesaleAccess />} />
            <Route path="/wholesale-management" element={<WholesaleManagement />} />
            <Route path="/customers" element={<CustomerManagement />} />
            <Route path="/external-links" element={<ExternalLinksManagement />} />
            <Route path="/finances" element={<FinancialDashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
