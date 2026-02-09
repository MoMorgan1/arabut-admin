# Deployment Fix & Checklist

## Problem
Getting default Next.js starter page message: "To get started, edit the page.tsx file..."

## Solution Applied

### 1. Updated Root Page (src/app/page.tsx)
- Added `export const dynamic = 'force-dynamic'` to ensure the redirect runs server-side in production
- This forces Next.js to render the page dynamically rather than statically

### 2. Updated Next.js Configuration (next.config.ts)
- Added proper experimental settings for server actions
- Ensured middleware configuration is optimal

### 3. Created Environment Variable Template (.env.example)
- Documents required environment variables
- Makes it easy to set up for deployment

### 4. Updated README.md
- Added comprehensive deployment instructions
- Included troubleshooting section
- Added environment variable documentation

## Deployment Steps

### Step 1: Verify Local Environment
Before deploying, ensure the app works locally:

```bash
npm install
npm run dev
```

Visit http://localhost:3000 - you should be redirected to `/login`

### Step 2: Prepare for Deployment

#### If Using Vercel:
1. Push code to GitHub/GitLab/Bitbucket
2. Go to https://vercel.com/new
3. Import your repository
4. **CRITICAL**: Add environment variables:
   - Go to Project Settings > Environment Variables
   - Add: `NEXT_PUBLIC_SUPABASE_URL`
   - Add: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

#### If Using Netlify:
1. Push code to repository
2. Go to https://app.netlify.com/start
3. Import your repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. **CRITICAL**: Add environment variables:
   - Go to Site Settings > Build & Deploy > Environment
   - Add: `NEXT_PUBLIC_SUPABASE_URL`
   - Add: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Deploy

#### If Using cPanel or Custom Hosting:
1. Build locally: `npm run build`
2. Upload the following to your server:
   - `.next/` folder (the build output)
   - `public/` folder
   - `package.json`
   - `next.config.ts`
   - Node.js server files
3. Set up environment variables in your hosting control panel
4. Start the app: `npm start`

### Step 3: Verify Deployment

After deployment, check:

1. **Visit your deployed URL** - you should be redirected to `/login`
2. **If you see the default Next.js page**:
   - ✅ Check environment variables are set in deployment platform
   - ✅ Clear deployment cache and redeploy
   - ✅ Check build logs for errors
   - ✅ Verify Supabase URL is accessible from deployment environment

3. **Test these URLs directly**:
   - `your-domain.com/login` - should show login page
   - `your-domain.com/` - should redirect to `/login`

## Common Issues & Fixes

### Issue 1: Still Seeing Default Next.js Page
**Cause**: Environment variables not set or build cache issue
**Fix**:
- Verify environment variables in deployment platform
- Clear build cache
- Redeploy

### Issue 2: "Hydration Error" or "Redirect Not Working"
**Cause**: Static rendering instead of dynamic
**Fix**: Already applied - `export const dynamic = 'force-dynamic'` in `page.tsx`

### Issue 3: "Auth Error" or "Supabase Connection Failed"
**Cause**: Missing or incorrect environment variables
**Fix**:
- Double-check `NEXT_PUBLIC_SUPABASE_URL` format: `https://xxx.supabase.co`
- Double-check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the anon/public key (not service role key)

### Issue 4: Redirect Loop
**Cause**: Middleware and page redirect conflicting
**Fix**: Already handled in middleware.ts - it checks for login page before redirecting

## Testing Checklist

After deployment, test:
- [ ] Root path (`/`) redirects to `/login`
- [ ] `/login` page loads correctly
- [ ] Can log in with valid credentials
- [ ] After login, redirected to dashboard
- [ ] Dashboard loads data from Supabase
- [ ] Role-based access works (admin, employee, supplier)
- [ ] Logout works correctly

## Build & Deploy Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server (local testing)
npm start

# Development mode
npm run dev
```

## Environment Variables Reference

| Variable | Where to Get It | Example |
|----------|----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API | `eyJhbGc...` (long string) |

## Next Steps After Successful Deployment

1. Set up custom domain (if not using default)
2. Configure Salla webhook to point to: `your-domain.com/api/webhooks/salla`
3. Set up cron job for FUT Transfer sync: `your-domain.com/api/cron/sync-ft`
4. Test all functionality in production
5. Monitor error logs in your deployment platform

## Support

If issues persist:
1. Check browser console for errors (F12 > Console)
2. Check deployment platform logs
3. Check Supabase logs
4. Verify all environment variables are exactly as shown in Supabase dashboard

---

**Last Updated**: February 9, 2026
**Status**: Fixes applied, ready for deployment
