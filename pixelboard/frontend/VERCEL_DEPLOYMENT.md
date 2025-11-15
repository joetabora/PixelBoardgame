# Vercel Deployment Guide for Pixlnary Frontend

## Environment Variables

Set the following environment variable in your Vercel project settings:

### Required:
- `VITE_SERVER_URL` - Your Render backend URL (e.g., `https://your-app.onrender.com`)

## Setup Instructions

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Environment Variables
   - Add: `VITE_SERVER_URL` = `https://your-render-backend.onrender.com`
   - Make sure it's set for **Production**, **Preview**, and **Development** environments

2. **Build Settings:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Root Directory:**
   - Set to: `pixelboard/frontend` (if deploying from monorepo root)
   - Or deploy the `pixelboard/frontend` folder directly

## Important Notes

- The `.env.production` file is for reference only
- **Always set environment variables in Vercel dashboard**, not in files
- Vite will replace `import.meta.env.VITE_SERVER_URL` at build time
- After setting environment variables, trigger a new deployment

## Testing

After deployment, verify:
1. The app loads without errors
2. Socket connection works (check browser console)
3. Game functionality works correctly

