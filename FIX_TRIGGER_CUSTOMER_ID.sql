-- =====================================================
-- FIX: "record new has no field customer_id"
-- =====================================================
-- The orders table has "user_id", not "customer_id".
-- Run this in Supabase: SQL Editor → New query → Paste → Run
-- =====================================================

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  user_id_var UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Use user_id (orders table has user_id, not customer_id)
    user_id_var := NEW.user_id;

    CASE NEW.status
      WHEN 'quoted' THEN
        notification_title := 'Order Quoted';
        notification_body := 'Your order has been quoted. Check the app for details!';
      WHEN 'accepted' THEN
        notification_title := 'Order Accepted';
        notification_body := 'Your order has been accepted and is being processed!';
      WHEN 'buying' THEN
        notification_title := 'Order Being Purchased';
        notification_body := 'We are purchasing your items in China!';
      WHEN 'received_china' THEN
        notification_title := 'Items Received in China';
        notification_body := 'Your items have been received at our China warehouse!';
      WHEN 'preparing' THEN
        notification_title := 'Order Being Prepared';
        notification_body := 'Your order is being prepared for shipping!';
      WHEN 'on_the_way' THEN
        notification_title := 'Order Shipped!';
        notification_body := 'Your order is on the way to Iraq!';
      WHEN 'arrived_iraq' THEN
        notification_title := 'Order Arrived in Iraq';
        notification_body := 'Your order has arrived in Iraq and is being processed!';
      WHEN 'ready_pickup' THEN
        notification_title := 'Ready for Pickup!';
        notification_body := 'Your order is ready for pickup!';
      WHEN 'completed' THEN
        notification_title := 'Order Completed';
        notification_body := 'Thank you for your business!';
      WHEN 'cancelled' THEN
        notification_title := 'Order Cancelled';
        notification_body := 'Your order has been cancelled.';
      ELSE
        RETURN NEW;
    END CASE;

    -- Call Edge Function to send push (if configured)
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'userId', user_id_var,
          'title', notification_title,
          'body', notification_body,
          'data', jsonb_build_object(
            'orderId', NEW.id,
            'status', NEW.status,
            'type', 'order_update'
          )
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- If push fails (e.g. not configured), still allow the update
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists; the function is now fixed.
-- No need to drop/recreate the trigger.
