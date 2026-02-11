import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, Calendar, Paperclip, X } from 'lucide-react';

const BUCKET = 'request-attachments';

function parseAttachmentUrls(value: string | null | undefined): string[] {
  if (!value) return [];
  const t = value.trim();
  if (!t) return [];
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t) as unknown;
      return Array.isArray(arr) ? arr.filter((x: unknown): x is string => typeof x === 'string') : [t];
    } catch {
      return [t];
    }
  }
  return [t];
}

interface SpecialRequest {
  id: string;
  user_id: string;
  whatsapp_number: string | null;
  details?: string;
  product_description?: string;
  status: string;
  admin_response: string | null;
  attachment_url?: string | null;
  admin_attachment_url?: string | null;
  quoted_price?: number | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
}

export default function SpecialRequests() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SpecialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SpecialRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    
    fetchRequests();
    
    const subscription = supabase
      .channel('special_requests_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, isAdmin, navigate]);

  const fetchRequests = async () => {
    try {
      let data: SpecialRequest[] | null = null;
      let error: { message: string } | null = null;

      const fullSelect = 'id, user_id, whatsapp_number, details, product_description, status, admin_response, attachment_url, admin_attachment_url, quoted_price, created_at, updated_at';
      const minimalSelect = 'id, user_id, whatsapp_number, details, product_description, status, admin_response, created_at, updated_at';

      const result = await supabase
        .from('special_requests')
        .select(fullSelect)
        .order('created_at', { ascending: false });
      error = result.error;
      data = result.data as SpecialRequest[] | null;

      if (error && (error.message?.includes('attachment_url') || error.message?.includes('admin_attachment_url') || error.message?.includes('quoted_price'))) {
        const fallback = await supabase
          .from('special_requests')
          .select(minimalSelect)
          .order('created_at', { ascending: false });
        if (!fallback.error) {
          data = (fallback.data || []).map((row: Record<string, unknown>) => ({
            ...row,
            attachment_url: null,
            admin_attachment_url: null,
            quoted_price: null,
          })) as SpecialRequest[];
          error = null;
        }
      }
      if (error) throw error;
      setRequests(data || []);
    } catch (err: unknown) {
      console.error('Error fetching special requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (request: SpecialRequest) => {
    setSelectedRequest(request);
    setAdminResponse(request.admin_response || '');
    setSelectedStatus(request.status);
    setAdminFile(null);
    if (adminFileInputRef.current) adminFileInputRef.current.value = '';
    setDialogOpen(true);
  };

  const sendPush = async (userId: string, type: 'special_request_rejected' | 'special_request_replied', requestId: string) => {
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: { userId, type, requestId },
      });
    } catch (e) {
      console.warn('Push notification failed:', e);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setSaving(true);
    try {
      const updates = {
        status: 'rejected',
        admin_response: adminResponse.trim() || 'Your request was rejected.',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('special_requests')
        .update(updates)
        .eq('id', selectedRequest.id);
      if (error) throw error;
      await sendPush(selectedRequest.user_id, 'special_request_rejected', selectedRequest.id);
      setDialogOpen(false);
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  const handleReply = async () => {
    if (!selectedRequest) return;
    setSaving(true);
    try {
      let adminAttachmentUrl: string | null = null;
      if (adminFile) {
        const ext = adminFile.name.split('.').pop() || 'bin';
        const path = `admin/${selectedRequest.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, adminFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        adminAttachmentUrl = urlData.publicUrl;
      }
      const updates: Record<string, unknown> = {
        status: 'replied',
        admin_response: adminResponse.trim() || 'You have a reply from the admin.',
        updated_at: new Date().toISOString(),
      };
      if (adminAttachmentUrl) updates.admin_attachment_url = adminAttachmentUrl;

      const { error } = await supabase
        .from('special_requests')
        .update(updates)
        .eq('id', selectedRequest.id);
      if (error) throw error;
      await sendPush(selectedRequest.user_id, 'special_request_replied', selectedRequest.id);
      setDialogOpen(false);
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to send reply');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;
    setSaving(true);
    try {
      const updates: any = {
        admin_response: adminResponse,
        status: selectedStatus,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('special_requests')
        .update(updates)
        .eq('id', selectedRequest.id);
      if (!error) {
        setDialogOpen(false);
        fetchRequests();
      } else throw error;
    } catch (e: any) {
      alert(e?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      quoted: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      replied: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filterByStatus = (status: string) => {
    if (status === 'all') return requests;
    return requests.filter(r => r.status === status);
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
            <p className="text-sm text-gray-600">Special Requests Management</p>
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{requests.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">
                {filterByStatus('pending').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Quoted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {filterByStatus('quoted').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Accepted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {filterByStatus('accepted').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>All Special Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No special requests yet</p>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleOpenDialog(request)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {request.profiles?.full_name || 'Unknown Customer'}
                          </h3>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {request.whatsapp_number || request.profiles?.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Request Details:</p>
                      <p className="text-sm text-gray-600 line-clamp-2">{request.details ?? request.product_description ?? '—'}</p>
                    </div>
                    {request.admin_response && (
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm font-medium text-blue-900 mb-1 flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          Your Response:
                        </p>
                        <p className="text-sm text-blue-800">{request.admin_response}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Response Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Special Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Customer Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Customer Information</h4>
              <p className="text-sm text-gray-600">
                <strong>Name:</strong> {selectedRequest?.profiles?.full_name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Phone:</strong> {selectedRequest?.whatsapp_number || selectedRequest?.profiles?.phone}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {selectedRequest && new Date(selectedRequest.created_at).toLocaleString()}
              </p>
            </div>

            {/* Request Details */}
            <div>
              <Label className="text-gray-700 font-semibold">Request Details</Label>
              <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {selectedRequest?.details ?? selectedRequest?.product_description ?? '—'}
              </p>
            </div>

            {/* User attachments */}
            {parseAttachmentUrls(selectedRequest?.attachment_url).length > 0 && (
              <div>
                <Label className="text-gray-700 font-semibold">Customer attachments</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {parseAttachmentUrls(selectedRequest?.attachment_url).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <Paperclip className="w-4 h-4" /> View #{i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Response (for Reject message or Reply text) */}
            <div>
              <Label htmlFor="response">Message to customer</Label>
              <Textarea
                id="response"
                placeholder="Rejection reason or your reply..."
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>

            {/* Admin attachment (for reply) */}
            <div>
              <Label className="text-gray-700">Attach image or file (optional, for reply)</Label>
              <input
                ref={adminFileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setAdminFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
              />
              {adminFile && (
                <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                  {adminFile.name}
                  <button type="button" onClick={() => { setAdminFile(null); adminFileInputRef.current && (adminFileInputRef.current.value = ''); }} className="text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </p>
              )}
            </div>

            {/* Actions: Reject | Reply */}
            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={saving}>
                {saving ? '…' : 'Reject'}
              </Button>
              <Button onClick={handleReply} disabled={saving}>
                {saving ? 'Sending…' : 'Reply'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
