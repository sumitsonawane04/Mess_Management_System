'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AppShell from '@/components/layout/AppShell';

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'paid' | 'unpaid'>('unpaid');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadCustomer() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setUserEmail(user.email || '');

        const { data, error: fetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (fetchError || !data) {
          setError('Customer not found or access denied.');
          setLoading(false);
          return;
        }

        setName(data.name);
        setMobile(data.mobile);
        setStartDate(data.start_date);
        setEndDate(data.end_date);
        setAmount(data.amount.toString());
        setStatus(data.status);
      } catch (err: any) {
        setError(err?.message || 'Failed to load customer details.');
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [customerId, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);

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

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('User session expired. Please log in again.');
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: name.trim(),
          mobile: mobile.trim(),
          start_date: startDate,
          end_date: endDate,
          amount: parsedAmount,
          status,
        })
        .eq('id', customerId)
        .eq('owner_id', user.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      router.push(`/customers/${customerId}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to update customer.');
      setSaving(false);
    }
  };

  return (
    <AppShell userEmail={userEmail}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Edit Customer</h1>
            <p className="text-sm text-gray-500 mt-1">Update subscriber details.</p>
          </div>
          <Link
            href={`/customers/${customerId}`}
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
            <p className="text-sm text-gray-500 font-medium">Loading customer data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
                General Info
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-mobile"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Mess Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Mess End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-end-date"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
                Billing & Status
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Mess Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    id="edit-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'paid' | 'unpaid')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="unpaid">Unpaid / Partial</option>
                    <option value="paid">Fully Paid</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <Link
                href={`/customers/${customerId}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Updating Customer...' : 'Update Customer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
