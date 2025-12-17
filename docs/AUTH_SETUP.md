# Supabase SQL Schema for Users Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on clerk_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON public.users(clerk_user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read (for authenticated users to see their data)
CREATE POLICY "Enable read access for all users" ON public.users
  FOR SELECT
  USING (true);

-- Create policy to allow inserting new users (public access for initial signup)
CREATE POLICY "Enable insert for all users" ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow users to update any record (public access)
CREATE POLICY "Enable update for all users" ON public.users
  FOR UPDATE
  USING (true);
```

## Setup Instructions:

1. **Clerk Setup:**
   - Go to https://clerk.com and create a new application
   - Enable Google OAuth provider in "OAuth Applications"
   - For Apple OAuth, enable Sign in with Apple
   - Copy your Publishable Key

2. **Supabase Setup:**
   - Go to https://supabase.com and create a new project
   - Go to SQL Editor and click "New Query"
   - Paste the SQL schema above and click "Run"
   - Verify the table was created in Table Editor
   - Go to Settings → API
   - Copy your Project URL and Anon Key

3. **Update .env File:**
   - Update `.env` file with your keys:
     ```
     EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
     EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Configure OAuth Redirect:**
   - In Clerk Dashboard, go to "OAuth Applications"
   - For each provider, ensure the redirect URL is set to your app scheme
   - The redirect will be handled automatically by `oauth-native-callback` route

5. **Test the Flow:**
   - Run `npx expo start --clear`
   - Open app on device/emulator
   - Click "Continue with Google" or "Continue with Apple"
   - After OAuth, you'll be redirected back to the app
   - User data will be synced to Supabase
   - Check Supabase Table Editor to verify user was created

6. **Troubleshooting:**
   - If stuck on "Completing sign in", check console logs for errors
   - Verify Supabase URL and keys are correct in `.env`
   - Ensure the `users` table exists in Supabase
   - Check Clerk dashboard for OAuth configuration
   - Clear cache with `npx expo start --clear`
