# Crumbs - Feature Roadmap & Planning

> **App Vision**: Your personal food discovery companion - capture, rate, share, and discover the best food experiences

## 🎯 Current Status

**App Name**: crumbs  
**Version**: 1.0.0  
**Platform**: iOS/Android (Capacitor + React)  
**Database**: Supabase  

---

## 📱 CORE FEATURES MATRIX

### ✅ IMPLEMENTED FEATURES

#### 🍽️ Core Food Discovery
- [x] **Photo Capture** - Camera integration with front/back camera switching
- [x] **Image Gallery Upload** - Select existing photos from device
- [x] **AI Food Recognition** - Automatic product name, description, allergen detection
- [x] **Star Rating System** (1-5 stars with visual feedback)
  - Keep (4-5 stars) = Green
  - Neutral (3 stars) = Amber  
  - Avoid (1-2 stars) = Red
- [x] **Location Detection** - GPS coordinates and venue detection
- [x] **Price Tracking** - Multi-currency support with smart currency detection
- [x] **Personal Notes** - Custom text notes for each item
- [ ] **EXIF Data Extraction** - Photo metadata and GPS coordinates

#### 📝 List Management
- [x] **Create Custom Lists** - Named lists with descriptions
- [x] **Add Items to Lists** - Photo + metadata organization
- [x] **List Reordering** - Drag & drop list organization
- [x] **Edit Items** - Update ratings, notes, prices after creation
- [x] **Local Storage** - Offline-first with sync
- [x] **Item Deletion** - Remove items from lists
- [x] **List Rearrangement** - Custom list ordering

#### 👤 User Management
- [x] **Email Authentication** - Sign up/sign in with Supabase Auth
- [x] **User Profiles** - Basic profile information
- [x] **Session Management** - Persistent login across app launches
- [x] **Sign Out Functionality** - Clean state reset

#### 🎨 User Experience
- [x] **Modern UI** - Framer Motion animations, Tailwind CSS
- [half] **Image Cropping** - Crop photos before saving with react-easy-crop
- [x] **Loading States** - Multi-step loading with progress indicators
- [x] **Error Handling** - Retry mechanisms and connection monitoring
- [x] **Search Functionality** - Search user content
- [x] **Responsive Design** - Mobile-first responsive layout

---

## 🚧 HIGH PRIORITY FIXES (LAUNCH BLOCKERS)

### 📱 User Experience Issues
- [ ] **Keyboard Improvements** - Swipe typing, auto-capitalize, number pad for prices
- [ ] **Image Cropping Polish** - Corner dragging from corners, better crop area controls
- [x] **Android Back Button** - Native back button integration
- [ ] **Notes Encouragement** - Prompt when creating entry without notes: "Even a few words helps you remember why you loved this" with options to continue or go back, plus "Don't show again" checkbox
- [ ] **Visual Notes Importance** - Make notes section look more important and less optional

### 🔧 Technical Infrastructure  
- [ ] **Local Caching System** - Offline-first list management (attempted 2x but failed, needs backend work)
- [ ] **Performance Logging** - Page load times, AI processing duration, cache size logging
- [ ] **Image Optimization** - Reduce file sizes from current 300-600kb
- [ ] **Version Tracking** - Better app version and metadata tracking to Supabase

### 🎯 Core Feature Polish
- [ ] **Privacy Toggle** - Private/Public slider for items in AddItemModal (default public)
- [ ] **AI Detection Controls** - Currently the photo overlay doesnt look that great. Need to add retry button for failed AI (max 3 attempts)

---

## 🌟 SOCIAL FEED SYSTEM (MAJOR FEATURE)

### Current Feed Issues to Fix
- [ ] **Remove Placeholder Content** - Replace default feed items with real user-generated content
- [ ] **Visual Spacing Issue** - Remove large greyed out section between card bottom and footer
- [ ] **Real Data Integration** - Connect feed to actual user posts

### Feed Infrastructure  
- [ ] **Feed Algorithm Implementation**
  - "For You" tab: Recent discoveries from all users (up to date ones)
  - "Following" tab: Content from followed users only
- [ ] **Content Cards Design** - Each photo should show: Current design is good
  - Product photo
  - Product name  
  - Star rating
  - Location
  - User notes
  - Like count and comment count
  - Share button

### Social Interactions
- [ ] **Heart/Like System** - Like individual items and lists
- [ ] **Comment System** - Comment on public items with moderation
- [ ] **User Following** - Follow/unfollow other users
- [ ] **Profile Navigation** - Easy way to go from image → user → user's lists
- [ ] **Share Functionality** 
  - Internal sharing (within app)
  - External sharing (Instagram, etc.)
  - Multi-item list sharing

### Content Moderation & Safety
- [ ] **AI Content Filtering** - If AI detects inappropriate content, block and flag to admin
- [ ] **Admin Flagging System** - Report system with admin review workflow
- [ ] **Privacy Controls** - Granular privacy settings per item/list
- [ ] **Supabase Permissions** - Update permissions for sharing functionality

---

## 👤 ENHANCED USER EXPERIENCE

### Profile Improvements
- [ ] **Contact Support Button** - Add "Contact Support/Give Feedback" button in profile view
- [ ] **Profile Customization** - Avatar, bio, preferences
- [ ] **Activity Feed** - Personal activity history

### Authentication & Onboarding
- [ ] **Sign Up/Login Polish** - Fix current authentication flow issues
- [ ] **First Time User Flow** - Sliding popup sequence:
  1. "Welcome to [App Name]"
  2. "So many choices, so many products, but now you can finally save and share the best ones!"
  3. "Let's create your first memory list where we'll save your images" (Name: "The best...", Description: optional)
  4. "Now take a snap and never forget your faves!"
- [ ] **Permissions Page** - Confirm that popups come up everytime it needs a permission.

### App Functionality
- [ ] **Currency Improvements** -  A llow currency switching with memory
- [ ] **Notifications System** - Push notification infrastructure

---

## 🎮 GAMIFICATION SYSTEM

### Achievement Framework
- [ ] **Dynamic Achievement System** - Database-driven achievements (allow adding new ones without app updates)
- [ ] **Achievement Categories**:
  - Discovery achievements (first photo, 10th item, etc.)
  - Social achievements (first like, first follower, etc.)
  - Consistency achievements (weekly streaks, etc.)
  - Quality achievements (helpful reviews, etc.)
  - First one to take picture of certain product (use the ai generated information, not custom)
- [ ] **Achievement Display** - Future and completed achievements UI
- [ ] **Achievement Notifications** - Celebration when achievements unlocked

### Engagement Features
- [ ] **Discovery Streaks** - Daily/weekly discovery goals
- [ ] **Taste Profile Building** - Algorithm learning user preferences
- [ ] **Recommendation Engine** - Suggest new places/items based on history
- [ ] **Social Badges** - Community recognition badges

---

## 🚀 ADVANCED FEATURES (FUTURE PHASES)

### Smart Discovery
- [ ] **Venue Integration** - Rich venue data with hours, contact info
- [ ] **Menu Integration** - Link items to restaurant menus  
- [ ] **Seasonal Recommendations** - Time-based suggestions
- [ ] **Group Lists** - Collaborative lists with friends
- [ ] **List Templates** - Pre-made list ideas (Date Night, Quick Lunch, etc.)

### Business Features
- [ ] **Business Profiles** - Restaurant/venue claiming and management
- [ ] **Analytics for Businesses** - Insights on customer favorites
- [ ] **Promotional System** - Special offers for highly-rated venues

### Advanced Social
- [ ] **Stories Feature** - Temporary content sharing
- [ ] **Live Discovery** - Real-time sharing of discoveries
- [ ] **Events Integration** - Food events, tastings, pop-ups
- [ ] **Expert Reviewers** - Verified reviewer program

---

## 🛠️ TECHNICAL REQUIREMENTS

### Database Schema Additions Needed
```sql
-- Enhanced items table for social features
ALTER TABLE items ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE items ADD COLUMN like_count INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Social Features
CREATE TABLE user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id),
  following_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE item_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  item_id UUID REFERENCES items(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  item_id UUID REFERENCES items(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  flagged BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES comments(id) -- for threaded comments
);

-- Gamification
CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria JSON,
  points INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Enhanced AI metadata storage
CREATE TABLE ai_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id),
  detected_food_items JSON,
  confidence_scores JSON,
  processing_duration INTEGER,
  model_version TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance logging
CREATE TABLE performance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  duration INTEGER,
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Infrastructure Improvements
- **CDN Integration** - Image delivery optimization
- **Push Notifications** - Firebase Cloud Messaging integration
- **Error Monitoring** - Sentry for production error tracking
- **Performance Monitoring** - Real-time performance metrics
- **Backup Strategy** - Automated data backup and recovery

---

## 📋 IMPLEMENTATION PRIORITY

### 🔥 PHASE 1: LAUNCH READY (4-6 weeks)
**Goal**: Fix critical issues and basic social functionality

#### Week 1-2: Critical Fixes
1. **UI/UX Polish**
   - Fix keyboard issues (swipe, auto-capitalize, number pad)
   - Improve image cropping with corner dragging
   - Fix spacing in add item modal
   - Add notes encouragement prompt
   - Fix star rating logic bug

2. **Core Feature Polish**
   - Product card timestamp improvements
   - AI section redesign (collapsible)
   - Privacy toggle implementation
   - Scroll behavior improvements
   - AI detection control improvements

#### Week 3-4: Infrastructure
3. **Performance & Stability**
   - Implement performance logging system
   - Image optimization pipeline
   - Database schema updates for AI metadata
   - Version tracking improvements

#### Week 5-6: Basic Social
4. **MVP Social Feed**
   - Replace placeholder feed content
   - Fix visual spacing issues
   - Implement basic like system
   - User profile pages
   - Basic following system

### 🚀 PHASE 2: SOCIAL PLATFORM (6-8 weeks)
**Goal**: Full social engagement features

1. **Complete Social Features** (3-4 weeks)
   - Comment system with moderation
   - Advanced sharing (internal/external)
   - User discovery and search
   - Content reporting system
   - Admin moderation tools

2. **Gamification Foundation** (2-3 weeks)
   - Achievement system implementation
   - Basic recommendation algorithm
   - User statistics dashboard
   - Notification system

3. **Enhanced UX** (1-2 weeks)
   - First-time user onboarding flow
   - Authentication flow improvements
   - Local caching system (with backend support)

### 🌟 PHASE 3: ADVANCED FEATURES (8-10 weeks)
**Goal**: Platform differentiation and scale preparation

1. **Advanced Discovery** (4-5 weeks)
   - Venue integration and rich data
   - Collaborative lists
   - Advanced recommendation engine
   - Search and filtering enhancements

2. **Business Features** (2-3 weeks)
   - Business profile system
   - Analytics dashboard
   - Promotional system foundation

3. **Scale & Optimization** (2-3 weeks)
   - Performance optimization
   - Advanced moderation tools
   - API optimization and rate limiting

---

## 📊 SUCCESS METRICS

### User Engagement KPIs
- **Daily Active Users** (DAU) - Target: 70% week 1 retention
- **Photos Uploaded per User per Week** - Target: 3+ photos/user/week
- **Lists Created per User** - Target: 2+ lists/user in first month
- **Social Interactions** - Target: 5+ likes/comments per user per week
- **Session Duration** - Target: 5+ minutes average session

### Product Quality Metrics
- **AI Accuracy** - User satisfaction with AI suggestions (>80% helpful)
- **Discovery Rate** - New venues found through app recommendations
- **Sharing Rate** - Internal and external sharing frequency
- **Review Quality** - Helpfulness ratings of user notes and reviews

### Technical Performance
- **App Launch Time** - Target: <3 seconds
- **Image Processing Time** - Target: <5 seconds for AI analysis
- **Feed Load Time** - Target: <2 seconds
- **Crash Rate** - Target: <1% of sessions
- **Offline Functionality** - Core features work without internet

---

## 🔍 INNOVATION OPPORTUNITIES

### Unique Differentiators
1. **Micro-Location Discovery** - Specific dish recommendations within restaurants
2. **Taste DNA Matching** - Connect users with similar taste profiles
3. **Seasonal Intelligence** - Recommend seasonal items and limited offerings
4. **Cultural Context AI** - Understand cultural food preferences and dietary needs
5. **Social Proof Ranking** - Algorithm weighing trusted user opinions higher
6. **Real-time Discovery** - Live updates when friends discover new favorites

### Future Tech Integration
- **AR Menu Overlay** - Point camera at menu for personalized recommendations
- **Voice Notes** - Quick audio reviews while eating
- **Apple Watch Integration** - Quick rating and note-taking
- **Smart Photo Recognition** - Advanced AI for ingredient and allergen detection
- **Predictive Recommendations** - ML-powered taste prediction

---

## 🚫 OUT OF SCOPE (DELIBERATELY EXCLUDED)

### Features to Avoid Initially
- **Restaurant Reservations** - Complex integration, focus on discovery
- **Food Delivery Integration** - Outside core discovery mission
- **Recipe Sharing** - Different behavior pattern from food discovery
- **Professional Food Blogging** - Keep focus on personal discovery
- **Multiple Photo Albums** - Maintain simple single-photo focus
- **Video Content** - Photo-first experience for simplicity
- **Advanced Photo Editing** - Beyond basic cropping
- **Payment Processing** - No transactions in v1

---

## 🎉 LAUNCH READINESS CHECKLIST

### Technical Readiness
- [ ] All Phase 1 features completed and tested
- [ ] Performance targets met (load times, crash rates)
- [ ] Database optimizations and schema updates complete
- [ ] Image optimization pipeline implemented
- [ ] Error monitoring and logging systems active
- [ ] Backup and disaster recovery tested

### Product Readiness
- [ ] User onboarding flow tested and polished
- [ ] Social features working end-to-end
- [ ] Content moderation system operational
- [ ] Privacy controls and settings complete
- [ ] Search and discovery functionality tested
- [ ] Mobile app store compliance met

### Business Readiness
- [ ] App Store and Play Store assets prepared
- [ ] Privacy policy and terms of service complete
- [ ] Community guidelines established
- [ ] Support documentation created
- [ ] Beta testing completed with 50+ users
- [ ] Marketing materials and landing page ready

### Operational Readiness
- [ ] Customer support system established
- [ ] Analytics and monitoring dashboards active
- [ ] Content moderation team/process in place
- [ ] Scaling infrastructure prepared
- [ ] Launch sequence and rollout plan finalized

---

## 🎨 DESIGN SYSTEM NEEDS

### New Components Required
- [ ] **Comment Component** - Threaded comments with moderation controls
- [ ] **User Card Component** - Consistent user display across app
- [ ] **Achievement Badge Component** - Gamification visual elements
- [ ] **Share Sheet Component** - Native sharing integration
- [ ] **Search Components** - Advanced filtering and search UI
- [ ] **Feed Card Component** - Social feed item display
- [ ] **Privacy Toggle Component** - Inline privacy controls
- [ ] **Notification Component** - In-app notification system

### Design Patterns to Implement
- **Pull-to-Refresh** - Standard mobile refresh for feeds
- **Infinite Scroll** - Pagination for feed and search results
- **Bottom Sheets** - Modal alternatives for mobile interactions
- **Progressive Disclosure** - Collapsible sections for detailed information
- **Empty States** - Helpful empty state designs for new users

---

## 📱 ALTERNATIVE APP NAME IDEAS

Based on requirements for memorable, shareable, and unique names:

### Top Contenders
- **crumbs** (current) - Simple, memorable, food-related
- **Nombook** - "Nom" (eating) + book, easy to say "Have you tried Nombook?"
- **Trove** - Discovery-focused, implies collection of treasures
- **Cultured** - Sophisticated, food culture focus
- **Topist** - "Top" + "ist", implies curated best-of lists

### Evaluation Criteria
- Memorable association with food discovery ✓
- Easy to talk about and share ✓  
- Unique in food/social space ✓
- Slightly unexpected to spark curiosity ✓

---

*This roadmap is a living document and should be updated based on user feedback, technical discoveries, and market research. Last updated: [Current Date]*
