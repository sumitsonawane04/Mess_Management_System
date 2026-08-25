'use client';

import { useEffect, useState } from 'react';
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchCustomers() {
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
          .order('created_at', { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setCustomers(data || []);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load customers.');
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, [router, supabase]);

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(term) ||
      c.mobile.toLowerCase().includes(term)
    );
  });

  return (
    <AppShell userEmail={userEmail}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Customers</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and view your mess subscribers.</p>
          </div>
          <Link
            href="/customers/new"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            + Add Customer
          </Link>
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
              placeholder="Search by customer name or mobile number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Loading / Error States */}
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
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="mt-2 text-base font-semibold text-gray-900">
              {searchTerm ? 'No matching customers found' : 'No customers registered yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'Try searching with a different name or mobile number.'
                : 'Get started by creating your first customer.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/customers/new"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  + Add Customer
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Responsive Customer Table / List */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">#</th>
                    <th scope="col" className="px-6 py-3.5">Name</th>
                    <th scope="col" className="px-6 py-3.5">Mobile</th>
                    <th scope="col" className="px-6 py-3.5">Start Date</th>
                    <th scope="col" className="px-6 py-3.5">End Date</th>
                    <th scope="col" className="px-6 py-3.5">Amount</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredCustomers.map((customer, index) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-500 text-xs">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        {customer.mobile}
                      </td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {customer.start_date}
                      </td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {customer.end_date}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        ₹{Number(customer.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                            customer.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                        >
                          View
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
