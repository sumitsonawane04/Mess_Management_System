'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AppShell from '@/components/layout/AppShell';

interface PaymentItem {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  created_at: string;
  customers: {
    name: string;
    mobile: string;
  } | null;
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchPayments() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setUserEmail(user.email || '');

        // Fetch payments with joined customer information
        const { data, error: fetchError } = await supabase
          .from('payments')
          .select('*, customers(name, mobile)')
          .order('payment_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setPayments(data || []);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load payments.');
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [router, supabase]);

  // Calculate This Month's Income
  const todayStr = getTodayISTString();
  const currentYearMonth = todayStr.substring(0, 7); // "YYYY-MM"
  const monthStartStr = `${currentYearMonth}-01`;
  const [yearNum, monthNum] = currentYearMonth.split('-').map(Number);
  const lastDayNum = new Date(yearNum, monthNum, 0).getDate();
  const monthEndStr = `${currentYearMonth}-${String(lastDayNum).padStart(2, '0')}`;

  const thisMonthIncome = payments
    .filter(
      (p) => p.payment_date >= monthStartStr && p.payment_date <= monthEndStr
    )
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Filter payments by customer name or mobile number
  const filteredPayments = payments.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const customerName = p.customers?.name?.toLowerCase() || '';
    const customerMobile = p.customers?.mobile?.toLowerCase() || '';
    return customerName.includes(term) || customerMobile.includes(term);
  });

  return (
    <AppShell userEmail={userEmail}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Payments</h1>
            <p className="text-sm text-gray-500 mt-1">Track payment records and transaction history.</p>
          </div>
          <Link
            href="/payments/new"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            + Add Payment
          </Link>
        </div>

        {/* Summary Card: This Month's Income */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                This Month's Income
              </p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                ₹{thisMonthIncome.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search payment history by customer name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Loading / Table / Empty State */}
        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-sm text-gray-500 font-medium">Loading payment records...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-base font-semibold text-gray-900">
              {searchTerm ? 'No matching payment records found' : 'No payment records yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'Try searching with a different customer name or mobile number.'
                : 'Record your first customer payment using the + Add Payment button.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/payments/new"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  + Add Payment
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">#</th>
                    <th scope="col" className="px-6 py-3.5">Payment Date</th>
                    <th scope="col" className="px-6 py-3.5">Customer Name</th>
                    <th scope="col" className="px-6 py-3.5">Mobile</th>
                    <th scope="col" className="px-6 py-3.5">Amount</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredPayments.map((payment, index) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-500 text-xs">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {payment.payment_date}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {payment.customers?.name || 'Unknown Customer'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                        {payment.customers?.mobile || '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        ₹{Number(payment.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/customers/${payment.customer_id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                        >
                          View Customer
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
