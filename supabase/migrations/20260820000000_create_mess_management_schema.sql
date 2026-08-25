-- Migration: Create customers and payments tables with Row Level Security (RLS) policies

-- Enable pgcrypto / extension if needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON public.customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner_id ON public.payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if re-applying migration
DROP POLICY IF EXISTS "Mess owners can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Mess owners can insert their own customers" ON public.customers;
DROP POLICY IF EXISTS "Mess owners can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Mess owners can delete their own customers" ON public.customers;

DROP POLICY IF EXISTS "Mess owners can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Mess owners can insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Mess owners can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Mess owners can delete their own payments" ON public.payments;

-- 6. Create RLS policies for customers table
CREATE POLICY "Mess owners can view their own customers"
    ON public.customers FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Mess owners can insert their own customers"
    ON public.customers FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Mess owners can update their own customers"
    ON public.customers FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Mess owners can delete their own customers"
    ON public.customers FOR DELETE
    USING (auth.uid() = owner_id);

-- 7. Create RLS policies for payments table
CREATE POLICY "Mess owners can view their own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Mess owners can insert their own payments"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Mess owners can update their own payments"
    ON public.payments FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Mess owners can delete their own payments"
    ON public.payments FOR DELETE
    USING (auth.uid() = owner_id);
