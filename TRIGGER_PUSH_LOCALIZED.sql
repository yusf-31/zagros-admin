-- =====================================================
-- PUSH NOTIFICATIONS - Localized by user language
-- =====================================================
-- Sends status + orderId to Edge Function so the notification
-- is built in the user's language (en/ar/ku) with "#orderRef Quoted. Check the price."
-- Run this in Supabase SQL Editor after the Edge Function is deployed.
-- =====================================================

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_id_var UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    user_id_var := NEW.user_id;

    -- Only notify for known statuses
    IF NEW.status IN (
      'quoted', 'accepted', 'buying', 'received_china', 'preparing',
      'on_the_way', 'arrived_iraq', 'ready_pickup', 'completed', 'cancelled'
    ) THEN
      BEGIN
        PERFORM net.http_post(
          url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'userId', user_id_var,
            'status', NEW.status,
            'orderId', NEW.id,
            'data', jsonb_build_object(
              'orderId', NEW.id,
              'status', NEW.status,
              'type', 'order_update'
            )
          )
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists; no need to recreate it.
