import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isSupabaseConfigMissing } from '@/lib/supabase';
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

function ConfigErrorPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'system-ui, sans-serif',
      background: '#f1f5f9',
      color: '#1e293b'
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Configuration missing</h1>
        <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
          Supabase environment variables were not set when this site was built.
        </p>
        <p style={{ marginBottom: 8, fontSize: 14, color: '#64748b' }}>
          In <strong>Cloudflare Pages</strong> → your project → <strong>Settings</strong> → <strong>Environment variables</strong>, add:
        </p>
        <ul style={{ textAlign: 'left', fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          <li><code>VITE_SUPABASE_URL</code></li>
          <li><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></li>
        </ul>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          Then go to <strong>Deployments</strong> and <strong>Redeploy</strong> the latest commit.
        </p>
      </div>
    </div>
  );
}

function App() {
  if (isSupabaseConfigMissing) {
    return <ConfigErrorPage />;
  }
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
