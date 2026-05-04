
-- STEP 1: Add new enum types and values
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE public.mfa_method AS ENUM ('totp', 'email_otp');

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
