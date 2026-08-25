'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AppShell from '@/components/layout/AppShell';

export default function NewCustomerPage() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [initialPayment, setInitialPayment] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || '');

      // Set default dates
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setPaymentDate(today);

      // Default end date to 30 days from today
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setEndDate(nextMonth.toISOString().split('T')[0]);
    }

    checkAuth();
  }, [router, supabase]);

  const handleStatusChange = (newStatus: 'paid' | 'unpaid') => {
    setStatus(newStatus);
    if (newStatus === 'paid' && amount) {
      setInitialPayment(amount);
    } else if (newStatus === 'unpaid') {
      setInitialPayment('0');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    const parsedInitialPayment = initialPayment ? parseFloat(initialPayment) : 0;

    // Validation
    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }

    if (!mobile.trim()) {
      setError('Mobile number is required.');
      return;
    }

    if (!startDate) {
      setError('Mess start date is required.');
      return;
    }

    if (!endDate) {
      setError('Mess end date is required.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('Mess end date cannot be before the start date.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Mess amount must be a positive number.');
      return;
    }

    if (isNaN(parsedInitialPayment) || parsedInitialPayment < 0) {
      setError('Initial payment amount cannot be negative.');
      return;
    }

    if (parsedInitialPayment > parsedAmount) {
      setError('Initial payment amount cannot exceed total mess amount.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('No active Supabase authentication session found. Please sign in at /login with your Supabase account to enable RLS-protected database operations.');
        setLoading(false);
        return;
      }

      // Determine status dynamically based on payment
      const finalStatus: 'paid' | 'unpaid' =
        parsedInitialPayment >= parsedAmount ? 'paid' : status;

      // 1. Insert customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          mobile: mobile.trim(),
          start_date: startDate,
          end_date: endDate,
          amount: parsedAmount,
          status: finalStatus,
        })
        .select('id')
        .single();

      if (customerError) {
        setError(customerError.message);
        setLoading(false);
        return;
      }

      // 2. Insert initial payment record if amount > 0
      if (parsedInitialPayment > 0 && customerData?.id) {
        const { error: paymentError } = await supabase.from('payments').insert({
          owner_id: user.id,
          customer_id: customerData.id,
          amount: parsedInitialPayment,
          payment_date: paymentDate || new Date().toISOString().split('T')[0],
        });

        if (paymentError) {
          console.error('Initial payment insert error:', paymentError.message);
        }
      }

      router.push('/customers');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create customer.');
      setLoading(false);
    }
  };

  return (
    <AppShell userEmail={userEmail}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Add New Customer</h1>
            <p className="text-sm text-gray-500 mt-1">Register a new subscriber to your mess service.</p>
          </div>
          <Link
            href="/customers"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
          {/* Section 1: Customer Details */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Customer Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="customer-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-mobile"
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Mess Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Mess End Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="end-date"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Payment */}
          <div className="space-y-4 pt-2">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Mess Charges & Payment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mess-amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Mess Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  id="mess-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="e.g. 3000"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (status === 'paid') {
                      setInitialPayment(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="payment-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  id="payment-status"
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as 'paid' | 'unpaid')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="unpaid">Unpaid / Partial</option>
                  <option value="paid">Fully Paid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="initial-payment" className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Payment Received (₹)
                </label>
                <input
                  id="initial-payment"
                  type="number"
                  min="0"
                  max={amount || undefined}
                  step="0.01"
                  placeholder="0"
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="payment-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Link
              href="/customers"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving Customer...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
