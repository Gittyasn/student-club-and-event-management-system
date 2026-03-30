-- Backfill missing event chat rows for the live chat module.
-- Older event creation code only inserted into legacy chat_rooms, while the UI reads public.chats.

INSERT INTO public.chats (type, reference_id, title)
SELECT
    'event',
    e.id,
    COALESCE(NULLIF(TRIM(e.title), ''), 'Event') || ' Discussion'
FROM public.events e
WHERE NOT EXISTS (
    SELECT 1
    FROM public.chats c
    WHERE c.type = 'event'
      AND c.reference_id = e.id
);

CREATE OR REPLACE FUNCTION public.ensure_event_chat_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.chats (type, reference_id, title)
    SELECT
        'event',
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.title), ''), 'Event') || ' Discussion'
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.chats c
        WHERE c.type = 'event'
          AND c.reference_id = NEW.id
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_event_chat_exists ON public.events;

CREATE TRIGGER trg_ensure_event_chat_exists
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.ensure_event_chat_exists();
