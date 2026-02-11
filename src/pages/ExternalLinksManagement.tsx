import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';

interface ExternalLinkCategory {
  id: string;
  name: string;
  name_ar: string | null;
  name_ku: string | null;
  external_link: string;
  image_url: string | null;
  note_en: string | null;
  note_ar: string | null;
  note_ku: string | null;
  display_order: number | null;
  created_at: string;
}

export default function ExternalLinksManagement() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState<ExternalLinkCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ExternalLinkCategory | null>(null);

  // Form states
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameKu, setNameKu] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [noteEn, setNoteEn] = useState('');
  const [noteAr, setNoteAr] = useState('');
  const [noteKu, setNoteKu] = useState('');
  const [displayOrder, setDisplayOrder] = useState('');

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    
    fetchLinks();
    
    const subscription = supabase
      .channel('external_links_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'external_link_categories' }, () => {
        fetchLinks();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, isAdmin, navigate]);

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('external_link_categories')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (!error && data) {
      setLinks(data);
    }
    setLoading(false);
  };

  const handleOpenDialog = (link?: ExternalLinkCategory) => {
    if (link) {
      setEditMode(true);
      setSelectedLink(link);
      setNameEn(link.name);
      setNameAr(link.name_ar || '');
      setNameKu(link.name_ku || '');
      setUrl(link.external_link);
      setImageUrl(link.image_url || '');
      setNoteEn(link.note_en || '');
      setNoteAr(link.note_ar || '');
      setNoteKu(link.note_ku || '');
      setDisplayOrder(link.display_order?.toString() || '');
    } else {
      setEditMode(false);
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setNameEn('');
    setNameAr('');
    setNameKu('');
    setUrl('');
    setImageUrl('');
    setNoteEn('');
    setNoteAr('');
    setNoteKu('');
    setDisplayOrder('');
    setSelectedLink(null);
  };

  const handleSaveLink = async () => {
    const linkData = {
      name: nameEn,
      name_ar: nameAr || null,
      name_ku: nameKu || null,
      external_link: url,
      image_url: imageUrl || null,
      note_en: noteEn || null,
      note_ar: noteAr || null,
      note_ku: noteKu || null,
      display_order: displayOrder ? parseInt(displayOrder) : null,
    };

    if (editMode && selectedLink) {
      const { error } = await supabase
        .from('external_link_categories')
        .update(linkData)
        .eq('id', selectedLink.id);

      if (!error) {
        setDialogOpen(false);
        fetchLinks();
      }
    } else {
      const { error } = await supabase
        .from('external_link_categories')
        .insert([linkData]);

      if (!error) {
        setDialogOpen(false);
        resetForm();
        fetchLinks();
      }
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (confirm('Are you sure you want to delete this link?')) {
      const { error } = await supabase
        .from('external_link_categories')
        .delete()
        .eq('id', linkId);

      if (!error) {
        fetchLinks();
      }
    }
  };

  const handleMoveUp = async (link: ExternalLinkCategory, index: number) => {
    if (index === 0) return;
    
    const prevLink = links[index - 1];
    const currentOrder = link.display_order || index + 1;
    const prevOrder = prevLink.display_order || index;

    await supabase
      .from('external_link_categories')
      .update({ display_order: prevOrder })
      .eq('id', link.id);

    await supabase
      .from('external_link_categories')
      .update({ display_order: currentOrder })
      .eq('id', prevLink.id);

    fetchLinks();
  };

  const handleMoveDown = async (link: ExternalLinkCategory, index: number) => {
    if (index === links.length - 1) return;
    
    const nextLink = links[index + 1];
    const currentOrder = link.display_order || index + 1;
    const nextOrder = nextLink.display_order || index + 2;

    await supabase
      .from('external_link_categories')
      .update({ display_order: nextOrder })
      .eq('id', link.id);

    await supabase
      .from('external_link_categories')
      .update({ display_order: currentOrder })
      .eq('id', nextLink.id);

    fetchLinks();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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
            <p className="text-sm text-gray-600">External Marketplace Links</p>
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
        <div className="flex justify-between items-center mb-8">
          <Card className="flex-1 mr-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Links</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{links.length}</p>
            </CardContent>
          </Card>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Marketplace Link
          </Button>
        </div>

        {/* Links List */}
        <div className="space-y-4">
          {links.map((link, index) => (
            <Card key={link.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    {link.image_url ? (
                      <img 
                        src={link.image_url} 
                        alt={link.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ExternalLink className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{link.name}</h3>
                        <a 
                          href={link.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {link.external_link}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveUp(link, index)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveDown(link, index)}
                          disabled={index === links.length - 1}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleOpenDialog(link)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Multi-language names */}
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      {link.name_ar && (
                        <div>
                          <p className="text-xs text-gray-500">Arabic</p>
                          <p className="text-sm text-gray-700" dir="rtl">{link.name_ar}</p>
                        </div>
                      )}
                      {link.name_ku && (
                        <div>
                          <p className="text-xs text-gray-500">Kurdish</p>
                          <p className="text-sm text-gray-700" dir="rtl">{link.name_ku}</p>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {(link.note_en || link.note_ar || link.note_ku) && (
                      <div className="mt-3 pt-3 border-t">
                        {link.note_en && (
                          <p className="text-sm text-gray-600 mb-1">{link.note_en}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {links.length === 0 && (
            <div className="text-center py-12">
              <ExternalLink className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No marketplace links yet</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Link
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Link Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Marketplace Link' : 'Add Marketplace Link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="name_en">Name (English) *</Label>
                <Input
                  id="name_en"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g., Alibaba"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name_ar">Name (Arabic)</Label>
                <Input
                  id="name_ar"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="على بابا"
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="name_ku">Name (Kurdish)</Label>
                <Input
                  id="name_ku"
                  value={nameKu}
                  onChange={(e) => setNameKu(e.target.value)}
                  placeholder="ئەلیبابا"
                  dir="rtl"
                />
              </div>
            </div>

            {/* URL and Image */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.alibaba.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="image">Logo URL</Label>
                <Input
                  id="image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  placeholder="1, 2, 3..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers appear first
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="note_en">Note (English)</Label>
                <Textarea
                  id="note_en"
                  value={noteEn}
                  onChange={(e) => setNoteEn(e.target.value)}
                  placeholder="Description or note in English..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="note_ar">Note (Arabic)</Label>
                <Textarea
                  id="note_ar"
                  value={noteAr}
                  onChange={(e) => setNoteAr(e.target.value)}
                  placeholder="الوصف بالعربية..."
                  rows={2}
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="note_ku">Note (Kurdish)</Label>
                <Textarea
                  id="note_ku"
                  value={noteKu}
                  onChange={(e) => setNoteKu(e.target.value)}
                  placeholder="وەسف بە کوردی..."
                  rows={2}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLink}>
                {editMode ? 'Update Link' : 'Add Link'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
