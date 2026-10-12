import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useRealtimeTable = (
  table: string,
  onUpdateCallback: () => void
) => {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime_${table}_channel`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        () => {
          onUpdateCallback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdateCallback]);
};
