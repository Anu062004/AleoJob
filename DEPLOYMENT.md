# AleoJob Deployment Guide

## Prerequisites
- GitHub repository with your code
- Vercel account (for frontend)
- Render account (for backend)
- Supabase project

## Step 1: Prepare Your Repository

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

## Step 2: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `aleojob-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. **Add Environment Variables** (in Render dashboard):
   ```
   NODE_ENV=production
   PORT=3001
   NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
   ALEO_NETWORK=testnet
   NEXT_PUBLIC_ALEO_ENDPOINT=https://api.provable.com/v2/testnet
   NEXT_PUBLIC_ALEO_RPC_URL=https://api.provable.com/v2/testnet
   ALEO_RPC_ENDPOINTS=https://api.provable.com/v2/testnet,https://testnetbeta.aleorpc.com
   ```

6. Click **"Create Web Service"**
7. Wait for deployment (5-10 minutes)
8. Copy your backend URL (e.g., `https://aleojob.onrender.com`)

## Step 3: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. **Add Environment Variables** (in Vercel dashboard):
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
   NEXT_PUBLIC_BACKEND_URL=<your_render_backend_url>
   NEXT_PUBLIC_ALEO_NETWORK=testnet
   NEXT_PUBLIC_ALEO_ENDPOINT=https://api.provable.com/v2/testnet
   NEXT_PUBLIC_ALEO_RPC_URL=https://api.provable.com/v2/testnet
   ```

6. Click **"Deploy"**
7. Wait for deployment (2-5 minutes)

## Step 4: Update Backend URL in Vercel

1. After Render deployment completes, copy the backend URL
2. Go to Vercel project settings → Environment Variables
3. Update `NEXT_PUBLIC_BACKEND_URL` with your Render URL
4. Redeploy the frontend

## Step 5: Verify Deployment

1. Visit your Vercel URL
2. Test wallet connection
3. Try creating a job
4. Test accepting an application

## Troubleshooting

### Build Errors
- Check build logs in Vercel/Render dashboard
- Ensure all environment variables are set
- Verify `package.json` dependencies

### API Connection Issues
- Verify `NEXT_PUBLIC_BACKEND_URL` is correct
- Check Render backend logs
- Ensure CORS is enabled in `server.js`

### Aleo RPC Errors
- Verify Aleo endpoints are accessible
- Check network configuration (testnet vs mainnet)
- Review `lib/aleo-service.ts` logs

## Auto-Deployment

Both Vercel and Render will automatically redeploy when you push to your `main` branch on GitHub.

## Environment Variables Reference

### Required for Frontend (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_ALEO_ENDPOINT`

### Required for Backend (Render)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALEO_RPC_ENDPOINTS`
- `PORT` (set to 3001)

## Support

If you encounter issues:
1. Check deployment logs
2. Verify environment variables
3. Test locally first with `npm run build` and `npm start`
