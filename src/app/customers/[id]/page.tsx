'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AppShell from '@/components/layout/AppShell';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  start_date: string;
  end_date: string;
  amount: number;
  status: 'paid' | 'unpaid';
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  created_at: string;
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadCustomerData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setUserEmail(user.email || '');

        // Fetch customer details enforced by owner_id
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (customerError || !customerData) {
          setError('Customer not found or access denied.');
          setLoading(false);
          return;
        }

        setCustomer(customerData);

        // Fetch payments history for this customer
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('customer_id', customerId)
          .order('payment_date', { ascending: false });

        if (!paymentsError) {
          setPayments(paymentsData || []);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load customer details.');
      } finally {
        setLoading(false);
      }
    }

    loadCustomerData();
  }, [customerId, router, supabase]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('User session expired.');
        setDeleting(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('owner_id', user.id);

      if (deleteError) {
        setError(deleteError.message);
        setDeleting(false);
        setShowDeleteModal(false);
        return;
      }

      router.push('/customers');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete customer.');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const messAmount = customer ? Number(customer.amount) : 0;
  const remainingAmount = Math.max(0, messAmount - totalPaid);

  return (
    <AppShell userEmail={userEmail}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <Link
              href="/customers"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center mb-1"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Customers
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {customer ? customer.name : 'Customer Details'}
            </h1>
          </div>

          {customer && (
            <div className="flex items-center gap-3">
              <Link
                href={`/customers/${customer.id}/edit`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
              >
                Edit Customer
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
              >
                Delete Customer
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-sm text-gray-500 font-medium">Loading customer info...</p>
          </div>
        ) : customer ? (
          <>
            {/* Customer Details Card */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">Member Overview</h3>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                    customer.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {customer.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
                    Mobile Number
                  </span>
                  <span className="text-sm font-semibold text-gray-900 font-mono mt-1 block">
                    {customer.mobile}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
                    Mess Start Date
                  </span>
                  <span className="text-sm font-semibold text-gray-900 mt-1 block">
                    {customer.start_date}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
                    Mess End Date
                  </span>
                  <span className="text-sm font-semibold text-gray-900 mt-1 block">
                    {customer.end_date}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
                    Mess Amount
                  </span>
                  <span className="text-sm font-semibold text-gray-900 mt-1 block">
                    ₹{messAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Financial Balance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                    Total Amount Paid
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">
                    ₹{totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                    Remaining Amount
                  </span>
                  <span className="text-2xl font-extrabold text-amber-900 mt-1 block">
                    ₹{remainingAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900">Payment History</h3>

              {payments.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-lg">
                  <p className="text-sm text-gray-500">No payment records found for this customer.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                      <tr>
                        <th scope="col" className="px-6 py-3">#</th>
                        <th scope="col" className="px-6 py-3">Payment Date</th>
                        <th scope="col" className="px-6 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3.5 text-xs font-mono text-gray-500">{idx + 1}</td>
                          <td className="px-6 py-3.5 text-gray-900 font-medium">{p.payment_date}</td>
                          <td className="px-6 py-3.5 font-bold text-gray-900">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && customer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Delete Customer</h3>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{customer.name}</span>?
                This will permanently delete the customer and all associated payment history.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
