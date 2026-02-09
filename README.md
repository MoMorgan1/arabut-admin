# ArabUT Admin Dashboard

A Next.js admin dashboard for managing orders, suppliers, and operations with Supabase backend.

## Features

- Order management system with status tracking
- Supplier management and pricing
- Financial tracking and reporting
- Role-based access control (Admin, Employee, Supplier)
- Real-time notifications
- Integration with FUT Transfer API
- Salla webhook integration

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI**: React 19, TailwindCSS 4, shadcn/ui
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- Supabase account and project

### Installation

1. Clone the repository

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: https://app.supabase.com/project/_/settings/api

4. Run database migrations:

Execute the SQL files in the `supabase-migrations/` folder in your Supabase SQL editor, or use the provided `supabase-schema.sql` for a complete schema setup.

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) - you'll be redirected to the login page.

## Deployment

### Deploy on Vercel (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to [Vercel](https://vercel.com/new) and import your repository

3. **IMPORTANT**: Configure environment variables in Vercel:
   - Go to: Project Settings > Environment Variables
   - Add the following variables:
     - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

4. Deploy! Vercel will automatically detect Next.js and use the optimal settings.

### Deploy on Other Platforms

For Netlify, Cloudflare Pages, or other platforms:

1. Set the build command: `npm run build`
2. Set the output directory: `.next`
3. Set Node version: `18` or higher
4. **CRITICAL**: Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Troubleshooting Deployment

If you see the default Next.js starter page after deployment:

1. **Check environment variables are set** in your deployment platform
2. **Verify build logs** for any errors
3. **Clear cache and redeploy**
4. **Check middleware is working** by testing `/login` directly
5. Ensure your Supabase project URL is accessible from the deployment environment

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Authentication pages
│   ├── (dashboard)/      # Protected dashboard pages
│   ├── api/              # API routes and webhooks
│   └── page.tsx          # Root redirect to login
├── components/           # React components
├── lib/                  # Utilities and integrations
├── hooks/                # Custom React hooks
└── types/                # TypeScript types
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## License

Private project - All rights reserved.
