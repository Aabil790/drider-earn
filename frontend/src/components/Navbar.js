import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Bell, Wallet, LogOut, Menu, X, User } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.slice(0, 5));
      setUnreadCount(response.data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read');
    }
  };

  return (
    <header className="backdrop-blur-xl bg-white/90 border-b border-gray-100 sticky top-0 z-50" data-testid="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center" data-testid="logo-link">
            <img 
              src="https://customer-assets.emergentagent.com/job_drider-earn/artifacts/ryu8mebh_1000822994.png" 
              alt="Drider Logo" 
              className="h-10"
            />
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/dashboard" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors" data-testid="nav-dashboard">
                Dashboard
              </Link>
              <Link to="/training" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors" data-testid="nav-training">
                Training
              </Link>
              <Link to="/cashback" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors" data-testid="nav-cashback">
                Cashback
              </Link>
              <Link to="/cashback-history" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors" data-testid="nav-cashback-history">
                History
              </Link>
              <Link to="/store" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors" data-testid="nav-store">
                Store
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors" data-testid="nav-admin">
                  Admin
                </Link>
              )}
            </nav>
          )}

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-4">
                  <Link to="/wallet" data-testid="wallet-button">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      ₹{user.wallet_balance.toFixed(2)}
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="relative" data-testid="notifications-button">
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <div className="p-2">
                        <h3 className="font-semibold mb-2">Notifications</h3>
                        {notifications.length === 0 ? (
                          <p className="text-sm text-gray-500">No notifications</p>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-2 rounded-lg mb-2 cursor-pointer ${!notif.read ? 'bg-yellow-50' : 'bg-gray-50'}`}
                              onClick={() => markAsRead(notif.id)}
                              data-testid={`notification-${notif.id}`}
                            >
                              <p className="font-semibold text-sm">{notif.title}</p>
                              <p className="text-xs text-gray-600">{notif.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" data-testid="user-menu-button">
                        <User className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate('/dashboard')} data-testid="menu-dashboard">
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/wallet')} data-testid="menu-wallet">
                        Wallet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/orders')} data-testid="menu-orders">
                        My Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  data-testid="mobile-menu-toggle"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/login')} data-testid="login-button">
                  Login
                </Button>
                <Button onClick={() => navigate('/signup')} className="bg-yellow-500 hover:bg-yellow-400 text-black" data-testid="signup-button">
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>

        {mobileMenuOpen && user && (
          <div className="md:hidden py-4 border-t border-gray-100" data-testid="mobile-menu">
            <nav className="flex flex-col gap-4">
              <Link to="/dashboard" className="text-gray-700 hover:text-yellow-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </Link>
              <Link to="/training" className="text-gray-700 hover:text-yellow-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Training
              </Link>
              <Link to="/cashback" className="text-gray-700 hover:text-yellow-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Cashback
              </Link>
              <Link to="/store" className="text-gray-700 hover:text-yellow-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Store
              </Link>
              <Link to="/wallet" className="text-gray-700 hover:text-yellow-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Wallet: ₹{user.wallet_balance.toFixed(2)}
              </Link>
              <Link to="/orders" className="text-gray-700 hover:text-yellow-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
                My Orders
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-gray-700 hover:text-yellow-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="text-left text-red-600 hover:text-red-700 font-medium">
                Logout
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
