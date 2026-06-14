# CinnaTool Supabase Account Setup

1. Create or open a Supabase project.
2. Open `supabase/account.sql` in the Supabase SQL Editor and run it.
3. Copy the Project URL and anon/publishable key from Project Settings -> API.
4. Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Never put the `service_role` key in renderer or Vite environment variables.

The account system uses:

- Supabase Auth email/password sign-up and sign-in.
- `public.profiles` for username and avatar URL.
- Public `avatars` Storage bucket for avatar images.
