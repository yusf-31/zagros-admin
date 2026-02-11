import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ship, Plane, Search } from 'lucide-react';

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
  amount_paid: number | null;
  payment_notes: string | null;
  tracking_number: string | null;
  received_china_photo_urls: string[] | null;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
}

function extractBothPricesFromQuote(adminResponse: string | null): { air: number | null; sea: number | null } {
  if (!adminResponse) return { air: null, sea: null };
  const airMatch = adminResponse.match(/(?:💰|✈️) Air Shipping: \$(\d+(?:\.\d+)?)/);
  const seaMatch = adminResponse.match(/🚢 Sea Shipping: \$(\d+(?:\.\d+)?)/);
  return {
    air: airMatch ? parseFloat(airMatch[1]) : null,
    sea: seaMatch ? parseFloat(seaMatch[1]) : null,
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
  const [sendingQuote, setSendingQuote] = useState(false);
  const [savingPaymentAndMoving, setSavingPaymentAndMoving] = useState(false);

  // Quote form states
  const [productPrice, setProductPrice] = useState('');
  const [shippingCostAir, setShippingCostAir] = useState('');
  const [shippingCostSea, setShippingCostSea] = useState('');
  const [transferFee, setTransferFee] = useState('');
  const [adminBenefit, setAdminBenefit] = useState('');
  const [customAdminMessage, setCustomAdminMessage] = useState('');
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<'air' | 'sea'>('sea');
  // Payment (quoted orders): amount paid, notes, and chosen shipping when method was "both"
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [chosenShippingForPayment, setChosenShippingForPayment] = useState<'air' | 'sea' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [markingReceivedChina, setMarkingReceivedChina] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [markingOnTheWay, setMarkingOnTheWay] = useState(false);
  const [markingReadyForPickup, setMarkingReadyForPickup] = useState(false);
  const [markingCompleted, setMarkingCompleted] = useState(false);
  const [amountLeftToPayComplete, setAmountLeftToPayComplete] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

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
      // Fetch orders (optionally with profiles; fallback to orders only if join fails)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (ordersError || !ordersData) {
        // Join may fail due to RLS on profiles – fetch orders without join so list still shows
        const { data: ordersOnly } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        setOrders(ordersOnly || []);
      } else {
        setOrders(ordersData);
      }

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
    setCustomAdminMessage('');
    setAmountPaid(order.amount_paid != null ? String(order.amount_paid) : '');
    setPaymentNotes(order.payment_notes ?? '');
    setChosenShippingForPayment(order.shipping_method === 'both' ? null : order.shipping_method as 'air' | 'sea');
    setTrackingNumberInput(order.tracking_number ?? '');
    setAmountLeftToPayComplete('');
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

    const prodPrice = parseFloat(productPrice) || 0;
    if (prodPrice > 30 && transferFee && parseFloat(transferFee) > 0) {
      response += `\n💸 Transfer Fee: $${transferFee}`;
    } else {
      response += `\n💸 Transfer Fee: Free`;
    }

    const msg = (customAdminMessage || '').trim();
    if (msg) {
      response += '\n\n---ADMIN_MESSAGE---\n' + msg;
    }
    return response;
  };

  const handleSendQuote = async () => {
    if (!selectedOrder) return;

    const prodPrice = parseFloat(productPrice);
    if (isNaN(prodPrice) || prodPrice < 0) {
      alert('Please enter a valid Product Price.');
      return;
    }

    let shippingCost: number;
    if (selectedOrder.shipping_method === 'both') {
      const air = parseFloat(shippingCostAir);
      const sea = parseFloat(shippingCostSea);
      if (isNaN(air) || isNaN(sea) || air < 0 || sea < 0) {
        alert('Please enter valid Air and Sea shipping costs.');
        return;
      }
      shippingCost = sea; // default for "both" until customer picks; or use average
    } else if (selectedOrder.shipping_method === 'air') {
      shippingCost = parseFloat(shippingCostAir);
      if (isNaN(shippingCost) || shippingCost < 0) {
        alert('Please enter a valid Air shipping cost.');
        return;
      }
    } else {
      shippingCost = parseFloat(shippingCostSea);
      if (isNaN(shippingCost) || shippingCost < 0) {
        alert('Please enter a valid Sea shipping cost.');
        return;
      }
    }

    const transferFeeNum = prodPrice > 30 ? (parseFloat(transferFee) || 0) : 0;
    const updateData: any = {
      status: 'quoted',
      product_price: prodPrice,
      shipping_cost: shippingCost,
      transfer_fee: transferFeeNum,
      admin_benefit: parseFloat(adminBenefit) || 0,
      admin_response: buildAdminResponse(),
      updated_at: new Date().toISOString(),
    };

    setSendingQuote(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrder.id);

      if (error) {
        console.error('Send quote error:', error);
        alert('Failed to send quote: ' + (error.message || 'Unknown error'));
        return;
      }
      setDialogOpen(false);
      fetchData();
    } finally {
      setSendingQuote(false);
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

  // Payment totals for quoted "both" orders (from admin_response)
  const getQuotedTotalsForBoth = () => {
    if (!selectedOrder || selectedOrder.shipping_method !== 'both' || !selectedOrder.admin_response) return null;
    const prices = extractBothPricesFromQuote(selectedOrder.admin_response);
    const pp = selectedOrder.product_price ?? 0;
    const tf = selectedOrder.transfer_fee ?? 0;
    const ab = selectedOrder.admin_benefit ?? 0;
    if (prices.air == null && prices.sea == null) return null;
    return {
      air: prices.air != null ? pp + prices.air + tf + ab : null,
      sea: prices.sea != null ? pp + prices.sea + tf + ab : null,
      airCost: prices.air,
      seaCost: prices.sea,
    };
  };

  const getEffectiveTotalForPayment = (): number | null => {
    if (!selectedOrder) return null;
    const pp = selectedOrder.product_price ?? 0;
    const tf = selectedOrder.transfer_fee ?? 0;
    const ab = selectedOrder.admin_benefit ?? 0;
    if (selectedOrder.shipping_method === 'both') {
      if (chosenShippingForPayment === 'air') {
        const prices = extractBothPricesFromQuote(selectedOrder.admin_response);
        return prices.air != null ? pp + prices.air + tf + ab : null;
      }
      if (chosenShippingForPayment === 'sea') {
        const prices = extractBothPricesFromQuote(selectedOrder.admin_response);
        return prices.sea != null ? pp + prices.sea + tf + ab : null;
      }
      return null;
    }
    const sc = selectedOrder.shipping_cost ?? 0;
    return pp + sc + tf + ab;
  };

  const currentPhotoUrls = (selectedOrder?.received_china_photo_urls ?? []) as string[];
  const canAddMorePhotos = currentPhotoUrls.length < 6;

  const handleUploadReceivedChinaPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !selectedOrder) return;
    const toAdd = Math.min(files.length, 6 - currentPhotoUrls.length);
    if (toAdd <= 0) return;
    setUploadingPhotos(true);
    const newUrls: string[] = [...currentPhotoUrls];
    try {
      for (let i = 0; i < toAdd; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${selectedOrder.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('order-photos').upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('order-photos').getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
      const { error } = await supabase.from('orders').update({ received_china_photo_urls: newUrls, updated_at: new Date().toISOString() }).eq('id', selectedOrder.id);
      if (error) throw error;
      setSelectedOrder({ ...selectedOrder, received_china_photo_urls: newUrls });
      fetchData();
    } catch (err: any) {
      alert('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
      photoInputRef.current?.value && (photoInputRef.current.value = '');
    }
  };

  const handleRemoveReceivedChinaPhoto = async (url: string) => {
    if (!selectedOrder) return;
    const next = currentPhotoUrls.filter((u) => u !== url);
    setUploadingPhotos(true);
    try {
      const { error } = await supabase.from('orders').update({ received_china_photo_urls: next, updated_at: new Date().toISOString() }).eq('id', selectedOrder.id);
      if (error) throw error;
      setSelectedOrder({ ...selectedOrder, received_china_photo_urls: next });
      fetchData();
    } catch (err: any) {
      alert('Failed to remove: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleMarkOnTheWayToIraq = async () => {
    if (!selectedOrder) return;
    setMarkingOnTheWay(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'on_the_way',
          tracking_number: trackingNumberInput.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);
      if (error) {
        alert('Failed to update: ' + (error.message || 'Unknown error'));
        return;
      }
      setDialogOpen(false);
      fetchData();
    } finally {
      setMarkingOnTheWay(false);
    }
  };

  const handleMoveToReadyForPickup = async () => {
    if (!selectedOrder) return;
    setMarkingReadyForPickup(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'ready_pickup',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);
      if (error) {
        alert('Failed to update: ' + (error.message || 'Unknown error'));
        return;
      }
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: { userId: selectedOrder.user_id, orderId: selectedOrder.id, status: 'ready_pickup' },
        });
      } catch (notifErr) {
        console.warn('Push notification failed:', notifErr);
      }
      setDialogOpen(false);
      fetchData();
    } finally {
      setMarkingReadyForPickup(false);
    }
  };

  const handleMoveToCompleted = async () => {
    if (!selectedOrder) return;
    setMarkingCompleted(true);
    try {
      const updates: { status: string; updated_at: string; payment_notes?: string } = {
        status: 'completed',
        updated_at: new Date().toISOString(),
      };
      const amountTrimmed = (amountLeftToPayComplete ?? '').toString().trim();
      if (amountTrimmed) {
        const note = selectedOrder.payment_notes
          ? `${selectedOrder.payment_notes}\nAmount left to pay (on complete): ${amountTrimmed}`
          : `Amount left to pay (on complete): ${amountTrimmed}`;
        updates.payment_notes = note;
      }
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', selectedOrder.id);
      if (error) {
        alert('Failed to update: ' + (error.message || 'Unknown error'));
        return;
      }
      setDialogOpen(false);
      setAmountLeftToPayComplete('');
      fetchData();
    } finally {
      setMarkingCompleted(false);
    }
  };

  const handleMarkReceivedInChina = async () => {
    if (!selectedOrder) return;
    setMarkingReceivedChina(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'received_china',
          tracking_number: trackingNumberInput.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);
      if (error) {
        alert('Failed to update: ' + (error.message || 'Unknown error'));
        return;
      }
      setDialogOpen(false);
      fetchData();
    } finally {
      setMarkingReceivedChina(false);
    }
  };

  const handleSavePaymentAndMoveToBuying = async () => {
    if (!selectedOrder) return;
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < 0) {
      alert('Please enter a valid Amount paid.');
      return;
    }
    const total = getEffectiveTotalForPayment();
    if (total == null) {
      alert('For "both" shipping, please select whether the customer chose Air or Sea first.');
      return;
    }
    const updateData: any = {
      amount_paid: paid,
      payment_notes: paymentNotes.trim() || null,
      status: 'buying',
      updated_at: new Date().toISOString(),
    };
    if (selectedOrder.shipping_method === 'both' && chosenShippingForPayment) {
      const prices = extractBothPricesFromQuote(selectedOrder.admin_response);
      updateData.shipping_method = chosenShippingForPayment;
      updateData.shipping_cost = chosenShippingForPayment === 'air' ? prices.air : prices.sea;
    }
    setSavingPaymentAndMoving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrder.id);
      if (error) {
        alert('Failed to save: ' + (error.message || 'Unknown error'));
        return;
      }
      // Send push: "#orderRef is paid, now in process" in user's language
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: selectedOrder.user_id,
            orderId: selectedOrder.id,
            type: 'paid_in_process',
          },
        });
      } catch (notifErr) {
        console.warn('Push notification failed:', notifErr);
      }
      setDialogOpen(false);
      fetchData();
      setAmountPaid('');
      setPaymentNotes('');
      setChosenShippingForPayment(null);
    } finally {
      setSavingPaymentAndMoving(false);
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

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const id = (o.id ?? '').toLowerCase();
    const shortId = (o.id ?? '').replace(/-/g, '').slice(0, 8).toLowerCase();
    const track = ((o as Order).tracking_number ?? '').toLowerCase();
    return id.includes(q) || shortId.includes(q) || track.includes(q);
  });

  const filterOrdersByStatus = (status: string[]) => {
    return filteredOrders.filter(o => status.includes(o.status));
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
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-4">
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
          
          {/* Navigation Menu */}
          <nav className="flex gap-2 overflow-x-auto pb-2">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 text-white"
              size="sm"
            >
              Orders
            </Button>
            <Button 
              onClick={() => navigate('/special-requests')}
              variant="outline"
              size="sm"
            >
              Special Requests
            </Button>
            <Button 
              onClick={() => navigate('/wholesale-management')}
              variant="outline"
              size="sm"
            >
              Wholesale
            </Button>
            <Button 
              onClick={() => navigate('/wholesale-products')}
              variant="outline"
              size="sm"
            >
              Wholesale Products (list)
            </Button>
            <Button 
              onClick={() => navigate('/wholesale-access')}
              variant="outline"
              size="sm"
            >
              Wholesale Access
            </Button>
            <Button 
              onClick={() => navigate('/customers')}
              variant="outline"
              size="sm"
            >
              Customers
            </Button>
            <Button 
              onClick={() => navigate('/external-links')}
              variant="outline"
              size="sm"
            >
              Marketplace Links
            </Button>
            <Button 
              onClick={() => navigate('/finances')}
              variant="outline"
              size="sm"
            >
              Finances
            </Button>
            <Button 
              onClick={() => navigate('/settings')}
              variant="outline"
              size="sm"
            >
              Settings
            </Button>
          </nav>
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

        {/* Search - works across all tabs */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number or tracking number..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
                <TabsTrigger value="buying">
                  Buying ({filterOrdersByStatus(['buying']).length})
                </TabsTrigger>
                <TabsTrigger value="received_china">
                  Received in China ({filterOrdersByStatus(['received_china']).length})
                </TabsTrigger>
                <TabsTrigger value="on_the_way">
                  On the way to Iraq ({filterOrdersByStatus(['on_the_way']).length})
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
                              {order.profiles?.full_name || order.profiles?.phone || 'Customer'}
                            </p>
                            <p className="text-sm text-gray-500">{order.profiles?.phone || order.user_id?.slice(0, 8) + '…'}</p>
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

            <TabsContent value="buying" className="m-0">
              <OrdersTable 
                orders={filterOrdersByStatus(['buying'])} 
                onStatusChange={handleStatusChange}
                onOpenDialog={openQuoteDialog}
                statusColors={statusColors}
                statuses={statuses}
                getShippingMethodIcon={getShippingMethodIcon}
              />
            </TabsContent>

            <TabsContent value="received_china" className="m-0">
              <OrdersTable 
                orders={filterOrdersByStatus(['received_china'])} 
                onStatusChange={handleStatusChange}
                onOpenDialog={openQuoteDialog}
                statusColors={statusColors}
                statuses={statuses}
                getShippingMethodIcon={getShippingMethodIcon}
              />
            </TabsContent>

            <TabsContent value="on_the_way" className="m-0">
              <OrdersTable 
                orders={filterOrdersByStatus(['on_the_way'])} 
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
              {selectedOrder?.status === 'pending' ? 'Send Quote' : 'Order details'}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Customer</p>
                <p className="text-lg font-semibold">{selectedOrder.profiles?.full_name || selectedOrder.profiles?.phone || 'Customer'}</p>
                <p className="text-sm text-gray-600">{selectedOrder.profiles?.phone || selectedOrder.user_id}</p>
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

              {/* Buying: optional tracking number (internal only), then Mark received in China */}
              {selectedOrder.status === 'buying' && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                  <p className="text-sm font-medium text-gray-700">Mark items received in China</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tracking number (optional, internal only – not shown to customer)</label>
                    <input
                      type="text"
                      value={trackingNumberInput}
                      onChange={(e) => setTrackingNumberInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g. CN123456789"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleMarkReceivedInChina}
                    disabled={markingReceivedChina}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-6 font-semibold"
                  >
                    {markingReceivedChina ? 'Updating…' : 'Mark received in China'}
                  </Button>
                  <p className="text-xs text-gray-500">Order will move to &quot;Received in China&quot; tab and the customer will get a push notification.</p>
                </div>
              )}

              {/* Received in China: upload photos (optional, up to 6) – shown to customer in app */}
              {selectedOrder.status === 'received_china' && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                  <p className="text-sm font-medium text-gray-700">Photos (optional, up to 6 – shown in order card in app)</p>
                  {currentPhotoUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentPhotoUrls.map((url) => (
                        <div key={url} className="relative group">
                          <img src={url} alt="Order" className="w-20 h-20 object-cover rounded border border-gray-200" />
                          <button
                            type="button"
                            onClick={() => handleRemoveReceivedChinaPhoto(url)}
                            disabled={uploadingPhotos}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {canAddMorePhotos && (
                    <>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleUploadReceivedChinaPhotos}
                        disabled={uploadingPhotos}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhotos}
                      >
                        {uploadingPhotos ? 'Uploading…' : `Add photos (${currentPhotoUrls.length}/6)`}
                      </Button>
                    </>
                  )}
                  <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tracking number (optional, internal only)</label>
                      <input
                        type="text"
                        value={trackingNumberInput}
                        onChange={(e) => setTrackingNumberInput(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g. CN123456789"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Mark order shipped to Iraq</p>
                      <Button
                        type="button"
                        onClick={handleMarkOnTheWayToIraq}
                        disabled={markingOnTheWay}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-lg py-6 font-semibold"
                      >
                        {markingOnTheWay ? 'Updating…' : 'Mark on the way to Iraq'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">Order will move to &quot;On the way to Iraq&quot; tab. Customer gets a push in their language (e.g. Kurdistan / Iraq).</p>
                    </div>
                  </div>
                </div>
              )}

              {/* On the way to Iraq: move to ready for pickup */}
              {selectedOrder.status === 'on_the_way' && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                  <p className="text-sm font-medium text-gray-700">Move to ready for pickup</p>
                  <Button
                    type="button"
                    onClick={handleMoveToReadyForPickup}
                    disabled={markingReadyForPickup}
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 font-semibold"
                  >
                    {markingReadyForPickup ? 'Updating…' : 'Move to ready for pickup'}
                  </Button>
                  <p className="text-xs text-gray-500">Order will move to Ready. Customer gets a push notification (e.g. #orderNumber Your order is ready for pickup!).</p>
                </div>
              )}

              {/* Ready for pickup: amount left to pay (optional), then move to completed */}
              {selectedOrder.status === 'ready_pickup' && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                  <p className="text-sm font-medium text-gray-700">Mark order as completed</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount left to pay (optional)</label>
                    <input
                      type="text"
                      value={amountLeftToPayComplete}
                      onChange={(e) => setAmountLeftToPayComplete(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g. 50.00 or 0"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleMoveToCompleted}
                    disabled={markingCompleted}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-lg py-6 font-semibold"
                  >
                    {markingCompleted ? 'Updating…' : 'Move to completed'}
                  </Button>
                  <p className="text-xs text-gray-500">Order will move to the Completed tab.</p>
                </div>
              )}

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
                      Transfer Fee
                    </label>
                    {(parseFloat(productPrice) || 0) > 30 ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={transferFee}
                          onChange={(e) => setTransferFee(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g. 5"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Shown only when product price &gt; $30
                        </p>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          readOnly
                          value="Free"
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Automatically Free for orders ≤ $30 – customer will see &quot;Transfer Fee: Free&quot;
                        </p>
                      </>
                    )}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Response (optional)
                    </label>
                    <textarea
                      value={customAdminMessage}
                      onChange={(e) => setCustomAdminMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                      placeholder="Add a message for the customer. Leave empty to show nothing."
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
                    type="button"
                    onClick={handleSendQuote}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={
                      sendingQuote ||
                      !productPrice ||
                      (selectedOrder.shipping_method === 'both'
                        ? !shippingCostAir || !shippingCostSea
                        : selectedOrder.shipping_method === 'air'
                        ? !shippingCostAir
                        : !shippingCostSea)
                    }
                  >
                    {sendingQuote ? 'Sending…' : 'Send Quote to Customer'}
                  </Button>
                </>
              )}

              {/* Quote details – same for all quoted (air, sea, both) */}
              {selectedOrder.status === 'quoted' && selectedOrder.product_price != null && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Quote details</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Product</span>
                    <span className="font-medium">${selectedOrder.product_price}</span>
                  </div>
                  {selectedOrder.shipping_method === 'both' ? (() => {
                    const prices = extractBothPricesFromQuote(selectedOrder.admin_response);
                    return (
                      <>
                        {prices.air != null && (
                          <div className="flex justify-between text-sm items-center gap-2">
                            <span className="text-gray-600 flex items-center gap-1"><Plane className="w-4 h-4 text-blue-600" /> Air shipping</span>
                            <span className="font-medium">${prices.air}</span>
                          </div>
                        )}
                        {prices.sea != null && (
                          <div className="flex justify-between text-sm items-center gap-2">
                            <span className="text-gray-600 flex items-center gap-1"><Ship className="w-4 h-4 text-cyan-600" /> Sea shipping</span>
                            <span className="font-medium">${prices.sea}</span>
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <div className="flex justify-between text-sm items-center gap-2">
                      <span className="text-gray-600 flex items-center gap-1">
                        {selectedOrder.shipping_method === 'air' ? <Plane className="w-4 h-4 text-blue-600" /> : <Ship className="w-4 h-4 text-cyan-600" />}
                        {selectedOrder.shipping_method === 'air' ? 'Air' : 'Sea'} shipping
                      </span>
                      <span className="font-medium">${selectedOrder.shipping_cost ?? '—'}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transfer fee</span>
                    <span className="font-medium">
                      {selectedOrder.product_price != null && selectedOrder.product_price <= 30 ? 'Free' : `$${selectedOrder.transfer_fee ?? 0}`}
                    </span>
                  </div>
                  {((selectedOrder.admin_benefit ?? 0) > 0) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Service fee</span>
                      <span className="font-medium">${selectedOrder.admin_benefit}</span>
                    </div>
                  )}
                  {selectedOrder.shipping_method === 'both' ? (() => {
                    const totals = getQuotedTotalsForBoth();
                    if (!totals) return null;
                    return (
                      <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                        {totals.air != null && <div className="flex justify-between text-sm font-medium">Air total <span>${totals.air.toFixed(2)}</span></div>}
                        {totals.sea != null && <div className="flex justify-between text-sm font-medium">Sea total <span>${totals.sea.toFixed(2)}</span></div>}
                      </div>
                    );
                  })() : (
                    <div className="flex justify-between text-sm font-medium border-t border-gray-200 pt-2 mt-2">
                      <span>Total</span>
                      <span>${getEffectiveTotalForPayment()?.toFixed(2) ?? '—'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Record payment: amount paid, amount remaining; for "both" also choose Air or Sea */}
              {selectedOrder.status === 'quoted' && selectedOrder.product_price != null && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                  <p className="text-sm font-medium text-gray-700">Record payment (customer paid via WhatsApp)</p>
                  {selectedOrder.shipping_method === 'both' && (() => {
                    const totals = getQuotedTotalsForBoth();
                    if (!totals || (totals.air == null && totals.sea == null)) return null;
                    return (
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-amber-800 mb-2">Customer chose shipping:</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-3 p-3 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100/50">
                            <input
                              type="radio"
                              name="paymentShipping"
                              checked={chosenShippingForPayment === 'air'}
                              onChange={() => setChosenShippingForPayment('air')}
                              className="w-4 h-4"
                            />
                            <Plane className="w-5 h-5 text-blue-600" />
                            <span className="flex-1">Air — Total ${totals.air?.toFixed(2) ?? '—'}</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100/50">
                            <input
                              type="radio"
                              name="paymentShipping"
                              checked={chosenShippingForPayment === 'sea'}
                              onChange={() => setChosenShippingForPayment('sea')}
                              className="w-4 h-4"
                            />
                            <Ship className="w-5 h-5 text-cyan-600" />
                            <span className="flex-1">Sea — Total ${totals.sea?.toFixed(2) ?? '—'}</span>
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount paid ($) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g. 100"
                    />
                  </div>
                  {getEffectiveTotalForPayment() != null && amountPaid !== '' && !isNaN(parseFloat(amountPaid)) && (
                    <p className="text-sm text-gray-700">
                      Amount remaining: <strong>${Math.max(0, getEffectiveTotalForPayment()! - parseFloat(amountPaid)).toFixed(2)}</strong>
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment notes (optional)</label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[60px]"
                      placeholder="e.g. First instalment"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSavePaymentAndMoveToBuying}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6 font-semibold"
                    disabled={
                      savingPaymentAndMoving ||
                      !amountPaid ||
                      (selectedOrder.shipping_method === 'both' && chosenShippingForPayment == null)
                    }
                  >
                    {savingPaymentAndMoving ? 'Saving…' : 'Save payment & move to Buying'}
                  </Button>
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
            <tr
              key={order.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onOpenDialog(order)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.profiles?.full_name || order.profiles?.phone || 'Customer'}
                  </p>
                  <p className="text-sm text-gray-500">{order.profiles?.phone || order.user_id?.slice(0, 8) + '…'}</p>
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
              <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
                {order.status === 'quoted' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenDialog(order)}
                    className="ml-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-sm font-medium"
                  >
                    Record payment & move to Buying
                  </Button>
                )}
                {order.status === 'buying' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenDialog(order)}
                    className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm font-medium"
                  >
                    Mark received in China
                  </Button>
                )}
                {order.status === 'received_china' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenDialog(order)}
                    className="ml-2 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 text-sm font-medium"
                  >
                    View & resolve
                  </Button>
                )}
                {order.status === 'on_the_way' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenDialog(order)}
                    className="ml-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm font-medium"
                  >
                    Move to ready to pick up
                  </Button>
                )}
                {order.status === 'ready_pickup' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenDialog(order)}
                    className="ml-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 text-sm font-medium"
                  >
                    Move to completed
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
