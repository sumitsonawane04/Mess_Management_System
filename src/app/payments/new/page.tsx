'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AppShell from '@/components/layout/AppShell';

interface CustomerWithBalance {
  id: string;
  name: string;
  mobile: string;
  amount: number;
  status: 'paid' | 'unpaid';
  totalPaid: number;
  remainingBalance: number;
}

function getTodayISTString() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

export default function NewPaymentPage() {
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadCustomersAndBalances() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setUserEmail(user.email || '');
        setPaymentDate(getTodayISTString());

        // Fetch customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true });

        if (customersError) {
          setError(customersError.message);
          setLoading(false);
          return;
        }

        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('customer_id, amount');

        if (paymentsError) {
          setError(paymentsError.message);
          setLoading(false);
          return;
        }

        // Calculate paid amounts per customer
        const paidMap: Record<string, number> = {};
        (paymentsData || []).forEach((p) => {
          paidMap[p.customer_id] = (paidMap[p.customer_id] || 0) + Number(p.amount);
        });

        const preparedCustomers: CustomerWithBalance[] = (customersData || []).map((c) => {
          const totalPaid = paidMap[c.id] || 0;
          const remainingBalance = Math.max(0, Number(c.amount) - totalPaid);
          return {
            id: c.id,
            name: c.name,
            mobile: c.mobile,
            amount: Number(c.amount),
            status: c.status,
            totalPaid,
            remainingBalance,
          };
        });

        setCustomers(preparedCustomers);
      } catch (err: any) {
        setError(err?.message || 'Failed to load customer list.');
      } finally {
        setLoading(false);
      }
    }

    loadCustomersAndBalances();
  }, [router, supabase]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }

    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Payment amount must be greater than ₹0.');
      return;
    }

    if (selectedCustomer && parsedAmount > selectedCustomer.remainingBalance) {
      setError(
        `Payment amount (₹${parsedAmount.toLocaleString('en-IN')}) cannot exceed the customer's remaining balance of ₹${selectedCustomer.remainingBalance.toLocaleString('en-IN')}.`
      );
      return;
    }

    if (!paymentDate) {
      setError('Payment date is required.');
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('User session expired. Please log in again.');
        setSubmitting(false);
        return;
      }

      // 1. Insert payment record
      const { error: insertError } = await supabase.from('payments').insert({
        owner_id: user.id,
        customer_id: selectedCustomerId,
        amount: parsedAmount,
        payment_date: paymentDate,
      });

      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }

      // 2. Synchronize customer payment status
      if (selectedCustomer) {
        const newTotalPaid = selectedCustomer.totalPaid + parsedAmount;
        const newStatus: 'paid' | 'unpaid' =
          newTotalPaid >= selectedCustomer.amount ? 'paid' : 'unpaid';

        await supabase
          .from('customers')
          .update({ status: newStatus })
          .eq('id', selectedCustomerId)
          .eq('owner_id', user.id);
      }

      router.push('/payments');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment.');
      setSubmitting(false);
    }
  };

  return (
    <AppShell userEmail={userEmail}>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Record Payment</h1>
            <p className="text-sm text-gray-500 mt-1">Add a new payment entry for a mess subscriber.</p>
          </div>
          <Link
            href="/payments"
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

        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-sm text-gray-500 font-medium">Loading customers...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm space-y-5">
            {/* Customer Dropdown */}
            <div>
              <label htmlFor="select-customer" className="block text-sm font-medium text-gray-700 mb-1">
                Select Customer <span className="text-red-500">*</span>
              </label>
              <select
                id="select-customer"
                required
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const cust = customers.find((c) => c.id === e.target.value);
                  if (cust) {
                    // Pre-fill amount with remaining balance if empty
                    setAmount(cust.remainingBalance.toString());
                  }
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">-- Choose a customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile}) — Remaining: ₹{c.remainingBalance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            {/* Remaining Balance Summary Badge */}
            {selectedCustomer && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs sm:text-sm">
                <span className="text-blue-800 font-medium">
                  Mess Total: <strong>₹{selectedCustomer.amount.toLocaleString('en-IN')}</strong> | Paid: <strong>₹{selectedCustomer.totalPaid.toLocaleString('en-IN')}</strong>
                </span>
                <span className="font-bold text-blue-900">
                  Remaining: ₹{selectedCustomer.remainingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <label htmlFor="payment-amount" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                id="payment-amount"
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="e.g. 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Payment Date */}
            <div>
              <label htmlFor="payment-date" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                id="payment-date"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <Link
                href="/payments"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Recording Payment...' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
