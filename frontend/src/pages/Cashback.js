import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const Cashback = () => {
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
      const response = await api.get('/cashback-products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const handleProductClick = async (productId) => {
    try {
      const response = await api.post(`/cashback-products/${productId}/click`);
      window.open(response.data.product_link, '_blank');
      toast.success('Product link tracked. Complete purchase to earn cashback!');
    } catch (error) {
      toast.error('Failed to track click');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" data-testid="cashback-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Cashback Products</h1>
          <p className="text-gray-600">Shop and earn cashback on every purchase</p>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No cashback products available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow product-card" data-testid={`cashback-product-${product.id}`}>
                <CardHeader className="p-0">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-48 object-cover rounded-t-xl"
                    />
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2">{product.title}</CardTitle>
                  <CardDescription className="mb-4">{product.description}</CardDescription>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold">₹{product.price}</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                      ₹{product.cashback_amount} Cashback
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Cashback in {product.refund_days} days
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleProductClick(product.id)}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                    data-testid={`buy-product-${product.id}`}
                  >
                    Shop Now <ExternalLink className="ml-2 h-4 w-4" />
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

export default Cashback;
