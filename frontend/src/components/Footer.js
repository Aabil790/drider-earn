import React from 'react';
import { Mail, Phone } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12" data-testid="main-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img 
              src="https://customer-assets.emergentagent.com/job_drider-earn/artifacts/ryu8mebh_1000822994.png" 
              alt="Drider Logo" 
              className="h-12 mb-4"
            />
            <p className="text-gray-600 text-sm">
              Your trusted platform for earning and shopping. Join thousands of users earning daily.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/" className="hover:text-yellow-600">Home</a></li>
              <li><a href="/training" className="hover:text-yellow-600">Training</a></li>
              <li><a href="/cashback" className="hover:text-yellow-600">Cashback</a></li>
              <li><a href="/store" className="hover:text-yellow-600">Store</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-4">Contact Us</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:business@driderhealthcare.com" className="hover:text-yellow-600">
                  business@driderhealthcare.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>7836835613 / 8595494745</span>
              </div>
              <div>
                <a href="https://drider.in" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-600">
                  www.drider.in
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>&copy; 2024 Drider Healthcare. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
