# Travel Buddy Finder 🚗🌿
### Better Campus Community • SRM University-AP

**"Find your people. Share your ride."**

Travel Buddy Finder is a full-stack web application designed for students at **SRM University-AP (Amaravati)** to coordinate shared auto-rickshaw and cab rides from the campus main gate. Students can find peers heading out around the same time slot, join departure groups, monitor live member headcounts, and coordinate in real-time group chats.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19 / Next.js compatible architecture, TypeScript, Vite
- **Styling & Design System**: Tailwind CSS (custom Better Campus forest green palette `#245C3A`, `#183F2A`, `#FFFEFA`, `#F1F7F0`, `#E6A15A`)
- **Icons**: Lucide React
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with Google OAuth
- **Real-Time Engine**: Supabase Realtime (WebSocket channels for instant count updates & member chat)
- **Timezone**: Strict `Asia/Kolkata` (IST) date and interval handling to avoid UTC date shifting

---

## 📋 A. Prerequisites

Before starting, ensure you have:
1. **Node.js** (v18.0.0 or higher) and `npm` installed.
2. An active **Supabase account and project** ([supabase.com](https://supabase.com)).
3. A **Google Cloud Console account** ([console.cloud.google.com](https://console.cloud.google.com)) to configure Google OAuth credentials.

---

## 💻 B. Installing Dependencies

Clone the repository and install all dependencies:

```bash
npm install
```

---

## ⚙️ C. Configuring Environment Variables (.env.local)

Create a `.env.local` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env.local
```

Populate the following variables:

```ini
# Supabase Project URL (From Supabase Dashboard > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Public API Key (From Supabase Dashboard > Project Settings > API > Project API keys)
# Provide either NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy) or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new format)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

> **Security Note:** Never paste your Supabase `service_role` key or Google OAuth Client Secret into `.env.local` or any frontend code.

---

## 🗄️ D & E. Database Schema & Migration Execution

The complete database migration is located at:
`supabase/migrations/0001_initial_schema.sql`

### How to apply the migration:
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and click **SQL Editor** on the left menu.
3. Click **New query**.
4. Open `supabase/migrations/0001_initial_schema.sql`, copy all contents, paste into the editor, and click **Run**.

### Tables Created:
- `public.profiles`: Stores authenticated user id, display name, email, avatar URL, and timestamps.
- `public.time_slots`: Predefined 15-minute campus gate departure intervals with a unique constraint on `(departure_date, start_time, end_time)`.
- `public.slot_members`: Stores student memberships with a unique constraint on `(slot_id, user_id)`.
- `public.messages`: Real-time group chat messages with character validation (`length <= 1000`).

### Security & Row Level Security (RLS):
- Every table has RLS strictly enabled.
- Normal users cannot read or post messages to a departure slot unless they are an active joined member of that slot.
- Membership joins/leaves are validated against `auth.uid() = user_id`.
- Users cannot modify or delete other students' profiles or messages.

---

## 🔑 F. Configuring Google OAuth in Supabase

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials** > **OAuth client ID**.
3. Select **Web application**.
4. In **Authorized redirect URIs**, paste your Supabase callback URL:
   ```
   https://<your-supabase-project-id>.supabase.co/auth/v1/callback
   ```
5. Click **Create** and copy your **Client ID** and **Client Secret**.
6. Open your **Supabase Dashboard** > **Authentication** > **Providers** > **Google**.
7. Toggle **Enable Google provider** to `ON`.
8. Paste your Google **Client ID** and **Client Secret**.
9. Click **Save**.

---

## 🌐 G. Configuring Supabase Site URL and Redirect URLs

In your **Supabase Dashboard** > **Authentication** > **URL Configuration**:

1. **Site URL**:
   ```
   http://localhost:3000
   ```
2. **Redirect URLs** (add these lines):
   ```
   http://localhost:3000/**
   https://*.run.app/**
   https://your-app-name.vercel.app/**
   ```
3. Click **Save**.

---

## 🚀 H & I. Running the Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Click **Continue with Google** to sign in.
- If you haven't set `.env.local` yet, click the **Configure Supabase** button on the login screen to enter credentials directly in the interactive setup modal.

---

## 🧪 J & K. Testing Slots and Real-Time Chat

### 1. Joining and Leaving Slots:
- Select a departure date (e.g., Today or Tomorrow).
- Pick an interval (e.g., 8:00 AM – 8:15 AM).
- Click **Join Slot**. The slot card will instantly display "Joined", increment the student count, and add your avatar to the member stack.
- Click **Leave** to remove your membership.

### 2. Multi-User Real-Time Testing:
- Open two different browsers (e.g., Chrome and Firefox) or one regular window and one incognito window.
- Log in with two different Google accounts.
- When User 1 joins an 8:30 AM slot, User 2's dashboard updates the member count and avatar stack **in real time without refreshing**.
- Both users click **Group Chat**:
  - Type messages to coordinate where to meet at the campus gate.
  - Notice messages appear instantly for both students.
  - Test `Enter` to send and `Shift+Enter` for a new line.

---

## ☁️ L, M, N & O. Deploying to Vercel

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete travel buddy finder with real supabase and google oauth"
   git push origin main
   ```
2. Go to [Vercel](https://vercel.com) and click **Add New...** > **Project**.
3. Select your GitHub repository.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<your-project-id>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<your-anon-or-publishable-key>`
5. Click **Deploy**.
6. Once deployed, copy your production Vercel domain (e.g., `https://travel-buddy-finder.vercel.app`) and add it to **Supabase Dashboard > Authentication > URL Configuration > Redirect URLs**.

---

## 🛠️ P. Troubleshooting Common Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"redirect_uri_mismatch" during Google Sign-In** | Google Cloud Console does not have the Supabase callback URI. | In Google Cloud Credentials, add `https://<your-project-id>.supabase.co/auth/v1/callback` to Authorized redirect URIs. |
| **"new row violates row-level security policy"** | User attempted an action without an authenticated session or mismatched `user_id`. | Verify you ran `0001_initial_schema.sql` and that `auth.uid() = user_id`. |
| **Chat messages not updating in real time** | Supabase Realtime publication not configured for the `messages` table. | In Supabase Dashboard, go to **Database** > **Replication** and verify `messages` and `slot_members` have Realtime enabled. |
| **Date shifts by 1 day** | Local device timezone converting UTC date incorrectly. | Handled automatically by our `date-utils.ts` which anchors queries to `Asia/Kolkata` (IST). |

---

## 🌿 Community Credit

**Made by Better Campus Community**  
*SRM University-AP, Amaravati, Andhra Pradesh*  
Contact: `bettercampus.srmap@gmail.com`
