import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ship, Plane } from 'lucide-react';

interface Order {
  id: string;
  user_id: string;
  product_url: string;
  product_details: string;
  shipping_method: 'sea' | 'air' | 'both';
  status: string;
  product_price: number | null;
  shipping_cost: number | null;
  transfer_fee: number | null;
  admin_benefit: number | null;
  admin_response: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
}

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalUsers: number;
}

export default function Dashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalUsers: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Quote form states
  const [productPrice, setProductPrice] = useState('');
  const [shippingCostAir, setShippingCostAir] = useState('');
  const [shippingCostSea, setShippingCostSea] = useState('');
  const [transferFee, setTransferFee] = useState('');
  const [adminBenefit, setAdminBenefit] = useState('');
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<'air' | 'sea'>('sea');

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    
    fetchData();
    
    const subscription = supabase
      .channel('orders_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, isAdmin, navigate]);

  const fetchData = async () => {
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (full_name, phone)
        `)
        .order('created_at', { ascending: false });

      setOrders(ordersData || []);

      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: completedOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        completedOrders: completedOrders || 0,
        totalUsers: totalUsers || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const openQuoteDialog = (order: Order) => {
    setSelectedOrder(order);
    setProductPrice('');
    setShippingCostAir('');
    setShippingCostSea('');
    setTransferFee('5');
    setAdminBenefit('');
    setDialogOpen(true);
  };

  const buildAdminResponse = () => {
    let response = `📦 Product: $${productPrice}`;

    if (selectedOrder?.shipping_method === 'both') {
      response += `\n💰 Air Shipping: $${shippingCostAir}`;
      response += `\n🚢 Sea Shipping: $${shippingCostSea}`;
    } else if (selectedOrder?.shipping_method === 'air') {
      response += `\n✈️ Air Shipping: $${shippingCostAir}`;
    } else {
      response += `\n🚢 Sea Shipping: $${shippingCostSea}`;
    }

    const prodPrice = parseFloat(productPrice);
    if (prodPrice > 30 && transferFee && parseFloat(transferFee) > 0) {
      response += `\n💸 Transfer Fee: $${transferFee}`;
    }

    return response;
  };

  const handleSendQuote = async () => {
    if (!selectedOrder) return;

    const prodPrice = parseFloat(productPrice);
    const updateData: any = {
      status: 'quoted',
      product_price: prodPrice,
      shipping_cost: selectedOrder.shipping_method === 'both'
        ? parseFloat(shippingCostSea)
        : (selectedOrder.shipping_method === 'air' ? parseFloat(shippingCostAir) : parseFloat(shippingCostSea)),
      transfer_fee: prodPrice > 30 ? parseFloat(transferFee) : 0,
      admin_benefit: parseFloat(adminBenefit) || 0,
      admin_response: buildAdminResponse(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', selectedOrder.id);

    if (!error) {
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string, order: Order) => {
    // If moving from quoted to buying and shipping method is "both", need to resolve
    if (order.status === 'quoted' && order.shipping_method === 'both' && newStatus === 'buying') {
      alert('Please open the order dialog to select final shipping method (Air or Sea)');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (!error) {
      fetchData();
    }
  };

  const handleResolveShippingMethod = async () => {
    if (!selectedOrder) return;

    const updateData: any = {
      status: 'buying',
      shipping_method: selectedShippingMethod,
      shipping_cost: selectedShippingMethod === 'air'
        ? parseFloat(shippingCostAir)
        : parseFloat(shippingCostSea),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', selectedOrder.id);

    if (!error) {
      setDialogOpen(false);
      fetchData();
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    quoted: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    buying: 'bg-purple-100 text-purple-800',
    received_china: 'bg-indigo-100 text-indigo-800',
    preparing: 'bg-orange-100 text-orange-800',
    on_the_way: 'bg-cyan-100 text-cyan-800',
    arrived_iraq: 'bg-teal-100 text-teal-800',
    ready_pickup: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statuses = [
    'pending', 'quoted', 'accepted', 'buying', 'received_china',
    'preparing', 'on_the_way', 'arrived_iraq', 'ready_pickup', 'completed', 'cancelled'
  ];

  const getShippingMethodIcon = (method: string) => {
    if (method === 'air') return <Plane className="w-4 h-4 text-blue-600" />;
    if (method === 'sea') return <Ship className="w-4 h-4 text-cyan-600" />;
    return (
      <div className="flex gap-1">
        <Plane className="w-3 h-3 text-blue-600" />
        <Ship className="w-3 h-3 text-cyan-600" />
      </div>
    );
  };

  const filterOrdersByStatus = (status: string[]) => {
    return orders.filter(o => status.includes(o.status));
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
            <p className="text-sm text-gray-600">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">{user?.email}</span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Completed Orders</p>
            <p className="text-3xl font-bold text-green-600">{stats.completedOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Users</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
          </div>
        </div>

        {/* Orders Tabs */}
        <div className="bg-white rounded-lg shadow">
          <Tabs defaultValue="pending" className="w-full">
            <div className="border-b border-gray-200 px-6 pt-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="pending">
                  Pending ({filterOrdersByStatus(['pending']).length})
                </TabsTrigger>
                <TabsTrigger value="quoted">
                  Quoted ({filterOrdersByStatus(['quoted']).length})
                </TabsTrigger>
                <TabsTrigger value="active">
                  Active ({filterOrdersByStatus(['buying', 'received_china', 'on_the_way', 'arrived_iraq']).length})
                </TabsTrigger>
                <TabsTrigger value="ready">
                  Ready ({filterOrdersByStatus(['ready_pickup']).length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({filterOrdersByStatus(['completed']).length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Pending Orders */}
            <TabsContent value="pending" className="m-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipping</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filterOrdersByStatus(['pending']).map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {order.profiles?.full_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">{order.profiles?.phone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <a 
                            href={order.product_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline truncate block max-w-xs"
                          >
                            {order.product_url}
                          </a>
                          <p className="text-xs text-gray-500 mt-1">{order.product_details.substring(0, 50)}...</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getShippingMethodIcon(order.shipping_method)}
                            <span className="text-sm text-gray-700 capitalize">{order.shipping_method}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            onClick={() => openQuoteDialog(order)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Send Quote
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Other tabs with similar structure */}
            <TabsContent value="quoted" className="m-0">
              <OrdersTable 
                orders={filterOrdersByStatus(['quoted'])} 
                onStatusChange={handleStatusChange}
                onOpenDialog={openQuoteDialog}
                statusColors={statusColors}
                statuses={statuses}
                getShippingMethodIcon={getShippingMethodIcon}
              />
            </TabsContent>

            <TabsContent value="active" className="m-0">
              <OrdersTable 
                orders={filterOrdersByStatus(['buying', 'received_china', 'on_the_way', 'arrived_iraq'])} 
                onStatusChange={handleStatusChange}
                onOpenDialog={openQuoteDialog}
                statusColors={statusColors}
                statuses={statuses}
                getShippingMethodIcon={getShippingMethodIcon}
              />
            </TabsContent>

            <TabsContent value="ready" className="m-0">
              <OrdersTable 
                orders={filterOrdersByStatus(['ready_pickup'])} 
                onStatusChange={handleStatusChange}
                onOpenDialog={openQuoteDialog}
                statusColors={statusColors}
                statuses={statuses}
                getShippingMethodIcon={getShippingMethodIcon}
              />
            </TabsContent>

            <TabsContent value="completed" className="m-0">
              <OrdersTable 
                orders={filterOrdersByStatus(['completed'])} 
                onStatusChange={handleStatusChange}
                onOpenDialog={openQuoteDialog}
                statusColors={statusColors}
                statuses={statuses}
                getShippingMethodIcon={getShippingMethodIcon}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Quote Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.status === 'pending' ? 'Send Quote' : 
               selectedOrder?.status === 'quoted' && selectedOrder?.shipping_method === 'both' ? 'Resolve Shipping Method' :
               'Order Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Customer</p>
                <p className="text-lg font-semibold">{selectedOrder.profiles?.full_name}</p>
                <p className="text-sm text-gray-600">{selectedOrder.profiles?.phone}</p>
              </div>

              {/* Product Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product URL</label>
                <a 
                  href={selectedOrder.product_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm break-all"
                >
                  {selectedOrder.product_url}
                </a>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Details</label>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedOrder.product_details}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Method</label>
                <div className="flex items-center gap-2">
                  {getShippingMethodIcon(selectedOrder.shipping_method)}
                  <span className="text-sm capitalize font-medium">{selectedOrder.shipping_method}</span>
                </div>
              </div>

              {/* Quote Form for Pending Orders */}
              {selectedOrder.status === 'pending' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Price ($) *
                    </label>
                    <input
                      type="number"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., 50"
                      required
                    />
                  </div>

                  {selectedOrder.shipping_method === 'both' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ✈️ Air Shipping Cost ($) *
                        </label>
                        <input
                          type="number"
                          value={shippingCostAir}
                          onChange={(e) => setShippingCostAir(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., 25"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          🚢 Sea Shipping Cost ($) *
                        </label>
                        <input
                          type="number"
                          value={shippingCostSea}
                          onChange={(e) => setShippingCostSea(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., 15"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {selectedOrder.shipping_method === 'air' ? '✈️ Air' : '🚢 Sea'} Shipping Cost ($) *
                      </label>
                      <input
                        type="number"
                        value={selectedOrder.shipping_method === 'air' ? shippingCostAir : shippingCostSea}
                        onChange={(e) => {
                          if (selectedOrder.shipping_method === 'air') {
                            setShippingCostAir(e.target.value);
                          } else {
                            setShippingCostSea(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., 20"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transfer Fee ($)
                    </label>
                    <input
                      type="number"
                      value={transferFee}
                      onChange={(e) => setTransferFee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Free for products ≤ $30
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Benefit ($)
                    </label>
                    <input
                      type="number"
                      value={adminBenefit}
                      onChange={(e) => setAdminBenefit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Quote Preview:</p>
                    {productPrice && (selectedOrder.shipping_method === 'both' ? (shippingCostAir && shippingCostSea) : (shippingCostAir || shippingCostSea)) ? (
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap">{buildAdminResponse()}</pre>
                    ) : (
                      <p className="text-sm text-gray-500">Fill in prices to see preview</p>
                    )}
                  </div>

                  <Button
                    onClick={handleSendQuote}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!productPrice || (selectedOrder.shipping_method === 'both' ? (!shippingCostAir || !shippingCostSea) : (!shippingCostAir && !shippingCostSea))}
                  >
                    Send Quote to Customer
                  </Button>
                </>
              )}

              {/* Resolve Shipping Method for "both" orders moving to buying */}
              {selectedOrder.status === 'quoted' && selectedOrder.shipping_method === 'both' && (
                <>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-2">Customer must choose final shipping method</p>
                    <p className="text-sm text-yellow-700">Select which method the customer chose to proceed:</p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="shipping"
                        value="air"
                        checked={selectedShippingMethod === 'air'}
                        onChange={() => setSelectedShippingMethod('air')}
                        className="w-4 h-4"
                      />
                      <Plane className="w-5 h-5 text-blue-600" />
                      <span className="flex-1">Air Shipping - ${shippingCostAir || '0'}</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="shipping"
                        value="sea"
                        checked={selectedShippingMethod === 'sea'}
                        onChange={() => setSelectedShippingMethod('sea')}
                        className="w-4 h-4"
                      />
                      <Ship className="w-5 h-5 text-cyan-600" />
                      <span className="flex-1">Sea Shipping - ${shippingCostSea || '0'}</span>
                    </label>
                  </div>

                  <Button
                    onClick={handleResolveShippingMethod}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Confirm & Move to Buying
                  </Button>
                </>
              )}

              {/* Display quote info for quoted orders */}
              {selectedOrder.status === 'quoted' && selectedOrder.admin_response && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Quote Sent:</p>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">{selectedOrder.admin_response}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for order tables
function OrdersTable({ 
  orders, 
  onStatusChange, 
  onOpenDialog,
  statusColors, 
  statuses,
  getShippingMethodIcon 
}: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipping</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {orders.map((order: Order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.profiles?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">{order.profiles?.phone}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <a 
                  href={order.product_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate block max-w-xs"
                >
                  {order.product_url}
                </a>
                {order.product_price && (
                  <p className="text-xs text-gray-500 mt-1">Product: ${order.product_price}</p>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {getShippingMethodIcon(order.shipping_method)}
                  <span className="text-sm text-gray-700 capitalize">{order.shipping_method}</span>
                </div>
                {order.shipping_cost && (
                  <p className="text-xs text-gray-500 mt-1">Cost: ${order.shipping_cost}</p>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={order.status}
                  onChange={(e) => onStatusChange(order.id, e.target.value, order)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statuses.map((status: string) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {order.status === 'quoted' && order.shipping_method === 'both' && (
                  <button
                    onClick={() => onOpenDialog(order)}
                    className="ml-2 text-xs text-blue-600 hover:underline"
                  >
                    Resolve
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
