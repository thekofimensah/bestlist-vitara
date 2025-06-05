import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useLists = (userId) => {
  const [lists, setLists] = useState([
    {
      id: '1',
      name: 'Best Gelato',
      color: '#FF6B9D',
      items: [],
      stayAways: []
    },
    {
      id: '2', 
      name: 'Amazing Fish',
      color: '#4ECDC4',
      items: [],
      stayAways: []
    },
    {
      id: '3',
      name: 'Perfect Milk', 
      color: '#FFE66D',
      items: [],
      stayAways: []
    }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchLists();
    }
  }, [userId]);

  const fetchLists = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      if (listsData && listsData.length > 0) {
        const listsWithItems = await Promise.all(
          listsData.map(async (list) => {
            const { data: itemsData, error: itemsError } = await supabase
              .from('items')
              .select('*')
              .eq('list_id', list.id)
              .order('created_at', { ascending: false });

            if (itemsError) throw itemsError;

            const items = itemsData?.filter(item => !item.is_stay_away) || [];
            const stayAways = itemsData?.filter(item => item.is_stay_away) || [];

            return {
              ...list,
              items,
              stayAways
            };
          })
        );
        setLists(listsWithItems);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItemToList = async (listIds, item, isStayAway = false) => {
    if (!userId) return;

    try {
      for (const listId of listIds) {
        const { data, error } = await supabase
          .from('items')
          .insert([{
            list_id: listId,
            name: item.name,
            type: item.type,
            species: item.species,
            certainty: item.certainty,
            tags: item.tags,
            image_url: item.image,
            rating: item.rating,
            notes: item.notes,
            location: item.location,
            is_stay_away: isStayAway
          }])
          .select()
          .single();

        if (error) throw error;

        setLists(prev => prev.map(list => {
          if (list.id === listId) {
            const newItem = {
              ...item,
              id: data.id,
              image: item.image
            };
            return {
              ...list,
              items: isStayAway ? list.items : [...list.items, newItem],
              stayAways: isStayAway ? [...list.stayAways, newItem] : list.stayAways
            };
          }
          return list;
        }));
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const refreshLists = () => {
    if (userId) {
      fetchLists();
    }
  };

  return {
    lists,
    loading,
    addItemToList,
    refreshLists
  };
};