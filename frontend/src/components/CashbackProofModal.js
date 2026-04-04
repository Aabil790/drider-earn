import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';

const CashbackProofModal = ({ clickId, productTitle, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    order_id: '',
    order_date: '',
    screenshot_url: '',
    review_link: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/cashback/submit-proof', {
        cashback_click_id: clickId,
        ...formData
      });
      toast.success('Order proof submitted successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="proof-submission-modal">
        <DialogHeader>
          <DialogTitle>Submit Order Proof</DialogTitle>
          <DialogDescription>
            Upload proof for: {productTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="order_id">Order ID *</Label>
            <Input
              id="order_id"
              name="order_id"
              placeholder="Enter order ID from purchase"
              value={formData.order_id}
              onChange={handleChange}
              required
              data-testid="order-id-input"
            />
          </div>
          <div>
            <Label htmlFor="order_date">Order Date *</Label>
            <Input
              id="order_date"
              name="order_date"
              type="date"
              value={formData.order_date}
              onChange={handleChange}
              required
              data-testid="order-date-input"
            />
          </div>
          <div>
            <Label htmlFor="screenshot_url">Screenshot URL *</Label>
            <Input
              id="screenshot_url"
              name="screenshot_url"
              type="url"
              placeholder="https://imgur.com/your-screenshot.png"
              value={formData.screenshot_url}
              onChange={handleChange}
              required
              data-testid="screenshot-url-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload screenshot to Imgur or similar service and paste the link
            </p>
          </div>
          <div>
            <Label htmlFor="review_link">Review Link (Optional)</Label>
            <Input
              id="review_link"
              name="review_link"
              type="url"
              placeholder="https://website.com/your-review"
              value={formData.review_link}
              onChange={handleChange}
              data-testid="review-link-input"
            />
          </div>
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional information..."
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              data-testid="notes-input"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
              disabled={submitting}
              data-testid="submit-proof-button"
            >
              {submitting ? 'Submitting...' : 'Submit Proof'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CashbackProofModal;
