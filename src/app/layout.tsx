import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mess Management System',
  description: 'Full-stack Mess Management System with Supabase',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
