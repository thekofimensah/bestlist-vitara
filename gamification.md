
### **High-Level Plan: Gamification & Achievement System**

**Vision:** To transform food discovery into an addictive, **Pokémon-card-like treasure hunt**. The system will be database-driven, allowing for the addition or modification of achievements, rewards, and rarity tiers without requiring an app update.

---

### **Phase 0: Prerequisites - The Statistics Engine**

This foundational phase is already complete but is critical for the gamification system.

*   **Task:** The `hooks/useUserStats.js` hook provides the real-time player statistics (e.g., `itemsSaved`, `photosTaken`) that will serve as the basis for many of the achievements. This engine is the source of truth for all counter-based achievements.

---

### **Phase 1: Backend & Database Foundation**

This phase focuses on setting up the flexible backend infrastructure to store and manage achievements.

*   **Step 1.1: Implement the Database Schema**
    *   We'll create two core tables in Supabase exactly as defined in your roadmap:
        1.  `achievements`: The master list of all possible achievements. It will define `name`, `description`, `icon`, `rarity` ('common', 'rare', 'legendary'), `category`, `reward_points`, and the specific `criteria` (as JSON) needed to unlock it.
        2.  `user_achievements`: A ledger that tracks which achievements each user has earned, when they earned them, and any progress data.

*   **Step 1.2: Populate Initial Achievement Categories & Tiers**
    *   We'll populate the `achievements` table with a rich set of initial goals based on your roadmap's categories:
        *   **🔍 Discovery Achievements:**
            *   "First Bite" (first item saved).
            *   "First in the World" (be the first user globally to photograph a specific item). This is a special case that will affect only the additemmodal page and show a sorrt of interesting animation to indicate they are the first. It's one of the only mmediate features.
            *   "Globetrotter" (first to photograph a product from a given country). (use location)
        *   **⭐ Quality Achievements:**
            *   "Detailed Reviewer" (write detailed notes for 10 items).
            *   "Five Star Hunter" (find 10 five-star items).
        *   **🔥 Collector & Streak Achievements (Milestones):**
            *   "Collector" (save 10 items), "Curator" (50 items), "Archivist" (100 items).
            *   "Daily Discoverer" (discover items 3 days in a row).
        *   **📱 Social Achievements (Future-Proofing):** The schema will be ready for future social achievements like "Influencer" (get 10 likes), "First Follower", etc.

---

### **Phase 2: Core Logic & The Achievement Engine**

With the database ready, we'll build the engine that detects user actions and awards achievements.

*   **Step 2.1: Create a Central `useAchievements` Hook**
    *   This new hook will be the brains of the operation. Its responsibilities will be to:
        1.  **Check for newly earned achievements** after a specific user action.
        2.  **Track progress** toward more complex achievements.
        3.  **Award achievements** by creating a new entry in the `user_achievements` table.
        4.  **Trigger the UI celebration** to notify the user.

*   **Step 2.2: Integrate Achievement Triggers into the App**
    *   We will identify key user actions in the codebase and insert triggers to call the `useAchievements` hook. Prime locations include:
        *   After an item is successfully saved (in `itemUtils.js` or `useLists.js`).
        *   After a user successfully uploads a new photo (in `imageUtils.js`).

*   **Step 2.3: Implement Achievement "Checker" Functions**
    *   Inside the `useAchievements` hook, we'll write modular functions to evaluate the different criteria defined in the `achievements` table:
        *   **Counter Check:** Checks a user's stats against a value (e.g., `totalItems >= 10`).
        *   **"First-Time" Check:** Verifies if this is the user's very first action of a certain type (e.g., their first item ever).
        *   **"Global First" Check:** A more complex query to see if any other user in the database has already completed a specific action (e.g., photographed a specific barcode).

---

### **Phase 3: UI/UX & The Celebration**

This final phase makes the system visible, exciting, and rewarding for the user.

*   **Step 3.1: Design and Build Rich "Achievement Unlocked" Experiences**
    *   We will create multiple notification components to match the importance of the achievement, as specified in the roadmap:
        *   **Top Slide-Down "Toast" Notification:** For common achievements, a simple banner will slide down from the top of the screen with the achievement icon and name.
        *   **Full-Screen Modal Celebration:** For major milestones or rare discoveries ("First in the World!"), a full-screen modal will appear with more dramatic effects like **confetti animations**.
        *   We will incorporate **haptic feedback** (phone vibration) to make the unlocks feel more impactful.

*   **Step 3.2: Create an "Achievements" Gallery on the Profile Page**
    *   We'll add a new "Trophy Case" section to the `ProfileView.jsx` component.
    *   This section will fetch and display all achievements the user has earned, organized by category or rarity. It will serve as a visual showcase of their progress and status.

*   **Step 3.3: Implement Smart Notification Timing (Anti-Spam)**
    *   To avoid overwhelming users, we'll build a smart notification queue as outlined in your roadmap:
        *   **Notification Batching:** If a user unlocks multiple achievements at once, they can be grouped into a single summary notification.
        *   **Priority System:** Only the most important achievements (e.g., "Legendary" rarity) will be shown immediately. Others might be queued until the user visits their profile.
        *   **Cool-down Periods:** We'll limit the number of notifications that can appear within a single session to keep them special.

*   **Step 3.4: Connect the Engine to the UI**
    *   The final step is to have the `useAchievements` hook trigger the appropriate UI celebration (toast or modal) from the smart notification system, providing instant, satisfying feedback to the user.
