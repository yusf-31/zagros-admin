import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Package } from 'lucide-react';

interface OrderFinancial {
  id: string;
  product_details: string;
  product_price: number | null;
  shipping_cost: number | null;
  transfer_fee: number | null;
  admin_benefit: number | null;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface FinancialStats {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  completedOrders: number;
  pendingRevenue: number;
}

export default function FinancialDashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderFinancial[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    totalCosts: 0,
    totalProfit: 0,
    completedOrders: 0,
    pendingRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'month' | 'week'>('month');

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    
    fetchFinancialData();
    
    const subscription = supabase
      .channel('orders_financial_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchFinancialData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, isAdmin, navigate, period]);

  const fetchFinancialData = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .order('created_at', { ascending: false });

      // Filter by period
      if (period === 'month') {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        query = query.gte('created_at', date.toISOString());
      } else if (period === 'week') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        query = query.gte('created_at', date.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData: OrderFinancial[]) => {
    let totalRevenue = 0;
    let totalCosts = 0;
    let totalProfit = 0;
    let completedOrders = 0;
    let pendingRevenue = 0;

    ordersData.forEach(order => {
      const revenue = (order.product_price || 0) + (order.shipping_cost || 0) + (order.transfer_fee || 0);
      const cost = (order.product_price || 0) + (order.shipping_cost || 0);
      const profit = order.admin_benefit || 0;

      if (order.status === 'completed') {
        totalRevenue += revenue;
        totalCosts += cost;
        totalProfit += profit;
        completedOrders++;
      } else {
        pendingRevenue += revenue;
      }
    });

    setStats({
      totalRevenue,
      totalCosts,
      totalProfit,
      completedOrders,
      pendingRevenue,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ZAGROSS EXPRESS</h1>
            <p className="text-sm text-gray-600">Financial Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
              Dashboard
            </Button>
            <span className="text-sm text-gray-700">{user?.email}</span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Period Selector */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                period === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                period === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                period === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                ${stats.totalRevenue.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                From {stats.completedOrders} completed orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Total Costs</p>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">
                ${stats.totalCosts.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Product + Shipping
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                ${stats.totalProfit.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalRevenue > 0 
                  ? `${((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)}% margin`
                  : 'No revenue yet'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Pending Revenue</p>
                <Package className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                ${stats.pendingRevenue.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length} pending orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shipping</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fees</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.slice(0, 20).map((order) => {
                    const revenue = (order.product_price || 0) + (order.shipping_cost || 0) + (order.transfer_fee || 0);
                    const profit = order.admin_benefit || 0;
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="font-medium text-gray-900 truncate max-w-xs">
                              {order.product_details}
                            </p>
                            <p className="text-gray-500 text-xs">#{order.id.slice(0, 8)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {order.profiles?.full_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          ${(order.product_price || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          ${(order.shipping_cost || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          ${(order.transfer_fee || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                          ${revenue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-blue-600">
                          ${profit.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No financial data for this period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
