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

const steps = [
  { key: 'session', label: 'Loading user session...' },
  { key: 'images', label: 'Loading images...' },
  { key: 'profile', label: 'Loading profile...' },
  { key: 'lists', label: 'Loading lists...' },
];

const MultiStepLoadingScreen = ({ listsLoading, appLoading, imagesLoading, profileLoading }) => {
  // Determine which step is active
  const stepStates = [
    !appLoading,
    !imagesLoading,
    !profileLoading,
    !listsLoading,
  ];
  const currentStep = stepStates.findIndex(done => !done);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-yellow-100 via-pink-50 to-blue-100">
      {/* Centered, large, fashionable icon */}
      <div className="flex flex-col items-center justify-center w-full" style={{ minHeight: 320 }}>
        <div className="relative w-44 h-44 flex items-center justify-center mb-10 mx-auto">
          <div className="absolute inset-0 animate-bounce flex items-center justify-center">
            <span style={{ fontSize: 180, filter: 'drop-shadow(0 8px 32px #ff6b9d88)' }}>🍦</span>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-pink-200 rounded-full blur-md animate-pulse"></div>
        </div>
      </div>
      {/* Steps */}
      <div className="w-full max-w-xs mx-auto flex flex-col gap-4 mt-2">
        {steps.map((step, idx) => {
          const done = stepStates[idx];
          const isActive = idx === currentStep;
          return (
            <div
              key={step.key}
              className={
                `flex items-center gap-3 px-4 py-3 rounded-xl shadow transition-all ` +
                (done
                  ? 'bg-green-50 text-green-700 font-bold'
                  : isActive
                  ? 'bg-pink-100 text-pink-600 font-semibold animate-pulse'
                  : 'bg-gray-100 text-gray-400')
              }
              style={{ minHeight: 48 }}
            >
              <div className="w-7 flex justify-center items-center">
                {done ? (
                  <span className="text-green-500 text-2xl">✓</span>
                ) : isActive ? (
                  <span className="w-3 h-3 rounded-full bg-pink-400 animate-pulse block"></span>
                ) : (
                  <span className="w-3 h-3 rounded-full bg-gray-300 block"></span>
                )}
              </div>
              <span className="flex-1 text-base">{step.label.replace('Loading', done ? 'Loaded' : 'Loading')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('camera');
  const [selectedList, setSelectedList] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const { lists, loading: listsLoading, addItemToList, updateItemInList, refreshLists, createList } = useLists(user?.id);
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
        setAppLoading(false);
      }
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setAppLoading(false);
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

  if (listsLoading || appLoading || imagesLoading || profileLoading) {
    return <MultiStepLoadingScreen listsLoading={listsLoading} appLoading={appLoading} imagesLoading={imagesLoading} profileLoading={profileLoading} />;
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
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-repeat" 
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff6b9d' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
               }}>
          </div>
        </div>

        <motion.div 
          className="relative z-10 bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-400 p-3 pb-3 overflow-hidden"
          style={{ minHeight: 64 }}
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="absolute bottom-0 left-0 w-10 h-10 bg-white/10 rounded-full translate-y-6 -translate-x-6"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="text-center flex-1">
              <motion.div
                className="flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Comic Sans MS, cursive', letterSpacing: '0.15em' }}>
                  bestlist
                </h1>
              </motion.div>
            </div>
            <motion.button
              onClick={() => setShowProfile(true)}
              className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              <User className="text-white" size={18} />
            </motion.button>
          </div>
        </motion.div>

        <div className="relative z-10 flex-1 overflow-y-auto pb-24">
          <AnimatePresence mode="wait">
            {activeTab === 'camera' && (
              <motion.div
                key="camera"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <CameraView
                  lists={lists}
                  loading={listsLoading}
                  onAddItem={addItemToList}
                  onSelectList={list => {
                    const latest = lists.find(l => l.id === list.id);
                    if (latest) {
                      setSelectedList({...latest});
                    }
                  }}
                  onCreateList={handleCreateList}
                />
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