import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, DollarSign, Package, Video } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [cashbackClicks, setCashbackClicks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [whatsappLink, setWhatsappLink] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchStats();
    fetchUsers();
    fetchWithdrawals();
    fetchCashbackClicks();
    fetchCategories();
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await api.get('/admin/withdrawal-requests');
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Failed to fetch withdrawals');
    }
  };

  const fetchCashbackClicks = async () => {
    try {
      const response = await api.get('/admin/cashback-clicks');
      setCashbackClicks(response.data);
    } catch (error) {
      console.error('Failed to fetch cashback clicks');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/videos/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const approveWithdrawal = async (requestId) => {
    try {
      await api.put(`/admin/withdrawal-requests/${requestId}/approve`);
      toast.success('Withdrawal approved');
      fetchWithdrawals();
    } catch (error) {
      toast.error('Failed to approve withdrawal');
    }
  };

  const verifyCashback = async (clickId) => {
    try {
      await api.put(`/admin/cashback-clicks/${clickId}/verify`);
      toast.success('Cashback verified and paid');
      fetchCashbackClicks();
    } catch (error) {
      toast.error('Failed to verify cashback');
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.post('/admin/videos/category', {
        name: formData.get('categoryName'),
        description: formData.get('categoryDescription')
      });
      toast.success('Category created');
      e.target.reset();
      fetchCategories();
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const createVideo = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.post('/admin/videos', {
        category_id: formData.get('categoryId'),
        title: formData.get('videoTitle'),
        description: formData.get('videoDescription'),
        youtube_url: formData.get('youtubeUrl')
      });
      toast.success('Video added');
      e.target.reset();
    } catch (error) {
      toast.error('Failed to add video');
    }
  };

  const createCashbackProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.post('/admin/cashback-products', {
        title: formData.get('productTitle'),
        description: formData.get('productDescription'),
        product_link: formData.get('productLink'),
        price: parseFloat(formData.get('productPrice')),
        cashback_amount: parseFloat(formData.get('cashbackAmount')),
        refund_days: parseInt(formData.get('refundDays')),
        image: formData.get('productImage')
      });
      toast.success('Cashback product created');
      e.target.reset();
    } catch (error) {
      toast.error('Failed to create product');
    }
  };

  const createEcommerceProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.post('/admin/ecommerce-products', {
        name: formData.get('productName'),
        description: formData.get('productDesc'),
        price: parseFloat(formData.get('price')),
        stock: parseInt(formData.get('stock')),
        image: formData.get('image')
      });
      toast.success('Product created');
      e.target.reset();
    } catch (error) {
      toast.error('Failed to create product');
    }
  };

  const updateWhatsappLink = async (e) => {
    e.preventDefault();
    try {
      await api.put('/admin/settings', { whatsapp_group_link: whatsappLink });
      toast.success('WhatsApp link updated');
    } catch (error) {
      toast.error('Failed to update link');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage platform and users</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.paid_users || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
              <Package className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_withdrawals || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Cashback</CardTitle>
              <Video className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_cashback || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="cashback">Cashback Products</TabsTrigger>
            <TabsTrigger value="ecommerce">E-commerce Products</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="cashback-approval">Cashback Approval</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Mobile</th>
                        <th className="text-left p-2">Plan</th>
                        <th className="text-left p-2">Wallet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b">
                          <td className="p-2">{u.name}</td>
                          <td className="p-2">{u.email}</td>
                          <td className="p-2">{u.mobile}</td>
                          <td className="p-2">{u.membership_plan}</td>
                          <td className="p-2">₹{u.wallet_balance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createCategory} className="space-y-4">
                    <div>
                      <Label>Category Name</Label>
                      <Input name="categoryName" required />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea name="categoryDescription" />
                    </div>
                    <Button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-black">
                      Create Category
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add Video</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createVideo} className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <select name="categoryId" className="w-full border rounded-lg px-3 py-2" required>
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Video Title</Label>
                      <Input name="videoTitle" required />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea name="videoDescription" />
                    </div>
                    <div>
                      <Label>YouTube URL</Label>
                      <Input name="youtubeUrl" type="url" required />
                    </div>
                    <Button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-black">
                      Add Video
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cashback">
            <Card>
              <CardHeader>
                <CardTitle>Create Cashback Product</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createCashbackProduct} className="space-y-4 max-w-2xl">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Product Title</Label>
                      <Input name="productTitle" required />
                    </div>
                    <div>
                      <Label>Product Link</Label>
                      <Input name="productLink" type="url" required />
                    </div>
                    <div>
                      <Label>Price (₹)</Label>
                      <Input name="productPrice" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label>Cashback Amount (₹)</Label>
                      <Input name="cashbackAmount" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label>Refund Days</Label>
                      <Input name="refundDays" type="number" required />
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input name="productImage" type="url" />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea name="productDescription" />
                  </div>
                  <Button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-black">
                    Create Product
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ecommerce">
            <Card>
              <CardHeader>
                <CardTitle>Create E-commerce Product</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createEcommerceProduct} className="space-y-4 max-w-2xl">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Product Name</Label>
                      <Input name="productName" required />
                    </div>
                    <div>
                      <Label>Price (₹)</Label>
                      <Input name="price" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label>Stock</Label>
                      <Input name="stock" type="number" required />
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input name="image" type="url" />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea name="productDesc" />
                  </div>
                  <Button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-black">
                    Create Product
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {withdrawals.filter(w => w.status === 'pending').map((w) => (
                    <div key={w.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Amount: ₹{w.amount}</p>
                        <p className="text-sm text-gray-600">UPI: {w.upi_id}</p>
                        <p className="text-sm text-gray-600">User ID: {w.user_id}</p>
                      </div>
                      <Button
                        onClick={() => approveWithdrawal(w.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Approve
                      </Button>
                    </div>
                  ))}
                  {withdrawals.filter(w => w.status === 'pending').length === 0 && (
                    <p className="text-center text-gray-600 py-8">No pending withdrawals</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashback-approval">
            <Card>
              <CardHeader>
                <CardTitle>Cashback Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cashbackClicks.filter(c => c.verified === false).map((click) => (
                    <div key={click.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">User: {click.user_id}</p>
                        <p className="text-sm text-gray-600">Product: {click.product_id}</p>
                        <p className="text-sm text-gray-600">Clicked: {new Date(click.clicked_at).toLocaleDateString()}</p>
                      </div>
                      <Button
                        onClick={() => verifyCashback(click.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Verify & Pay
                      </Button>
                    </div>
                  ))}
                  {cashbackClicks.filter(c => c.verified === false).length === 0 && (
                    <p className="text-center text-gray-600 py-8">No pending cashback verifications</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={updateWhatsappLink} className="space-y-4 max-w-xl">
                  <div>
                    <Label>WhatsApp Group Link</Label>
                    <Input
                      value={whatsappLink}
                      onChange={(e) => setWhatsappLink(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      type="url"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This link will be shown to paid members
                    </p>
                  </div>
                  <Button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-black">
                    Update Settings
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
