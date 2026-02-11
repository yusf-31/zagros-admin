import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FolderTree,
  Folder,
  Store,
  Package,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  Image as ImageIcon,
  Upload,
  X,
} from 'lucide-react';

const PRODUCT_IMAGES_MAX = 10;
const BULK_IMAGES_MAX = 100;
const BUCKET_PRODUCT_IMAGES = 'product-images';

interface Category {
  id: string;
  name: string;
  name_ar: string | null;
  name_ku: string | null;
  image_url: string | null;
}

interface Shop {
  id: string;
  category_id: string;
  name: string;
  name_ar: string | null;
  name_ku: string | null;
  image_url: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  shop_id: string | null;
  category_id: string | null;
}

export default function WholesaleManagement() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editShop, setEditShop] = useState<Shop | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [shopName, setShopName] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);
  const [productPreviewIndex, setProductPreviewIndex] = useState(0);
  const [productPasteUrl, setProductPasteUrl] = useState('');
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkName, setBulkName] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkUrlsText, setBulkUrlsText] = useState('');
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    fetchCategories();
    setLoading(false);
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    if (selectedCategory) {
      fetchShops(selectedCategory.id);
    } else {
      setShops([]);
      setSelectedShop(null);
      setProducts([]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedShop) {
      fetchProducts(selectedShop.id);
    } else {
      setProducts([]);
    }
  }, [selectedShop]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, name_ar, name_ku, image_url')
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  const fetchShops = async (categoryId: string) => {
    const { data } = await supabase
      .from('shops')
      .select('id, category_id, name, name_ar, name_ku, image_url')
      .eq('category_id', categoryId)
      .order('name');
    setShops(data || []);
  };

  const fetchProducts = async (shopId: string) => {
    const { data } = await supabase
      .from('wholesale_products')
      .select('id, name, price, image_url, shop_id, category_id')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .range(0, 9999);
    setProducts(data || []);
  };

  const handleSaveCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    setSaving(true);
    try {
      if (editCategory) {
        await supabase.from('product_categories').update({ name }).eq('id', editCategory.id);
      } else {
        await supabase.from('product_categories').insert([{ name }]);
      }
      setCategoryDialogOpen(false);
      setEditCategory(null);
      setCategoryName('');
      fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShop = async () => {
    const name = shopName.trim();
    if (!name || !selectedCategory) return;
    setSaving(true);
    try {
      if (editShop) {
        await supabase.from('shops').update({ name }).eq('id', editShop.id);
      } else {
        await supabase.from('shops').insert([{ name, category_id: selectedCategory.id }]);
      }
      setShopDialogOpen(false);
      setEditShop(null);
      setShopName('');
      fetchShops(selectedCategory.id);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async () => {
    const name = productName.trim() || (editProduct?.name ?? '');
    if (!name || !selectedShop) return;
    const categoryId = selectedShop.category_id || selectedCategory?.id || null;
    const urls = productImageUrls.map((u) => u.trim()).filter(Boolean);
    const previewUrl = urls[productPreviewIndex] ?? urls[0] ?? null;
    setSaving(true);
    try {
      const price = productPrice.trim() ? parseFloat(productPrice) : null;
      const payload: Record<string, unknown> = {
        name,
        price,
        image_url: previewUrl,
        shop_id: selectedShop.id,
        category_id: categoryId,
      };
      let productId: string;
      if (editProduct) {
        productId = editProduct.id;
        const { error: updateErr } = await supabase.from('wholesale_products').update(payload).eq('id', productId);
        if (updateErr) throw new Error(updateErr.message);
        await supabase.from('product_images').delete().eq('product_id', productId);
      } else {
        const { data: inserted, error: insertErr } = await supabase.from('wholesale_products').insert([payload]).select('id').single();
        if (insertErr) throw new Error(insertErr.message);
        productId = inserted?.id;
        if (!productId) throw new Error('Product was not created. Check that the wholesale_products table and RLS allow inserts.');
      }
      if (urls.length > 0) {
        const { error: imgErr } = await supabase.from('product_images').insert(
          urls.slice(0, PRODUCT_IMAGES_MAX).map((image_url, i) => ({
            product_id: productId,
            image_url,
            display_order: i,
          }))
        );
        if (imgErr) {
          console.warn('product_images insert failed (product was saved with first image):', imgErr);
          // Product already has image_url; optional: show a short message
        }
      }
      setProductDialogOpen(false);
      setEditProduct(null);
      setProductName('');
      setProductPrice('');
      setProductImageUrls([]);
      setProductPasteUrl('');
      if (selectedShop) fetchProducts(selectedShop.id);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to save';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? All shops and products inside will be deleted.`)) return;
    await supabase.from('product_categories').delete().eq('id', cat.id);
    fetchCategories();
    if (selectedCategory?.id === cat.id) {
      setSelectedCategory(null);
      setSelectedShop(null);
    }
  };

  const handleDeleteShop = async (shop: Shop) => {
    if (!confirm(`Delete shop "${shop.name}"? All products inside will be deleted.`)) return;
    await supabase.from('shops').delete().eq('id', shop.id);
    if (selectedCategory) fetchShops(selectedCategory.id);
    if (selectedShop?.id === shop.id) setSelectedShop(null);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Delete product "${product.name}"?`)) return;
    await supabase.from('wholesale_products').delete().eq('id', product.id);
    if (selectedShop) fetchProducts(selectedShop.id);
  };

  const openCategoryDialog = (cat?: Category) => {
    setEditCategory(cat || null);
    setCategoryName(cat?.name ?? '');
    setCategoryDialogOpen(true);
  };

  const openShopDialog = (shop?: Shop) => {
    setEditShop(shop || null);
    setShopName(shop?.name ?? '');
    setShopDialogOpen(true);
  };

  const openProductDialog = async (product?: Product) => {
    setEditProduct(product || null);
    setProductName(product?.name ?? '');
    setProductPrice(product?.price != null ? String(product.price) : '');
    if (product?.id) {
      try {
        const { data: images } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', product.id)
          .order('display_order');
        const urls = (images || []).map((r) => r.image_url);
        const list = urls.length > 0 ? urls : product.image_url ? [product.image_url] : [];
        setProductImageUrls(list);
        const previewIdx = product.image_url ? list.indexOf(product.image_url) : 0;
        setProductPreviewIndex(previewIdx >= 0 ? previewIdx : 0);
      } catch {
        setProductImageUrls(product.image_url ? [product.image_url] : []);
        setProductPreviewIndex(0);
      }
    } else {
      setProductImageUrls([]);
      setProductPreviewIndex(0);
    }
    setProductPasteUrl('');
    setProductDialogOpen(true);
  };

  const handleProductImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, PRODUCT_IMAGES_MAX - productImageUrls.length);
    if (files.length === 0) return;
    setProductImageUploading(true);
    try {
      const shopId = selectedShop?.id || 'temp';
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `products/${shopId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET_PRODUCT_IMAGES).upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET_PRODUCT_IMAGES).getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      setProductImageUrls((p) => [...p, ...urls].slice(0, PRODUCT_IMAGES_MAX));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProductImageUploading(false);
      if (productFileInputRef.current) productFileInputRef.current.value = '';
    }
  };

  const openBulkDialog = () => {
    setBulkName('');
    setBulkPrice('');
    setBulkUrlsText('');
    setBulkFiles([]);
    setBulkProgress('');
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    setBulkDialogOpen(true);
  };

  const handleBulkSave = async () => {
    const name = bulkName.trim();
    if (!name || !selectedShop || !selectedCategory) {
      alert('Enter product name.');
      return;
    }
    const price = bulkPrice.trim() ? parseFloat(bulkPrice) : null;
    const urlsFromText = bulkUrlsText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    setBulkSaving(true);
    setBulkProgress('Preparing…');
    try {
      const uploadedUrls: string[] = [];
      if (bulkFiles.length > 0) {
        const toUpload = bulkFiles.slice(0, BULK_IMAGES_MAX - urlsFromText.length);
        for (let i = 0; i < toUpload.length; i++) {
          setBulkProgress(`Uploading image ${i + 1}/${toUpload.length}…`);
          const file = toUpload[i];
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `bulk/${selectedShop!.id}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from(BUCKET_PRODUCT_IMAGES).upload(path, file, { upsert: false });
          if (error) throw error;
          const { data } = supabase.storage.from(BUCKET_PRODUCT_IMAGES).getPublicUrl(path);
          uploadedUrls.push(data.publicUrl);
        }
      }
      const allUrls = [...urlsFromText, ...uploadedUrls].slice(0, BULK_IMAGES_MAX);
      if (allUrls.length === 0) {
        alert('Add at least one image: paste URLs (one per line) or upload files.');
        setBulkSaving(false);
        return;
      }
      setBulkProgress(`Creating ${allUrls.length} products…`);
      for (let i = 0; i < allUrls.length; i++) {
        await supabase.from('wholesale_products').insert([
          {
            name,
            price,
            image_url: allUrls[i],
            shop_id: selectedShop!.id,
            category_id: selectedShop!.category_id || null,
          },
        ]);
        if (i % 10 === 0) setBulkProgress(`Created ${i + 1}/${allUrls.length} products…`);
      }
      setBulkDialogOpen(false);
      setBulkName('');
      setBulkPrice('');
      setBulkUrlsText('');
      setBulkFiles([]);
      if (selectedShop) fetchProducts(selectedShop.id);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Bulk add failed');
    } finally {
      setBulkSaving(false);
      setBulkProgress('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user || !isAdmin) return null;

  const breadcrumb = (
    <nav className="flex items-center gap-2 text-sm flex-wrap">
      <button
        type="button"
        onClick={() => { setSelectedCategory(null); setSelectedShop(null); }}
        className="text-blue-600 hover:underline font-medium"
      >
        All categories
      </button>
      {selectedCategory && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button
            type="button"
            onClick={() => setSelectedShop(null)}
            className="text-blue-600 hover:underline font-medium"
          >
            {selectedCategory.name}
          </button>
        </>
      )}
      {selectedShop && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium">{selectedShop.name}</span>
        </>
      )}
    </nav>
  );

  const currentLevel = !selectedCategory
    ? 'Categories'
    : !selectedShop
      ? `Shops in ${selectedCategory.name}`
      : `Products in ${selectedShop.name}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Wholesale</h1>
              <p className="text-sm text-gray-500 mt-0.5">{currentLevel}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">Dashboard</Button>
              <Button onClick={() => navigate('/wholesale-access')} variant="outline" size="sm">Passwords</Button>
              <span className="text-sm text-gray-600">{user?.email}</span>
              <Button onClick={handleSignOut} variant="outline" size="sm">Sign Out</Button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            {breadcrumb}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : !selectedCategory ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Categories
                </CardTitle>
                <CardDescription>Create a category here. Then open it to add shops inside. All wholesale content is organized by category.</CardDescription>
              </div>
              <Button onClick={() => openCategoryDialog()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create category
              </Button>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="py-8 text-center text-gray-500 border border-dashed rounded-lg">
                  <FolderTree className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="font-medium">No categories yet</p>
                  <p className="text-sm mt-1">Create your first category to add shops and products.</p>
                  <Button onClick={() => openCategoryDialog()} className="mt-4">Create category</Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between rounded-lg border p-4 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FolderTree className="w-5 h-5 text-amber-500" />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => setSelectedCategory(cat)} className="bg-blue-600 hover:bg-blue-700">
                          Open
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openCategoryDialog(cat)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteCategory(cat)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : !selectedShop ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Shops inside “{selectedCategory.name}”
                </CardTitle>
                <CardDescription>Add shops to this category. Open a shop to upload and manage products inside it.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)}>Back to categories</Button>
                <Button onClick={() => openShopDialog()} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add shop
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {shops.length === 0 ? (
                <div className="py-8 text-center text-gray-500 border border-dashed rounded-lg">
                  <Store className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="font-medium">No shops in this category</p>
                  <p className="text-sm mt-1">Add a shop to start adding products.</p>
                  <Button onClick={() => openShopDialog()} className="mt-4">Add shop</Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {shops.map((shop) => (
                    <li
                      key={shop.id}
                      className="flex items-center justify-between rounded-lg border p-4 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-blue-500" />
                        <span className="font-medium">{shop.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => setSelectedShop(shop)} className="bg-blue-600 hover:bg-blue-700">
                          Open
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openShopDialog(shop)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteShop(shop)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Products inside “{selectedShop.name}”
                </CardTitle>
                <CardDescription>Upload and manage products in this shop. They appear in the app under {selectedCategory.name} → {selectedShop.name}.</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setSelectedShop(null)}>Back to shops</Button>
                <Button onClick={() => openProductDialog()} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add product
                </Button>
                <Button onClick={openBulkDialog} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
                  <Upload className="w-4 h-4 mr-2" />
                  Add bulk
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="py-8 text-center text-gray-500 border border-dashed rounded-lg">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="font-medium">No products in this shop</p>
                  <p className="text-sm mt-1">Add a product or use bulk add for many at once.</p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button onClick={() => openProductDialog()}>Add product</Button>
                    <Button onClick={openBulkDialog} variant="outline">Add bulk</Button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {products.map((product) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between rounded-lg border p-4 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium">{product.name}</span>
                          {product.price != null && (
                            <span className="ml-2 text-sm text-green-600">${product.price}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openProductDialog(product)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteProduct(product)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Category dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCategory ? 'Edit category' : 'Add category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Category name</Label>
              <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. Electronics" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveCategory} disabled={saving || !categoryName.trim()}>
                {saving ? 'Saving…' : editCategory ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shop dialog */}
      <Dialog open={shopDialogOpen} onOpenChange={setShopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editShop ? 'Edit shop' : 'Add shop'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Shop name</Label>
              <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Shop A" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShopDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveShop} disabled={saving || !shopName.trim()}>
                {saving ? 'Saving…' : editShop ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product dialog (up to 10 images) */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Edit product' : 'Add product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Product name</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" />
            </div>
            <div>
              <Label>Price (optional)</Label>
              <Input type="number" step="0.01" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Images (up to {PRODUCT_IMAGES_MAX})</Label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">Upload from your computer or paste a URL below.</p>
              {productImageUrls.length < PRODUCT_IMAGES_MAX && (
                <div className="mb-3">
                  <input
                    ref={productFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleProductImageFiles}
                    disabled={productImageUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => productFileInputRef.current?.click()}
                    disabled={productImageUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {productImageUploading ? 'Uploading…' : 'Upload from computer'}
                  </Button>
                </div>
              )}
              {productImageUrls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">Uploaded / added images ({productImageUrls.length}). Choose one as preview for the app.</p>
                  <div className="flex flex-wrap gap-2">
                    {productImageUrls.map((url, i) => (
                      <div key={i} className="relative group flex flex-col items-center">
                        <div className="relative">
                          <img src={url} alt="" className="w-16 h-16 rounded object-cover border" />
                          {productPreviewIndex === i && (
                            <span className="absolute bottom-0 left-0 right-0 text-[10px] font-medium bg-green-600 text-white text-center rounded-b py-0.5">Preview</span>
                          )}
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 group-hover:opacity-100"
                            onClick={() => {
                              setProductImageUrls((p) => p.filter((_, j) => j !== i));
                              setProductPreviewIndex((prev) => {
                                if (i < prev) return Math.max(0, prev - 1);
                                if (i === prev) return Math.min(prev, Math.max(0, productImageUrls.length - 2));
                                return prev;
                              });
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="mt-1 text-[10px] text-blue-600 hover:underline disabled:opacity-50"
                          disabled={productPreviewIndex === i}
                          onClick={() => setProductPreviewIndex(i)}
                        >
                          {productPreviewIndex === i ? 'Preview' : 'Set as preview'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {productImageUrls.length < PRODUCT_IMAGES_MAX && (
                <div className="mt-2">
                  <Label className="text-xs">Or paste image URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={productPasteUrl}
                      onChange={(e) => setProductPasteUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = productPasteUrl.trim();
                          if (v) {
                            setProductImageUrls((p) => [...p, v].slice(0, PRODUCT_IMAGES_MAX));
                            setProductPasteUrl('');
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const v = productPasteUrl.trim();
                        if (v) {
                          setProductImageUrls((p) => [...p, v].slice(0, PRODUCT_IMAGES_MAX));
                          setProductPasteUrl('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveProduct} disabled={saving || !productName.trim()}>
                {saving ? 'Saving…' : editProduct ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk add dialog (up to 100 images → same name & price) */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add bulk products</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600">
              One product per image (up to {BULK_IMAGES_MAX}). All products will have the same name and price.
            </p>
            <div>
              <Label>Product name (same for all)</Label>
              <Input value={bulkName} onChange={(e) => setBulkName(e.target.value)} placeholder="e.g. Model X" />
            </div>
            <div>
              <Label>Price (optional, same for all)</Label>
              <Input type="number" step="0.01" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Upload images from your computer (max {BULK_IMAGES_MAX})</Label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">Select multiple image files. One product will be created per image.</p>
              <input
                ref={bulkFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="mt-1 block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => setBulkFiles(Array.from(e.target.files || []).slice(0, BULK_IMAGES_MAX))}
              />
              {bulkFiles.length > 0 && (
                <p className="text-sm text-green-600 mt-2">{bulkFiles.length} file(s) selected. Click &quot;Add bulk&quot; to upload and create products.</p>
              )}
            </div>
            <div>
              <Label className="text-gray-500">Or paste image URLs (one per line)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm mt-1"
                value={bulkUrlsText}
                onChange={(e) => setBulkUrlsText(e.target.value)}
                placeholder="Optional: paste one URL per line"
              />
            </div>
            {bulkProgress && <p className="text-sm text-blue-600">{bulkProgress}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={bulkSaving}>Cancel</Button>
              <Button onClick={handleBulkSave} disabled={bulkSaving || !bulkName.trim()}>
                {bulkSaving ? 'Adding…' : 'Add bulk'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
