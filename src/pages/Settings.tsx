import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Save, DollarSign, Bell } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const CBM_PRICE_KEY = 'cbm_price';
const RMB_EXCHANGE_RATE_KEY = 'rmb_exchange_rate';

export default function Settings() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [cbmPrice, setCbmPrice] = useState('');
  const [rmbExchangeRate, setRmbExchangeRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [pushSending, setPushSending] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    fetchSettings();
  }, [user, isAdmin, navigate]);

  const fetchSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [cbmRes, rmbRes] = await Promise.all([
        supabase.from('settings').select('value').eq('key', CBM_PRICE_KEY).maybeSingle(),
        supabase.from('settings').select('value').eq('key', RMB_EXCHANGE_RATE_KEY).maybeSingle(),
      ]);
      if (!cbmRes.error) setCbmPrice(cbmRes.data?.value ?? '100');
      if (!rmbRes.error) setRmbExchangeRate(rmbRes.data?.value ?? '7');
    } catch (err: unknown) {
      console.error('Error fetching settings:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCbmPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = cbmPrice.trim();
    const num = parseFloat(value);
    if (value === '' || isNaN(num) || num < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid price (number ≥ 0).' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            key: CBM_PRICE_KEY,
            value: value,
            updated_at: new Date().toISOString(),
            updated_by: user?.id ?? null,
          },
          { onConflict: 'key' }
        );

      if (error) throw error;
      setMessage({ type: 'success', text: 'CBM price updated. The app calculator will use this price.' });
    } catch (err: unknown) {
      console.error('Error saving CBM price:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRmbRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = rmbExchangeRate.trim();
    const num = parseFloat(value);
    if (value === '' || isNaN(num) || num <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid exchange rate (number > 0).' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            key: RMB_EXCHANGE_RATE_KEY,
            value: value,
            updated_at: new Date().toISOString(),
            updated_by: user?.id ?? null,
          },
          { onConflict: 'key' }
        );
      if (error) throw error;
      setMessage({ type: 'success', text: 'Yuan to Dollar exchange rate updated. Wholesale prices in the app will use this rate.' });
    } catch (err: unknown) {
      console.error('Error saving exchange rate:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handlePushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = notifTitle.trim();
    const body = notifBody.trim();
    if (!title || !body) {
      setPushMessage({ type: 'error', text: 'Please enter both title and message.' });
      return;
    }
    setPushSending(true);
    setPushMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-broadcast-notification', {
        body: { title, body },
      });
      if (error) {
        const errMsg = (error as { message?: string }).message ?? String(error);
        setPushMessage({
          type: 'error',
          text: errMsg.includes('Failed to send a request')
            ? 'Edge Function not reachable. Deploy it first: in the mobile app folder run "supabase functions deploy send-broadcast-notification" (see Settings note below).'
            : errMsg,
        });
        return;
      }
      if (data?.error) {
        setPushMessage({ type: 'error', text: String(data.error) });
        return;
      }
      const msg = typeof data?.message === 'string' ? data.message : data?.sentCount != null
        ? `Sent to ${data.sentCount} device(s).`
        : 'Notification sent.';
      setPushMessage({ type: 'success', text: msg });
      setNotifTitle('');
      setNotifBody('');
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : (typeof (err as { message?: string })?.message === 'string' ? (err as { message: string }).message : 'Failed to send notification');
      setPushMessage({
        type: 'error',
        text: text.includes('Failed to send a request')
          ? 'Edge Function not reachable. Deploy it first: in the mobile app folder run "supabase functions deploy send-broadcast-notification" (see note below).'
          : text,
      });
    } finally {
      setPushSending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-2 mt-2">
            <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
              Orders
            </Button>
            <Button onClick={() => navigate('/special-requests')} variant="outline" size="sm">
              Special Requests
            </Button>
            <Button onClick={() => navigate('/wholesale-management')} variant="outline" size="sm">
              Wholesale
            </Button>
            <Button onClick={() => navigate('/wholesale-products')} variant="outline" size="sm">
              Wholesale Products
            </Button>
            <Button onClick={() => navigate('/wholesale-access')} variant="outline" size="sm">
              Wholesale Access
            </Button>
            <Button onClick={() => navigate('/customers')} variant="outline" size="sm">
              Customers
            </Button>
            <Button onClick={() => navigate('/external-links')} variant="outline" size="sm">
              Marketplace Links
            </Button>
            <Button onClick={() => navigate('/finances')} variant="outline" size="sm">
              Finances
            </Button>
            <Button onClick={() => navigate('/settings')} size="sm" className="bg-blue-600 text-white">
              Settings
            </Button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-white shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              CBM price (per m³)
            </CardTitle>
            <CardDescription>
              Set the price per cubic meter (CBM) used in the app’s CBM calculator. Update this whenever your rate changes (e.g. daily or weekly). Customers will see this as the current CBM price and all cost calculations use it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <form onSubmit={handleSaveCbmPrice} className="space-y-4">
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="cbm-price">Price per CBM ($)</Label>
                  <Input
                    id="cbm-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cbmPrice}
                    onChange={(e) => setCbmPrice(e.target.value)}
                    placeholder="e.g. 100"
                    className="text-lg"
                  />
                </div>
                {message && (
                  <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {message.text}
                  </p>
                )}
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving…' : 'Save CBM price'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Yuan to Dollar exchange rate
            </CardTitle>
            <CardDescription>
              Product prices in the admin are in Yuan (¥). The app converts them to dollars using this rate: dollar = yuan ÷ rate. Example: rate 7 means 70 ¥ = 10 $.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <form onSubmit={handleSaveRmbRate} className="space-y-4">
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="rmb-rate">Exchange rate (¥ per $1)</Label>
                  <Input
                    id="rmb-rate"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={rmbExchangeRate}
                    onChange={(e) => setRmbExchangeRate(e.target.value)}
                    placeholder="e.g. 7"
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500">e.g. 7 means 1 USD = 7 CNY (so 70 ¥ shows as $10 in the app)</p>
                </div>
                {message && (
                  <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {message.text}
                  </p>
                )}
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving…' : 'Save exchange rate'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Push notification
            </CardTitle>
            <CardDescription>
              Send a push notification to all users who have the app installed and have allowed notifications. They must have opened the app at least once to receive. If you see &quot;Failed to send a request&quot;, deploy the Edge Function once: open a terminal in the <strong>mobile app project folder</strong> (zagrosexpress-mobile-ready) and run <code className="text-xs bg-gray-100 px-1 rounded">supabase functions deploy send-broadcast-notification</code>. Ensure the admin and app use the same Supabase project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePushNotification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notif-title">Title</Label>
                <Input
                  id="notif-title"
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. New products available"
                  maxLength={100}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notif-body">Message</Label>
                <Textarea
                  id="notif-body"
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="e.g. Check out the latest wholesale products in the app."
                  rows={4}
                  className="resize-y text-base"
                />
              </div>
              {pushMessage && (
                <p className={`text-sm ${pushMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {pushMessage.text}
                </p>
              )}
              <Button type="submit" disabled={pushSending} className="bg-blue-600 hover:bg-blue-700">
                <Bell className="w-4 h-4 mr-2" />
                {pushSending ? 'Sending…' : 'Send to all users'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
