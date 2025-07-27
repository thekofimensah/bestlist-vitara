# Feed Implementation Roadmap

## Overview
Transform the current mock feed into a real social feed with public posts, likes, comments, following system, and proper content moderation.

## Current State Analysis

### MainScreen.jsx
- ✅ Mock feed UI with PostCard components
- ✅ Basic like functionality (local only)
- ✅ "For You" and "Following" tabs
- ✅ Post structure: user, image, rating, verdict, tags, snippet, likes, comments
- ❌ No real data integration
- ❌ No comment functionality
- ❌ No user profiles or following

### supabase.js
- ✅ Basic auth and database helpers
- ✅ Item and list management
- ✅ Photo upload functionality
- ❌ No social features (likes, comments, follows)
- ❌ No public/private permissions
- ❌ No feed data fetching

## Database Schema Design

### 1. New Tables Needed
```sql
-- User profiles (extend existing auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Posts (public items from lists)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  item_id UUID REFERENCES items(id),
  list_id UUID REFERENCES lists(id),
  is_public BOOLEAN DEFAULT true,
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Likes
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  post_id UUID REFERENCES posts(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  post_id UUID REFERENCES posts(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Follows
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id),
  following_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Content moderation flags
CREATE TABLE content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  user_id UUID REFERENCES auth.users(id),
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, reviewed, dismissed
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Update Existing Tables
```sql
-- Add privacy settings to items
ALTER TABLE items ADD COLUMN is_public BOOLEAN DEFAULT true;
ALTER TABLE items ADD COLUMN location TEXT;

-- Add privacy settings to lists
ALTER TABLE lists ADD COLUMN is_public BOOLEAN DEFAULT true;
```

## Implementation Plan

### Phase 1: Database Setup & Backend Foundation (Files: supabase.js)

#### Step 1.1: Create Database Schema
- Create all new tables with proper RLS policies
- Add indexes for performance
- Set up triggers for updated_at timestamps

#### Step 1.2: Row Level Security (RLS) Policies
```sql
-- Posts: Public posts are viewable by all, private by owner only
CREATE POLICY "Public posts are viewable by everyone" ON posts
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own posts" ON posts
  FOR SELECT USING (auth.uid() = user_id);

-- Likes: Users can like public posts
CREATE POLICY "Users can like public posts" ON likes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_id AND posts.is_public = true
    )
  );
```

#### Step 1.3: Add Feed Functions to supabase.js
```javascript
// Feed data fetching
export const getFeedPosts = async (type = 'for_you', limit = 20, offset = 0)
export const getUserPosts = async (userId, limit = 20, offset = 0)
export const createPost = async (itemId, listId, isPublic = true, location = null)

// Social interactions
export const likePost = async (postId)
export const unlikePost = async (postId) 
export const getPostLikes = async (postId)
export const commentOnPost = async (postId, content)
export const getPostComments = async (postId)

// User following
export const followUser = async (userId)
export const unfollowUser = async (userId)
export const getUserFollowers = async (userId)
export const getUserFollowing = async (userId)
export const getFollowingFeed = async (limit = 20, offset = 0)

// User profiles
export const createUserProfile = async (username, displayName, bio)
export const getUserProfile = async (userId)
export const updateUserProfile = async (updates)
export const searchUsers = async (query)
```

### Phase 2: UI Components & Feed Logic (Files: MainScreen.jsx, new components)

#### Step 2.1: Update PostCard Component (MainScreen.jsx)
- Connect to real data instead of mock data
- Implement real like/unlike functionality
- Add comment count and comment modal trigger
- Add user profile navigation
- Add share functionality
- Add report/flag functionality

#### Step 2.2: Create New Components
**components/UserProfile.jsx**
- User profile view with posts grid
- Follow/unfollow button
- Follower/following counts
- Edit profile (if own profile)

**components/CommentModal.jsx**
- List comments for a post
- Add new comment functionality
- Delete own comments
- Report comments

**components/FollowersModal.jsx**
- List followers/following
- Search and follow new users

**components/ShareModal.jsx**
- Internal sharing (to followers)
- External sharing (social media, link)

#### Step 2.3: Update Feed Logic (MainScreen.jsx)
```javascript
// Replace mock data with real feed
const [posts, setPosts] = useState([]);
const [loading, setLoading] = useState(false);
const [hasMore, setHasMore] = useState(true);

// Implement infinite scroll
const loadMorePosts = async () => {
  const feedType = selectedTab === 'For You' ? 'for_you' : 'following';
  const newPosts = await getFeedPosts(feedType, 10, posts.length);
  // Append to existing posts
};

// Real like functionality
const handleLike = async (postId) => {
  try {
    await likePost(postId);
    // Update local state optimistically
  } catch (error) {
    // Handle error
  }
};
```

### Phase 3: Public/Private Toggle (Files: AddItemModal.jsx)

#### Step 3.1: Add Privacy Toggle to AddItemModal.jsx
- Add toggle switch component
- Default to public (as per requirements)
- Save privacy setting with item
- Auto-create post if public

```javascript
// Add to AddItemModal state
const [isPublic, setIsPublic] = useState(true);

// Add to save function
const handleSave = async (selectedListIds, item) => {
  const itemData = { ...item, is_public: isPublic };
  const savedItem = await addItemToList(selectedListIds, itemData);
  
  // Create public post if item is public
  if (isPublic && savedItem) {
    await createPost(savedItem.id, selectedListIds[0], true, deviceLocation);
  }
};
```

### Phase 4: Content Moderation & AI Integration (Files: useAI.js, supabase.js)

#### Step 4.1: Update AI Analysis (useAI.js)
- Add content appropriateness check to AI analysis
- Flag inappropriate content automatically
- Prevent posting of flagged content

#### Step 4.2: Add Moderation Functions (supabase.js)
```javascript
export const flagContent = async (postId, reason)
export const getModerationQueue = async () // Admin only
export const reviewFlag = async (flagId, action) // Admin only
```

### Phase 5: User Experience Improvements

#### Step 5.1: Fix UI Issues (MainScreen.jsx)
- Remove greyed out section between feed card and footer
- Improve scrolling performance
- Add pull-to-refresh for feed (already implemented)
- Add loading states and skeletons

#### Step 5.2: Navigation Improvements
- Add user profile access from posts
- Add deep linking to posts
- Add back navigation from profiles

#### Step 5.3: Performance Optimizations
- Implement image lazy loading
- Add feed caching
- Optimize database queries with proper indexes

## Implementation Order

### Week 1: Foundation
1. Create database schema and RLS policies
2. Add feed functions to supabase.js
3. Test database operations

### Week 2: Core Feed
1. Update PostCard with real data
2. Implement like/unlike functionality
3. Add basic comment viewing
4. Replace mock data with real feed

### Week 3: Social Features
1. Create UserProfile component
2. Implement following system
3. Add CommentModal with full functionality
4. Test "Following" feed

### Week 4: Privacy & Moderation
1. Add public/private toggle to AddItemModal
2. Implement content moderation
3. Add reporting functionality
4. Test privacy controls

### Week 5: Polish & Performance
1. Fix UI issues
2. Add loading states and error handling
3. Implement infinite scroll
4. Performance testing and optimization

## Testing Strategy

### Database Testing
- Test RLS policies with different user roles
- Verify proper permissions for public/private content
- Test cascade deletes and data integrity

### UI Testing
- Test like/unlike feedback
- Test comment functionality
- Test following/unfollowing
- Test privacy toggles

### Performance Testing
- Test feed loading with large datasets
- Test infinite scroll performance
- Test image loading optimization

## Success Metrics

### Engagement Metrics
- Posts created per user
- Likes and comments per post
- Following relationships formed
- Time spent in feed

### Technical Metrics
- Feed loading time < 2 seconds
- Infinite scroll smoothness
- Error rate < 1%
- Database query performance

## Future Enhancements (Post-MVP)

### Advanced Features
- Story-style posts (24-hour expiry)
- Direct messaging between users
- Push notifications for likes/comments
- Advanced feed algorithm (ML-based)

### Content Features
- Video posts
- Multiple photos per post
- Post collections/albums
- Cross-platform sharing integrations

### Social Features
- User verification system
- Influencer/brand accounts
- Sponsored posts
- User blocking and privacy controls
