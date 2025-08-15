// Test script to verify First-in-World modal is disabled
// Run this in browser console to test the fix

// Test function to simulate a first-in-world achievement
window.testFirstInWorldAchievement = () => {
  console.log('🧪 Testing First-in-World Achievement (should show glow + toast, NOT modal)');
  
  // Get the global achievements system
  const globalAchievements = window.useGlobalAchievements?.();
  if (!globalAchievements?.showAchievement) {
    console.error('❌ Global achievements system not available');
    return;
  }
  
  // Trigger a mock first-in-world achievement
  globalAchievements.showAchievement({
    achievement: {
      id: 'test-first-in-world',
      name: 'First in World: Test Product',
      description: 'You are the first person ever to photograph this product!',
      icon: '🌍',
      rarity: 'legendary'  // This would normally trigger a modal
    },
    isGlobalFirst: true,   // This should prevent the modal
    count: 1,
    isRepeatable: false
  });
  
  console.log('✅ Achievement triggered. Check that:');
  console.log('   - Toast notification appears (green notification)');
  console.log('   - NO modal appears (no full-screen popup)');
  console.log('   - Glow effects work in AddItemModal when saving items');
};

// Auto-register the test function
if (typeof window !== 'undefined') {
  console.log('🧪 First-in-World modal fix test loaded');
  console.log('   Run: window.testFirstInWorldAchievement()');
}
