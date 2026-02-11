# 🎯 ZAGROSS EXPRESS - Admin Panel Setup

## ✅ This ZIP is Ready to Use!

All components are included and the Supabase configuration is already set up.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Extract the ZIP
Extract this folder to your computer:
```
C:\Users\dell\developer\app\zagross-admin-panel
```

### Step 2: Install Dependencies
Open Command Prompt in the folder and run:
```bash
npm install
```

### Step 3: Start the Server
```bash
npm run dev
```

Then open your browser to: http://localhost:3000

---

## 🔐 Login Credentials

**Email:** `zyusf68@gmail.com`  
**Password:** `Lifewithv8$`

---

## ✅ What's Included

This admin panel has ALL features:

1. ✅ **Orders Management** - View and manage all orders
2. ✅ **Special Requests** - Respond to customer requests
3. ✅ **Wholesale Products** - Add/edit/delete products
4. ✅ **Customer Management** - View all customers
5. ✅ **External Links** - Manage marketplace links
6. ✅ **Financial Dashboard** - Track revenue and profits

---

## 🔧 Configuration

### Supabase is Already Configured!

The `.env` file already contains your Supabase credentials:
- Project URL: `https://xegkdbgatkmyieclmjod.supabase.co`
- API Key: Already set ✅

**If you need to change it:**
1. Open `.env` file
2. Get your key from: https://supabase.com/dashboard/project/xegkdbgatkmyieclmjod/settings/api
3. Copy the "anon" key
4. Replace the value in `.env`
5. Restart with `npm run dev`

---

## 📋 Make Sure You Ran the SQL Setup

If you haven't run the Supabase SQL yet:

1. Go to: https://supabase.com/dashboard/project/xegkdbgatkmyieclmjod
2. Click "SQL Editor"
3. Run the SQL from `SUPABASE_SETUP_SAFE.sql` file

---

## 🌐 Deploy to Production

### Option 1: Vercel (Recommended)
```bash
npm run build
# Then deploy the 'dist' folder to Vercel
```

### Option 2: Netlify
```bash
npm run build
# Upload 'dist' folder to Netlify
```

### Option 3: Cloudflare Pages
```bash
npm run build
# Upload 'dist' folder to Cloudflare Pages
```

---

## ❓ Troubleshooting

### Error: "Failed to resolve import"
**Solution:** Run `npm install` again

### Error: "Invalid API key"
**Solution:** 
1. Check your `.env` file
2. Make sure you copied the "anon" key (not service_role)
3. Restart the server

### Can't login?
**Solution:**
1. Make sure you ran the SQL setup in Supabase
2. Check that your email is: `zyusf68@gmail.com`
3. Password is: `Lifewithv8$`

---

## 📞 Need Help?

If you get stuck:
1. Check the `.env` file is correct
2. Make sure `npm install` completed successfully
3. Restart the server with `npm run dev`

---

## ✅ System Requirements

- Node.js 16+ 
- npm or bun
- Modern browser (Chrome, Firefox, Safari, Edge)

---

**You're ready to go!** 🚀

Run `npm install` then `npm run dev` and start managing your business!
