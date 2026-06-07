import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useSupabaseTable<T>(tableName: string, defaultInitial: T[]) {
  const [data, setData] = useState<T[]>(defaultInitial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTable() {
      setLoading(true);
      const { data: records, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
      } else {
        // Map database naming (snake_case) back to UI (camelCase) if needed
        // For simplicity, assuming direct mapping or leaving it to the component.
        if (records && records.length > 0) {
           setData(records as any[]);
        }
      }
      setLoading(false);
    }
    fetchTable();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel(`public:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, payload => {
         fetchTable(); // Re-fetch on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [tableName]);

  // Insert helper
  const addRecord = async (record: any) => {
    const { error } = await supabase.from(tableName).insert(record);
    if (error) throw error;
  };

  // Update helper
  const updateRecord = async (id: string, record: any) => {
    const { error } = await supabase.from(tableName).update(record).eq('id', id);
    if (error) throw error;
  };

  // Delete helper
  const deleteRecord = async (id: string) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
  };

  return { data, setData, loading, addRecord, updateRecord, deleteRecord };
}
