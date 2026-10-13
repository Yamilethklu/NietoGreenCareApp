import { useEffect, useRef } from 'react';
import { supabase } from '../../services/auth';

export const useRealtimeTable = (
  table: string,
  onUpdateCallback: () => void,
  onInsert?: (row: Record<string, any>) => void,
) => {
  const callback = useRef(onUpdateCallback);
  callback.current = onUpdateCallback;
  const insert = useRef(onInsert);
  insert.current = onInsert;
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`realtime_${table}_channel`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (payload.eventType === 'INSERT') insert.current?.(payload.new as Record<string, any>);
        callback.current();
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [table]);
};
