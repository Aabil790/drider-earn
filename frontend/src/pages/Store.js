import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const Store = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!user?.is_paid) {
      toast.error('Membership required');
      navigate('/dashboard');
      return;
    }
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/ecommerce/products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const handleBuyNow = async (productId) => {
    try {
      await api.post('/ecommerce/orders', {
        product_id: productId,
        quantity: 1
      });
      toast.success('Order placed successfully!');
      navigate('/orders');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" data-testid="store-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">E-commerce Store</h1>
          <p className="text-gray-600">Shop exclusive products</p>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No products available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow product-card" data-testid={`store-product-${product.id}`}>
                <CardHeader className="p-0">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-xl"
                    />
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2">{product.name}</CardTitle>
                  <CardDescription className="mb-4">{product.description}</CardDescription>
                  <div className="mb-2">
                    {product.original_price ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl font-bold text-yellow-600">₹{product.price}</span>
                          <span className="text-sm text-gray-400 line-through">₹{product.original_price}</span>
                        </div>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                          {product.discount_percent}% Premium Discount
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-yellow-600">₹{product.price}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{product.stock} in stock</div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleBuyNow(product.id)}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                    disabled={product.stock === 0}
                    data-testid={`buy-now-${product.id}`}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {product.stock > 0 ? 'Buy Now' : 'Out of Stock'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Store;
