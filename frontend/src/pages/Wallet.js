import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUpCircle, ArrowDownCircle, Wallet as WalletIcon } from 'lucide-react';
import { toast } from 'sonner';

const Wallet = () => {
  const { user, updateUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/wallet/transactions');
      setTransactions(response.data);
    } catch (error) {
      toast.error('Failed to load transactions');
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      await api.post('/wallet/withdraw', {
        amount: parseFloat(withdrawAmount),
        upi_id: upiId
      });
      toast.success('Withdrawal request submitted!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setUpiId('');
      
      const newBalance = user.wallet_balance - parseFloat(withdrawAmount);
      updateUser({ wallet_balance: newBalance });
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" data-testid="wallet-page">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">My Wallet</h1>
          <p className="text-gray-600">Manage your earnings and withdrawals</p>
        </div>

        <Card className="mb-8 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border-0">
          <CardHeader>
            <CardDescription className="text-black/80">Available Balance</CardDescription>
            <CardTitle className="text-4xl font-bold text-white" data-testid="wallet-balance-display">
              ₹{user.wallet_balance.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowWithdrawModal(true)}
              className="bg-white text-yellow-600 hover:bg-gray-100 font-semibold"
              disabled={user.wallet_balance < 100}
              data-testid="withdraw-button"
            >
              Withdraw Money
            </Button>
            {user.wallet_balance < 100 && (
              <p className="text-xs text-black/70 mt-2">Minimum withdrawal amount is ₹100</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No transactions yet</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    data-testid={`transaction-${txn.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {txn.type === 'earning' ? (
                        <ArrowDownCircle className="h-8 w-8 text-green-600" />
                      ) : (
                        <ArrowUpCircle className="h-8 w-8 text-red-600" />
                      )}
                      <div>
                        <p className="font-semibold">{txn.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(txn.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${
                      txn.type === 'earning' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.type === 'earning' ? '+' : '-'}₹{txn.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
          <DialogContent data-testid="withdraw-modal">
            <DialogHeader>
              <DialogTitle>Withdraw Money</DialogTitle>
              <DialogDescription>
                Enter withdrawal details. Minimum amount is ₹100
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="100"
                  max={user.wallet_balance}
                  required
                  data-testid="withdraw-amount-input"
                />
              </div>
              <div>
                <Label htmlFor="upi">UPI ID</Label>
                <Input
                  id="upi"
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  required
                  data-testid="withdraw-upi-input"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                data-testid="withdraw-submit-button"
              >
                Submit Withdrawal Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Wallet;
