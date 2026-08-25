import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
  customer_id: string;
  amount: number;
  payment_date: string;
  created_at: string;
}

function getTodayISTString() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Output: YYYY-MM-DD in IST
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch customers belonging to authenticated owner
  const { data: cData } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch payments belonging to authenticated owner
  const { data: pData } = await supabase
    .from('payments')
    .select('*');

  const customers: Customer[] = cData || [];
  const payments: Payment[] = pData || [];

  // Date Handling (Asia/Kolkata)
  const todayStr = getTodayISTString();
  const currentYearMonth = todayStr.substring(0, 7); // e.g. "2026-08"
  const monthStartStr = `${currentYearMonth}-01`;
  const [yearNum, monthNum] = currentYearMonth.split('-').map(Number);
  const lastDayNum = new Date(yearNum, monthNum, 0).getDate();
  const monthEndStr = `${currentYearMonth}-${String(lastDayNum).padStart(2, '0')}`;

  // 1. Total Customers
  const totalCustomers = customers.length;

  // 2. Active Customers (start_date <= today AND end_date >= today)
  const activeCustomers = customers.filter(
    (c) => c.start_date <= todayStr && c.end_date >= todayStr
  ).length;

  // 3. This Month's Income (sum of payment amounts with payment_date in current calendar month)
  const thisMonthIncome = payments
    .filter(
      (p) => p.payment_date >= monthStartStr && p.payment_date <= monthEndStr
    )
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // 4. Pending Amount (sum of (customer amount - customer total paid) across all customers)
  const paymentsByCustomer: Record<string, number> = {};
  payments.forEach((p) => {
    paymentsByCustomer[p.customer_id] =
      (paymentsByCustomer[p.customer_id] || 0) + Number(p.amount);
  });

  const pendingAmount = customers.reduce((sum, c) => {
    const paid = paymentsByCustomer[c.id] || 0;
    const remaining = Math.max(0, Number(c.amount) - paid);
    return sum + remaining;
  }, 0);

  // 5. Customers Starting Today
  const startingToday = customers.filter((c) => c.start_date === todayStr);

  // 6. Customers Ending Today
  const endingToday = customers.filter((c) => c.end_date === todayStr);

  // 7. Recent Customers (latest 5)
  const recentCustomers = customers.slice(0, 5);

  const userEmail = user.email || '';

  return (
    <AppShell userEmail={userEmail}>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Mess Management System
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome back, <span className="font-semibold text-gray-800">{userEmail}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/customers/new"
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              + Add Customer
            </Link>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Customers */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Customers
              </p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                {totalCustomers}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          {/* Card 2: Active Customers */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Active Customers
              </p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                {activeCustomers}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Card 3: This Month's Income */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
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

          {/* Card 4: Pending Amount */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Pending Amount
              </p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                ₹{pendingAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Today's Activity Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customers Starting Today */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2"></span>
              Customers Starting Today ({startingToday.length})
            </h3>
            {startingToday.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-lg">
                <p className="text-sm text-gray-500 font-medium">No customers starting today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {startingToday.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{c.mobile}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.start_date} to {c.end_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">
                        ₹{Number(c.amount).toLocaleString('en-IN')}
                      </p>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide mt-1 ${
                          c.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customers Ending Today */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span>
              Customers Ending Today ({endingToday.length})
            </h3>
            {endingToday.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-lg">
                <p className="text-sm text-gray-500 font-medium">No customers ending today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {endingToday.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{c.mobile}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.start_date} to {c.end_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">
                        ₹{Number(c.amount).toLocaleString('en-IN')}
                      </p>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide mt-1 ${
                          c.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Customers Section */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Recent Customers</h3>
            <Link
              href="/customers"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View All Customers $\rightarrow$
            </Link>
          </div>

          {recentCustomers.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-lg">
              <p className="text-sm text-gray-500">No recent customers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-3">#</th>
                    <th scope="col" className="px-4 py-3">Name</th>
                    <th scope="col" className="px-4 py-3">Mobile</th>
                    <th scope="col" className="px-4 py-3">Start Date</th>
                    <th scope="col" className="px-4 py-3">End Date</th>
                    <th scope="col" className="px-4 py-3">Amount</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentCustomers.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{c.mobile}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{c.start_date}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{c.end_date}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        ₹{Number(c.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide ${
                            c.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/customers/${c.id}`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-500 mt-0.5">Manage mess members and record payments.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/customers/new"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              + Add Customer
            </Link>
            <Link
              href="/customers"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              View Customers
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
