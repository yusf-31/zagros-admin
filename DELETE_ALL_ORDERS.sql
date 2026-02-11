-- =====================================================
-- DELETE ALL ORDERS
-- =====================================================
-- Run this in Supabase: SQL Editor → New query → Paste → Run
-- This permanently deletes every row in public.orders.
-- =====================================================

DELETE FROM public.orders;

-- Optional: reset identity/sequence if you use serial IDs (orders use UUID, so not needed)
-- To verify count after delete:
-- SELECT COUNT(*) FROM public.orders;
