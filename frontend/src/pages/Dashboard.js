import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, Video, Gift, ShoppingBag, Users, TrendingUp, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_referrals: 0,
    total_earnings: 0,
  });
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user.is_paid) {
      setShowMembershipModal(true);
      fetchPlans();
    } else {
      fetchReferralStats();
      fetchWhatsappLink();
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/membership/plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Failed to fetch plans');
    }
  };

  const fetchReferralStats = async () => {
    try {
      const response = await api.get('/referrals/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchWhatsappLink = async () => {
    try {
      const response = await api.get('/settings/whatsapp');
      setWhatsappLink(response.data.whatsapp_group_link);
    } catch (error) {
      console.error('Failed to fetch WhatsApp link');
    }
  };

  const handlePayment = async (plan) => {
    try {
      const orderResponse = await api.post('/membership/create-order', { plan: plan.id });
      
      const options = {
        key: orderResponse.data.razorpay_key_id,
        amount: orderResponse.data.amount,
        currency: orderResponse.data.currency,
        order_id: orderResponse.data.order_id,
        name: 'Drider',
        description: `${plan.name} Membership`,
        handler: async (response) => {
          try {
            await api.post('/membership/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: plan.id,
            });
            
            updateUser({ is_paid: true, membership_plan: plan.id });
            toast.success('Membership activated successfully!');
            setShowMembershipModal(false);
            fetchReferralStats();
            fetchWhatsappLink();
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#F59E0B',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error('Failed to create payment order');
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/signup?ref=${user.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (!user.is_paid) {
    return (
      <Dialog open={showMembershipModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-3xl" data-testid="membership-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl">Choose Your Membership Plan</DialogTitle>
            <DialogDescription>
              Select a plan to unlock all features and start earning
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {plans.map((plan) => (
              <Card key={plan.id} className={selectedPlan?.id === plan.id ? 'border-yellow-500 border-2' : ''}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-yellow-600">₹{plan.price}</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handlePayment(plan)}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                    data-testid={`pay-${plan.id}-button`}
                  >
                    Pay ₹{plan.price}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600">Here's your earning overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Wallet Balance</CardTitle>
              <Wallet className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900" data-testid="wallet-balance">
                ₹{user.wallet_balance.toFixed(2)}
              </div>
              <Link to="/wallet" className="text-sm text-yellow-600 hover:underline mt-2 inline-block">
                View transactions →
              </Link>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Referrals</CardTitle>
              <Users className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900" data-testid="total-referrals">
                {stats.total_referrals}
              </div>
              <p className="text-sm text-gray-500 mt-2">People you've referred</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Referral Earnings</CardTitle>
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900" data-testid="referral-earnings">
                ₹{stats.total_earnings.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 mt-2">From referrals</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border-0">
          <CardHeader>
            <CardTitle className="text-white">Your Referral Link</CardTitle>
            <CardDescription className="text-black/80">Share with friends and earn rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/signup?ref=${user.referral_code}`}
                className="flex-1 bg-white/90 border-0 rounded-lg px-4 py-2 text-gray-900"
                data-testid="referral-link-input"
              />
              <Button
                onClick={copyReferralLink}
                variant="secondary"
                className="bg-white/90 hover:bg-white text-black"
                data-testid="copy-referral-button"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {whatsappLink && (
          <Card className="mb-8 bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900">Join Our WhatsApp Community</CardTitle>
              <CardDescription>Connect with fellow earners and get exclusive updates</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.open(whatsappLink, '_blank')}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="whatsapp-join-button"
              >
                Join WhatsApp Group <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/training')}>
            <CardHeader>
              <Video className="h-8 w-8 text-yellow-600 mb-2" />
              <CardTitle>Training Videos</CardTitle>
              <CardDescription>Learn earning strategies</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/cashback')}>
            <CardHeader>
              <Gift className="h-8 w-8 text-yellow-600 mb-2" />
              <CardTitle>Cashback Products</CardTitle>
              <CardDescription>Earn on purchases</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/store')}>
            <CardHeader>
              <ShoppingBag className="h-8 w-8 text-yellow-600 mb-2" />
              <CardTitle>E-commerce Store</CardTitle>
              <CardDescription>Shop exclusive products</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/wallet')}>
            <CardHeader>
              <Wallet className="h-8 w-8 text-yellow-600 mb-2" />
              <CardTitle>My Wallet</CardTitle>
              <CardDescription>Manage your earnings</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </div>
  );
};

export default Dashboard;
