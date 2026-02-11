# 🎯 ZAGROSS EXPRESS - Admin Dashboard

**Professional admin panel for managing ZAGROSS EXPRESS operations**

Completely separate from the mobile app. Deploy to your own domain.

---

## ✅ What's This?

A clean, professional admin dashboard for:
- ✅ Managing all orders
- ✅ Updating order statuses
- ✅ Viewing customer information
- ✅ Real-time order updates
- ✅ Dashboard statistics
- ✅ Admin-only access

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Opens at: **http://localhost:3000**

### 3. Login
Use your admin credentials:
- Email: `zyusf68@gmail.com`
- Password: `Lifewithv8$`

---

## 🌐 Deploy to Your Domain

### Option 1: Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Go to: https://vercel.com
3. Click **"Import Project"**
4. Select your GitHub repo
5. Click **Deploy**
6. Connect your domain (admin.zagross.com)

**Environment Variables:**
- `VITE_SUPABASE_URL`: `https://xegkdbgatkmyieclmjod.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: (from .env file)

### Option 2: Deploy to Netlify

```bash
npm run build
```

Upload the `dist` folder to Netlify.

### Option 3: Deploy to GitHub Pages

```bash
npm run build
```

Push `dist` folder to `gh-pages` branch.

---

## 🔐 Admin Credentials

**Your Admin Account:**
- Email: `zyusf68@gmail.com`
- Password: `Lifewithv8$`

**Make sure you ran this SQL:**
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'zyusf68@gmail.com';
```

---

## 📊 Features

### Dashboard
- Total orders count
- Pending orders count
- Completed orders count
- Total users count
- Recent orders list

### Order Management
- View all orders in real-time
- Update order status with dropdown
- See customer information
- Click product links
- Auto-refreshes when orders change

### Security
- Email + password authentication only
- Admin role required (checked from database)
- Auto-redirect if not admin
- Secure Supabase connection

---

## 🔄 How It Works

```
1. Admin logs in with email/password
         ↓
2. System checks admin role in database
         ↓
3. If admin → Show dashboard
   If not admin → Redirect to login
         ↓
4. Admin updates order status
         ↓
5. Database trigger fires
         ↓
6. Customer gets push notification
         ↓
7. Dashboard auto-updates (real-time)
```

---

## 🎨 Order Statuses

Admin can change orders to:
- **pending** - New order
- **quoted** - Price quoted
- **accepted** - Order accepted
- **buying** - Purchasing in China
- **received_china** - Received at China warehouse
- **preparing** - Preparing for shipment
- **on_the_way** - Shipped to Iraq
- **arrived_iraq** - Arrived in Iraq
- **ready_pickup** - Ready for customer pickup
- **completed** - Order completed
- **cancelled** - Order cancelled

Each status change triggers a push notification to the customer!

---

## 📱 Connected to Mobile App

This admin panel shares the same database as the mobile app:
- Changes here → Visible in mobile app instantly
- Orders from mobile app → Visible here instantly
- Real-time sync via Supabase

---

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Supabase** - Backend & real-time
- **React Query** - Data fetching
- **React Router** - Navigation

---

## 📂 Project Structure

```
zagross-admin-panel/
├── src/
│   ├── components/
│   │   └── ui/          ← UI components
│   ├── contexts/
│   │   └── AuthContext.tsx  ← Authentication
│   ├── lib/
│   │   ├── supabase.ts  ← Supabase client
│   │   └── utils.ts     ← Utilities
│   ├── pages/
│   │   ├── Login.tsx    ← Login page
│   │   └── Dashboard.tsx ← Main dashboard
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env                 ← Supabase config
├── package.json
└── README.md
```

---

## 🔧 Development

### Available Commands
```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Build for production
npm run preview  # Preview production build
```

### Adding Features
This is a clean, minimal admin panel. You can easily add:
- More statistics
- Charts and graphs
- User management page
- Financial reports page
- Export to Excel
- Print labels
- Bulk operations

---

## 🆘 Troubleshooting

### Can't login?
- Make sure admin role is set in database
- Check credentials are correct
- Verify Supabase connection in `.env`

### "Access denied" after login?
- Run the SQL to add admin role (see above)
- Check `user_roles` table in Supabase

### Orders not showing?
- Check database has orders
- Verify Supabase connection
- Check browser console for errors

### Changes not syncing to mobile app?
- Both should use same Supabase project
- Check `.env` has correct project ID

---

## ✅ Pre-Deployment Checklist

- [ ] Tested login locally
- [ ] Can see orders
- [ ] Can update order status
- [ ] Real-time updates working
- [ ] Built successfully (`npm run build`)
- [ ] Ready to deploy

---

## 🎉 You're Ready!

This admin panel is:
- ✅ Completely separate from mobile app
- ✅ Connected to same database
- ✅ Real-time updates
- ✅ Professional UI
- ✅ Ready to deploy

Deploy it to your domain and start managing orders! 🚀

---

## 📞 Support

**Supabase Project:** `xegkdbgatkmyieclmjod`

**Dashboard:** https://supabase.com/dashboard/project/xegkdbgatkmyieclmjod

**Mobile App:** Separate ZIP file

---

**Built for ZAGROSS EXPRESS** 🎯
