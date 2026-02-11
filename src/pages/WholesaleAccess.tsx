import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Trash2, Copy, Check, Lock, Users } from 'lucide-react';

function generateRandomCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) result += chars[bytes[i] % chars.length];
  return result;
}

interface WholesalePassword {
  id: string;
  password: string;
  customer_name: string;
  is_shared: boolean;
  device_id: string | null;
  is_active: boolean;
  created_at: string;
}

export default function WholesaleAccess() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState<WholesalePassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogType, setDialogType] = useState<'single' | 'shared' | null>(null);
  const [label, setLabel] = useState('');
  const [sharedPassword, setSharedPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    fetchPasswords();
  }, [user, isAdmin, navigate]);

  const fetchPasswords = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_passwords')
        .select('id, password, customer_name, is_shared, device_id, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPasswords(data || []);
    } catch (err: unknown) {
      console.error('Error fetching wholesale passwords:', err);
      setPasswords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSingleUse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreatedPassword(null);
    try {
      const password = generateRandomCode(8);
      const customerName = label.trim() || 'Single-use code';
      const { data, error } = await supabase
        .from('customer_passwords')
        .insert({
          password,
          customer_name: customerName,
          is_shared: false,
          is_active: true,
        })
        .select('password')
        .single();

      if (error) throw error;
      setCreatedPassword(data?.password ?? password);
      setLabel('');
      setDialogType(null);
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to create code');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShared = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwd = (sharedPassword || generateRandomCode(8)).trim();
    if (!pwd) {
      alert('Enter a password or leave blank to auto-generate.');
      return;
    }
    setSaving(true);
    setCreatedPassword(null);
    try {
      const customerName = label.trim() || 'Shared wholesale';
      const { data, error } = await supabase
        .from('customer_passwords')
        .insert({
          password: pwd,
          customer_name: customerName,
          is_shared: true,
          is_active: true,
        })
        .select('password')
        .single();

      if (error) throw error;
      setCreatedPassword(data?.password ?? pwd);
      setLabel('');
      setSharedPassword('');
      setDialogType(null);
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to create password');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this password? Users who used it will lose access after their session expires.')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('customer_passwords').delete().eq('id', id);
      if (error) throw error;
      setPasswords((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
            <h1 className="text-xl font-bold text-gray-900">Wholesale Access</h1>
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
            <Button onClick={() => navigate('/customers')} variant="outline" size="sm">
              Customers
            </Button>
            <Button onClick={() => navigate('/settings')} variant="outline" size="sm">
              Settings
            </Button>
            <Button onClick={() => navigate('/wholesale-access')} size="sm" className="bg-blue-600 text-white">
              Wholesale Access
            </Button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-white shadow mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Wholesale passwords
            </CardTitle>
            <CardDescription>
              Generate a single-use code (locks to the first user and device) or create a shared password that everyone can use. Give the password to the user; they enter it in the app to open the wholesale section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => { setDialogType('single'); setLabel(''); setCreatedPassword(null); }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                Generate single-use code
              </Button>
              <Button
                type="button"
                onClick={() => { setDialogType('shared'); setLabel(''); setSharedPassword(''); setCreatedPassword(null); }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Create shared password
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow">
          <CardHeader>
            <CardTitle>Existing passwords</CardTitle>
            <CardDescription>Single-use codes lock to the first device that uses them. Shared passwords can be used by anyone. Deleting a password stops new logins; existing sessions expire in 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : passwords.length === 0 ? (
              <p className="text-sm text-gray-500">No passwords yet. Generate a single-use code or create a shared password above.</p>
            ) : (
              <ul className="space-y-3">
                {passwords.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3 bg-gray-50"
                  >
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                      <span className="font-medium text-gray-900">{p.customer_name}</span>
                      <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-gray-200" title="Password">
                        {p.password}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => copyToClipboard(p.password, p.id)}
                        title="Copy password"
                      >
                        {copiedId === p.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      {p.is_shared ? (
                        <Badge className="bg-green-100 text-green-800">Shared</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">Single-use</Badge>
                      )}
                      {!p.is_shared && p.device_id && (
                        <Badge variant="outline">Bound</Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(p.created_at).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={deletingId === p.id}
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog: Generate single-use */}
      <Dialog open={dialogType === 'single'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate single-use code</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerateSingleUse} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="single-label">Label (optional)</Label>
              <Input
                id="single-label"
                placeholder="e.g. Customer ABC"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1"
              />
            </div>
            <p className="text-sm text-gray-600">
              A random code will be generated. Give it to one user; it will lock to the first device that enters it.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogType(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Generate'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create shared */}
      <Dialog open={dialogType === 'shared'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create shared password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateShared} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="shared-pwd">Password</Label>
              <Input
                id="shared-pwd"
                type="text"
                autoComplete="off"
                placeholder="Leave blank to auto-generate"
                value={sharedPassword}
                onChange={(e) => setSharedPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="shared-label">Label (optional)</Label>
              <Input
                id="shared-label"
                placeholder="e.g. Wholesale 2025"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1"
              />
            </div>
            <p className="text-sm text-gray-600">
              Anyone who knows this password can open the wholesale section in the app.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogType(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Show created password once */}
      <Dialog open={!!createdPassword} onOpenChange={(open) => !open && setCreatedPassword(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Password created</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mt-2">
            Give this password to the user. They enter it in the app to access wholesale. You will not see it again here.
          </p>
          <div className="flex items-center gap-2 mt-4 p-3 bg-gray-100 rounded font-mono text-lg">
            <span className="flex-1 break-all">{createdPassword}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(createdPassword!, 'created')}
            >
              {copiedId === 'created' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button type="button" className="w-full mt-4" onClick={() => setCreatedPassword(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
