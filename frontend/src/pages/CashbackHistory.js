import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import CashbackProofModal from '@/components/CashbackProofModal';

const CashbackHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedClick, setSelectedClick] = useState(null);

  useEffect(() => {
    if (!user?.is_paid) {
      toast.error('Membership required');
      navigate('/dashboard');
      return;
    }
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      const response = await api.get('/cashback/history');
      setHistory(response.data);
    } catch (error) {
      toast.error('Failed to load history');
    }
  };

  const handleSubmitProof = (click) => {
    setSelectedClick(click);
    setShowProofModal(true);
  };

  const getStatusBadge = (click) => {
    if (click.cashback_paid) {
      return <Badge className="bg-green-600">Cashback Paid</Badge>;
    }
    if (!click.proof_submitted) {
      return <Badge variant="outline">Pending Proof</Badge>;
    }
    
    const status = click.proof_status;
    if (status === 'pending_review') {
      return <Badge className="bg-yellow-600">Under Review</Badge>;
    } else if (status === 'review_completed') {
      return <Badge className="bg-blue-600">Review Verified</Badge>;
    } else if (status === 'review_live') {
      return <Badge className="bg-purple-600">Review Live</Badge>;
    } else if (status === 'approved') {
      return <Badge className="bg-green-600">Approved</Badge>;
    }
    
    return <Badge variant="outline">Pending</Badge>;
  };

  const getProgressSteps = (click) => {
    if (!click.proof_submitted) {
      return [
        { label: 'Submit Proof', completed: false, current: true },
        { label: 'Review Verification', completed: false, current: false },
        { label: 'Review Live', completed: false, current: false },
        { label: 'Cashback Processed', completed: false, current: false }
      ];
    }

    const status = click.proof_status;
    return [
      { label: 'Proof Submitted', completed: true, current: false },
      { label: 'Review Verification', completed: status !== 'pending_review', current: status === 'pending_review' },
      { label: 'Review Live', completed: status === 'review_live' || status === 'approved' || click.cashback_paid, current: status === 'review_completed' },
      { label: 'Cashback Processed', completed: click.cashback_paid, current: status === 'approved' && !click.cashback_paid }
    ];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" data-testid="cashback-history-page">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Cashback History</h1>
          <p className="text-gray-600">Track your cashback orders and proofs</p>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No cashback orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((click) => (
              <Card key={click.id} data-testid={`cashback-item-${click.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{click.product_title}</CardTitle>
                      <CardDescription>
                        Clicked on {new Date(click.clicked_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(click)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Cashback Amount:</span>
                      <span className="text-lg font-bold text-yellow-600">
                        ₹{click.cashback_amount}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Refund Timeline: {click.refund_days} days after verification
                    </div>
                  </div>

                  {/* Progress Tracker */}
                  <div className="mb-6">
                    <p className="text-sm font-semibold mb-3">Progress:</p>
                    <div className="space-y-2">
                      {getProgressSteps(click).map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            step.completed ? 'bg-green-600 text-white' :
                            step.current ? 'bg-yellow-500 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {step.completed ? '✓' : step.current ? <Clock className="h-4 w-4" /> : idx + 1}
                          </div>
                          <span className={`text-sm ${
                            step.completed ? 'text-green-600 font-semibold' :
                            step.current ? 'text-yellow-600 font-semibold' :
                            'text-gray-500'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {click.proof_submitted && click.order_id && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <p className="text-sm font-semibold mb-1">Order ID:</p>
                      <p className="text-sm text-gray-700">{click.order_id}</p>
                    </div>
                  )}

                  {!click.proof_submitted && !click.cashback_paid && (
                    <Button
                      onClick={() => handleSubmitProof(click)}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                      data-testid={`submit-proof-btn-${click.id}`}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Order Proof
                    </Button>
                  )}

                  {click.cashback_paid && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-800 font-semibold">
                        Cashback of ₹{click.cashback_amount} has been credited to your wallet!
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedClick && (
        <CashbackProofModal
          clickId={selectedClick.id}
          productTitle={selectedClick.product_title}
          isOpen={showProofModal}
          onClose={() => {
            setShowProofModal(false);
            setSelectedClick(null);
          }}
          onSuccess={fetchHistory}
        />
      )}
    </div>
  );
};

export default CashbackHistory;
