# Profiles Table Setup Guide

This guide explains how to set up the profiles table in your Supabase database to enable the Members feature.

## Overview

The profiles table stores user profile information and allows users from the same organization to view each other as team members.

## Setup Steps

### 1. Run the SQL Schema

Execute the SQL commands in `supabase-schema.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the profiles-related SQL from `supabase-schema.sql`
4. Click **Run** to execute

### 2. What Gets Created

The SQL script creates:

- **`profiles` table** with these columns:
  - `id` (UUID, references auth.users)
  - `email` (TEXT)
  - `full_name` (TEXT)
  - `bio` (TEXT)
  - `role` (TEXT)
  - `organization` (TEXT)
  - `phone_number` (TEXT)
  - `avatar_url` (TEXT)
  - `onboarding_completed` (BOOLEAN)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

- **Indexes** for faster queries:
  - `idx_profiles_organization` - for organization-based queries
  - `idx_profiles_email` - for email lookups

- **Row Level Security (RLS) Policies**:
  - Users can view profiles from their organization
  - Users can view their own profile
  - Users can insert their own profile
  - Users can update their own profile

- **Automatic Triggers**:
  - `on_auth_user_created` - Creates profile when user signs up
  - `on_auth_user_updated` - Syncs user metadata to profile on updates
  - `on_profiles_updated` - Updates `updated_at` timestamp

- **Real-time subscriptions** enabled for live updates

## How It Works

### Automatic Profile Creation

When a user signs up:
1. The `on_auth_user_created` trigger automatically creates a profile entry
2. User metadata (name, role, organization, etc.) is copied to the profile table

### Automatic Profile Sync

When a user updates their profile in the app:
1. The app updates `auth.users.user_metadata`
2. The `on_auth_user_updated` trigger automatically syncs changes to the profiles table
3. All users viewing the Members screen see the update in real-time

### Organization-Based Filtering

The RLS policies ensure:
- Users can only see profiles from their own organization
- Users can always see their own profile
- Users cannot modify other users' profiles

## Testing

After running the SQL:

1. **Check the table exists**:
   ```sql
   SELECT * FROM profiles;
   ```

2. **Verify triggers**:
   - Sign up a new user
   - Check if their profile was created automatically
   - Update user metadata in Settings → Account
   - Verify the profiles table is updated

3. **Test organization filtering**:
   - Create users with the same organization
   - View the Members tab
   - Confirm all organization members are visible

## Troubleshooting

### Profiles not appearing

1. Check if the user has set an organization:
   ```sql
   SELECT id, email, organization FROM profiles WHERE organization IS NULL;
   ```

2. Verify RLS policies are enabled:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

### Real-time not working

1. Confirm realtime is enabled:
   ```sql
   SELECT * FROM pg_publication_tables WHERE tablename = 'profiles';
   ```

2. Check the Supabase Dashboard → Database → Replication

### Existing users not showing

For existing users created before the profiles table:
1. They need to update their profile once (in Settings → Account)
2. Or run this migration:
   ```sql
   INSERT INTO profiles (id, email, full_name, role, organization, phone_number, onboarding_completed)
   SELECT 
     id,
     email,
     COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
     raw_user_meta_data->>'role',
     raw_user_meta_data->>'organization',
     raw_user_meta_data->>'phone_number',
     COALESCE((raw_user_meta_data->>'onboarding_completed')::boolean, false)
   FROM auth.users
   WHERE id NOT IN (SELECT id FROM profiles);
   ```

## Security Notes

- The `handle_new_user()` and `sync_user_metadata_to_profile()` functions use `SECURITY DEFINER` to bypass RLS for automatic operations
- RLS policies prevent users from seeing profiles outside their organization
- Only users can modify their own profiles
- Email addresses are visible to organization members (modify RLS if this is a concern)

## Next Steps

After setup, the Members screen will:
- ✅ Show all users from the same organization
- ✅ Update automatically when profiles change
- ✅ Allow searching by name, email, or role
- ✅ Display real-time member count
- ✅ Support pull-to-refresh

Future enhancements:
- Add avatar image uploads
- Add member invitation system
- Add team roles and permissions
- Add member activity tracking
