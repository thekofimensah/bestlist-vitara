import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CameraView from './components/CameraView';
import ListsView from './components/ListsView';
import ListDetailView from './components/ListDetailView';
import DiscoverView from './components/DiscoverView';
import AuthView from './components/AuthView';
import ProfileView from './components/ProfileView';
import { Camera, List, Compass, User } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useLists } from './hooks/useLists';
import AddItemModal from './components/AddItemModal';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('camera');
  const [selectedList, setSelectedList] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const { lists, addItemToList, updateItemInList, refreshLists, createList } = useLists(user?.id);
  const [editingItem, setEditingItem] = useState(null);
  const [editingList, setEditingList] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedList) {
      const updated = lists.find(l => l.id === selectedList.id);
      if (updated) setSelectedList(updated);
    }
  }, [lists]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setSelectedList(null);
  };

  const handleCreateList = async (name, color) => {
    await createList(name, color);
  };

  const TabButton = ({ icon: Icon, label, isActive, onClick }) => (
    <motion.div
      onClick={onClick}
      className={`flex flex-col items-center p-3 rounded-2xl transition-all cursor-pointer ${
        isActive 
          ? 'bg-gradient-to-br from-pink-400 to-orange-400 text-white shadow-lg' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
    >
      <Icon size={24} />
      <span className="text-xs mt-1 font-bold">{label}</span>
    </motion.div>
  );

  if (showProfile) {
    return <ProfileView onBack={() => setShowProfile(false)} />;
  }

  if (selectedList) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-pink-50 to-blue-100">
        <div className="max-w-md mx-auto bg-white min-h-screen">
          <ListDetailView 
            key={selectedList.id}
            list={selectedList} 
            onBack={() => setSelectedList(null)}
            onAddItem={addItemToList}
            onEditItem={(item, list) => {
              setEditingItem(item);
              setEditingList(list);
            }}
          />
          {editingItem && (
            <AddItemModal
              image={editingItem?.image_url || editingItem?.image}
              item={editingItem}
              lists={lists}
              onClose={() => {
                setEditingItem(null);
                setEditingList(null);
              }}
              onSave={async (listsToUpdate, updatedItem, isStayAway) => {
                if (editingItem && editingItem.id) {
                  await updateItemInList(listsToUpdate, { ...updatedItem, id: editingItem.id }, isStayAway);
                } else {
                  await addItemToList(listsToUpdate, updatedItem, isStayAway);
                }
                setEditingItem(null);
                setEditingList(null);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-pink-50 to-blue-100">
      <div className="max-w-md mx-auto bg-white min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-repeat" 
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff6b9d' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
               }}>
          </div>
        </div>

        <motion.div 
          className="relative z-10 bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-400 p-6 pb-8 overflow-hidden"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
          <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white/20 rounded-full"></div>
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white/30 rounded-full"></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="text-center flex-1">
              <motion.div
                className="flex items-center justify-center mb-2"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Comic Sans MS, cursive', letterSpacing: '0.15em' }}>
                  bestlist
                </h1>
              </motion.div>
              <motion.p 
                className="text-white/90 text-sm font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                track your favorite discoveries
              </motion.p>
            </div>
            
            <motion.button
              onClick={() => setShowProfile(true)}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              <User className="text-white" size={20} />
            </motion.button>
          </div>
        </motion.div>

        <div className="relative z-10 flex-1 pb-20">
          <AnimatePresence mode="wait">
            {activeTab === 'camera' && (
              <motion.div
                key="camera"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <CameraView lists={lists} onAddItem={addItemToList} onSelectList={list => {
                  const latest = lists.find(l => l.id === list.id);
                  if (latest) {
                    setSelectedList({...latest});
                  }
                }} />
              </motion.div>
            )}
            {activeTab === 'lists' && (
              <motion.div
                key="lists"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <ListsView
                  lists={lists}
                  onSelectList={list => {
                    const latest = lists.find(l => l.id === list.id);
                    if (latest) {
                      setSelectedList({...latest});
                    }
                  }}
                  onCreateList={handleCreateList}
                  onEditItem={(item, list) => {
                    console.log('Edit item:', item, 'in list:', list);
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'discover' && (
              <motion.div
                key="discover"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <DiscoverView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div 
          className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-4 z-20"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
        >
          <div className="flex justify-around items-center">
            <TabButton 
              icon={Camera} 
              label="Capture" 
              isActive={activeTab === 'camera'}
              onClick={() => handleTabClick('camera')}
            />
            <TabButton 
              icon={List} 
              label="Lists" 
              isActive={activeTab === 'lists'}
              onClick={() => handleTabClick('lists')}
            />
            <TabButton 
              icon={Compass} 
              label="Discover" 
              isActive={activeTab === 'discover'}
              onClick={() => handleTabClick('discover')}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default App;