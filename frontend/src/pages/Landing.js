import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Video, Gift, ShoppingBag, Wallet, Users, TrendingUp } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: <Video className="h-8 w-8 text-yellow-600" />,
      title: 'Video Training',
      description: 'Learn proven earning methods through expert video courses'
    },
    {
      icon: <Gift className="h-8 w-8 text-yellow-600" />,
      title: 'Cashback Rewards',
      description: 'Earn cashback on every product purchase from our partners'
    },
    {
      icon: <ShoppingBag className="h-8 w-8 text-yellow-600" />,
      title: 'E-commerce Store',
      description: 'Shop exclusive products directly from our platform'
    },
    {
      icon: <Users className="h-8 w-8 text-yellow-600" />,
      title: 'Referral Earnings',
      description: 'Invite friends and earn on every successful referral'
    },
    {
      icon: <Wallet className="h-8 w-8 text-yellow-600" />,
      title: 'Digital Wallet',
      description: 'Track your earnings and withdraw to UPI or Bank instantly'
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-yellow-600" />,
      title: 'Consistent Growth',
      description: 'Multiple income streams to maximize your earnings'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="landing-page">
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-10" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6" data-testid="hero-heading">
              Start Earning with <span className="text-yellow-600">Drider</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join India's fastest-growing earning and shopping platform. Learn, Shop, Earn & Refer.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {!user ? (
                <>
                  <Button
                    onClick={() => navigate('/signup')}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-8 py-6 text-lg rounded-xl"
                    data-testid="hero-signup-button"
                  >
                    Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => navigate('/login')}
                    variant="outline"
                    className="px-8 py-6 text-lg rounded-xl"
                    data-testid="hero-login-button"
                  >
                    Login
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-8 py-6 text-lg rounded-xl"
                  data-testid="hero-dashboard-button"
                >
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">10K+</div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">₹500K+</div>
                <div className="text-sm text-gray-600">Earnings Paid</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">50+</div>
                <div className="text-sm text-gray-600">Training Videos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">4.8/5</div>
                <div className="text-sm text-gray-600">User Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Three simple steps to start earning</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl border border-gray-200 bg-gray-50">
              <div className="bg-yellow-500 text-black w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold mb-2">Sign Up & Pay</h3>
              <p className="text-gray-600">
                Create your account and choose a membership plan (₹99 or ₹199) to unlock all features.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 bg-gray-50">
              <div className="bg-yellow-500 text-black w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold mb-2">Learn & Shop</h3>
              <p className="text-gray-600">
                Access training videos, shop products with cashback, and refer friends to multiply earnings.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 bg-gray-50">
              <div className="bg-yellow-500 text-black w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold mb-2">Earn & Withdraw</h3>
              <p className="text-gray-600">
                Track your wallet balance and withdraw your earnings directly to UPI or Bank account.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Platform Features</h2>
            <p className="text-lg text-gray-600">Everything you need to succeed</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                data-testid={`feature-card-${index}`}
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-yellow-400 to-yellow-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-6">
            Choose Your Membership Plan
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold mb-2">Basic Plan</h3>
              <div className="text-4xl font-bold text-yellow-600 mb-4">₹99</div>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Access to all training videos
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Cashback on products
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Referral earnings
                </li>
              </ul>
              {!user && (
                <Button
                  onClick={() => navigate('/signup')}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                  data-testid="basic-plan-button"
                >
                  Get Started
                </Button>
              )}
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border-4 border-yellow-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Premium Plan</h3>
              <div className="text-4xl font-bold text-yellow-600 mb-4">₹199</div>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  All Basic features
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Priority support
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Extra cashback rewards
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Exclusive products access
                </li>
              </ul>
              {!user && (
                <Button
                  onClick={() => navigate('/signup')}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                  data-testid="premium-plan-button"
                >
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Income?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of users who are already earning with Drider
          </p>
          {!user && (
            <Button
              onClick={() => navigate('/signup')}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-8 py-6 text-lg rounded-xl"
              data-testid="cta-button"
            >
              Start Earning Today <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

export default Landing;
