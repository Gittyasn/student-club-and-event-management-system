-- Migration: Add missing INSERT policy for profiles table
-- This allows anyone to insert their own profile during registration.
-- Security is maintained as only the owner can insert their own ID (auth.uid() = id).

CREATE POLICY "Enable insert for users to create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);
