# Orbit 🚀

Orbit is a modern project management app built with Expo, focused on clean design, smooth interactions, and a simple workflow. It combines an iOS-style liquid glass UI with secure authentication and a scalable backend.

---

## Tech Stack

* **Expo** for cross-platform development
* **Clerk** for authentication (Google & Apple OAuth)
* **Supabase** for database and user data storage
* **Zustand** for lightweight state management

---

## Features

* 🎨 iOS-inspired glassmorphism UI with liquid glass tab bar
* 🔐 Authentication with Clerk (Google & Apple OAuth)
* 💾 User data storage and syncing with Supabase
* 📱 Platform-specific login screens using `.ios.tsx`
* 🌈 Modern gradients, blur effects, and smooth animations
* 📊 Simple and predictable state management with Zustand

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Make sure your Clerk keys are configured in your Expo project settings as required.

---

### 3. Set up Supabase

Run the SQL schema provided in:

```
docs/AUTH_SETUP.md
```

Use the Supabase SQL Editor to apply the schema.

---

### 4. Start the app

```bash
npx expo start
```

Scan the QR code with Expo Go or run the app on an iOS simulator.

---

## Authentication Flow

* Users sign in using Google or Apple via Clerk
* After successful authentication, user data is synced to Supabase
* Unauthenticated users are redirected to the login screen
* iOS devices use a native glassmorphism login UI
* Authenticated users access the main tab-based app
* User profile information is available in the Profile tab

---

## Project Structure

```
app/
  (auth)/              # Authentication screens
    login.tsx          # Default login screen
    login.ios.tsx      # iOS-specific glassmorphism login
  (tabs)/              # Main application tabs
    index.tsx          # Home screen with glass cards
    explore.tsx        # Explore screen
    profile.tsx        # User profile screen
lib/
  supabase.ts          # Supabase client and user sync logic
components/
  tab-bar/             # Platform-specific tab bar backgrounds
```

---

## Notes

* This project is optimized for iOS design first
* Android uses shared UI components where possible
* Expo EAS is recommended for building and deploying iOS apps

---

## License

MIT License
