import { useEffect, useRef } from 'react';
import { supabase } from '../../services/auth';

export const useRealtimeTable = (
  table: string,
  onUpdateCallback: () => void
) => {
  const callback = useRef(onUpdateCallback);
  callback.current = onUpdateCallback;
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`realtime_${table}_channel`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => callback.current())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [table]);
};
