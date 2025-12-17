# Supabase Database Setup

This file contains the SQL schema for the projects feature. Run these commands in your Supabase SQL Editor.

## Instructions

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the query to create the tables and policies

## What This Creates

- **projects table**: Stores all project data
- **Row Level Security**: Ensures users can only access their own projects
- **Realtime subscriptions**: Enables instant updates across all clients
- **Automatic timestamps**: Updates `updated_at` field automatically
- **Indexes**: Optimizes query performance

## Features

- Real-time synchronization across all devices
- Secure data access with RLS policies
- Automatic timestamp management
- Optimized for performance with proper indexes
