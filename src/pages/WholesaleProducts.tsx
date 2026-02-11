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
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Edit, Trash2, DollarSign, Image as ImageIcon } from 'lucide-react';

interface WholesaleProduct {
  id: string;
  name_en: string;
  name_ar: string | null;
  name_ku: string | null;
  description_en: string | null;
  description_ar: string | null;
  description_ku: string | null;
  price: number;
  stock_quantity: number | null;
  category_id: string | null;
  shop_id: string | null;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  product_categories?: {
    name: string;
  };
  shops?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface Shop {
  id: string;
  name: string;
}

export default function WholesaleProducts() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<WholesaleProduct | null>(null);

  // Form states
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameKu, setNameKu] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descKu, setDescKu] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shopId, setShopId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    
    fetchData();
    
    const subscription = supabase
      .channel('wholesale_products_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wholesale_products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, isAdmin, navigate]);

  const fetchData = async () => {
    await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchShops(),
    ]);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('wholesale_products')
      .select(`
        *,
        product_categories (name),
        shops (name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('product_categories')
      .select('id, name')
      .order('name');
    
    if (data) setCategories(data);
  };

  const fetchShops = async () => {
    const { data } = await supabase
      .from('shops')
      .select('id, name')
      .order('name');
    
    if (data) setShops(data);
  };

  const handleOpenDialog = (product?: WholesaleProduct) => {
    if (product) {
      setEditMode(true);
      setSelectedProduct(product);
      setNameEn(product.name_en);
      setNameAr(product.name_ar || '');
      setNameKu(product.name_ku || '');
      setDescEn(product.description_en || '');
      setDescAr(product.description_ar || '');
      setDescKu(product.description_ku || '');
      setPrice(product.price.toString());
      setStock(product.stock_quantity?.toString() || '');
      setCategoryId(product.category_id || '');
      setShopId(product.shop_id || '');
      setIsActive(product.is_active);
      setImageUrl(product.image_url || '');
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
    setDescEn('');
    setDescAr('');
    setDescKu('');
    setPrice('');
    setStock('');
    setCategoryId('');
    setShopId('');
    setIsActive(true);
    setImageUrl('');
    setSelectedProduct(null);
  };

  const handleSaveProduct = async () => {
    const productData = {
      name_en: nameEn,
      name_ar: nameAr || null,
      name_ku: nameKu || null,
      description_en: descEn || null,
      description_ar: descAr || null,
      description_ku: descKu || null,
      price: parseFloat(price),
      stock_quantity: stock ? parseInt(stock) : null,
      category_id: categoryId || null,
      shop_id: shopId || null,
      is_active: isActive,
      image_url: imageUrl || null,
    };

    if (editMode && selectedProduct) {
      const { error } = await supabase
        .from('wholesale_products')
        .update(productData)
        .eq('id', selectedProduct.id);

      if (!error) {
        setDialogOpen(false);
        fetchProducts();
      }
    } else {
      const { error } = await supabase
        .from('wholesale_products')
        .insert([productData]);

      if (!error) {
        setDialogOpen(false);
        resetForm();
        fetchProducts();
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      const { error } = await supabase
        .from('wholesale_products')
        .delete()
        .eq('id', productId);

      if (!error) {
        fetchProducts();
      }
    }
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
            <p className="text-sm text-gray-600">Wholesale Products Management</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
              Dashboard
            </Button>
            <Button onClick={() => navigate('/wholesale-management')} variant="outline" size="sm">
              Wholesale (Categories)
            </Button>
            <Button onClick={() => navigate('/wholesale-access')} variant="outline" size="sm">
              Wholesale Access
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
        {/* Stats & Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 mr-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{products.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {products.filter(p => p.is_active).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Inactive</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">
                  {products.filter(p => !p.is_active).length}
                </p>
              </CardContent>
            </Card>
          </div>
          <Button onClick={() => handleOpenDialog()} className="h-12">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name_en}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge className={product.is_active ? 'bg-green-500' : 'bg-red-500'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{product.name_en}</h3>
                {product.description_en && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description_en}</p>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-green-600">
                    ${product.price}
                  </span>
                  {product.stock_quantity !== null && (
                    <span className="text-sm text-gray-600">
                      Stock: {product.stock_quantity}
                    </span>
                  )}
                </div>
                {product.product_categories && (
                  <div className="text-xs text-gray-500 mb-3">
                    Category: {product.product_categories.name}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleOpenDialog(product)}
                    className="flex-1"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    onClick={() => handleDeleteProduct(product.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No wholesale products yet</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Product
            </Button>
          </div>
        )}
      </main>

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* English Fields */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">English</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name_en">Product Name *</Label>
                  <Input
                    id="name_en"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Enter product name in English"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="desc_en">Description</Label>
                  <Textarea
                    id="desc_en"
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder="Enter description in English"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Arabic Fields */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Arabic (اللغة العربية)</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name_ar">اسم المنتج</Label>
                  <Input
                    id="name_ar"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="أدخل اسم المنتج بالعربية"
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="desc_ar">الوصف</Label>
                  <Textarea
                    id="desc_ar"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    placeholder="أدخل الوصف بالعربية"
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            {/* Kurdish Fields */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Kurdish (کوردی)</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name_ku">ناوی کاڵا</Label>
                  <Input
                    id="name_ku"
                    value={nameKu}
                    onChange={(e) => setNameKu(e.target.value)}
                    placeholder="ناوی کاڵا بە کوردی بنووسە"
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="desc_ku">وەسف</Label>
                  <Textarea
                    id="desc_ku"
                    value={descKu}
                    onChange={(e) => setDescKu(e.target.value)}
                    placeholder="وەسفی کاڵا بە کوردی بنووسە"
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (USD) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="shop">Shop/Supplier</Label>
                <select
                  id="shop"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select shop...</option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the URL of the product image
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="active" className="font-normal cursor-pointer">
                Product is active (visible to customers)
              </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProduct}>
                {editMode ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
