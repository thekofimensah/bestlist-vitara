# Saved Items System Test Plan

## Test Scenarios

### 1. Save Item from Feed
**Steps:**
1. Navigate to the feed (Community or Following tab)
2. Find a post that is not currently saved (bookmark icon is not filled)
3. Click the bookmark icon on the post

**Expected Results:**
- [ ] Bookmark icon immediately fills/changes color
- [ ] No page refresh required
- [ ] Navigate to Lists view
- [ ] "Saved Items" list should contain the newly saved item
- [ ] Item should be clickable immediately
- [ ] Item should show at the top of the Saved Items list

### 2. Unsave Item from Feed
**Steps:**
1. Navigate to the feed
2. Find a post that is currently saved (bookmark icon is filled)
3. Click the bookmark icon to unsave

**Expected Results:**
- [ ] Bookmark icon immediately unfills
- [ ] Navigate to Lists view
- [ ] Item should be removed from "Saved Items" list
- [ ] No page refresh required

### 3. Delete Saved Item from Lists View
**Steps:**
1. Navigate to Lists view
2. Find a saved item in the "Saved Items" list
3. Long press to enter selection mode
4. Select the item
5. Click Delete button

**Expected Results:**
- [ ] Item is immediately removed from the list
- [ ] Navigate back to Feed
- [ ] The corresponding post should show as unsaved (bookmark icon unfilled)
- [ ] No page refresh required
- [ ] Clicking bookmark should re-save the item

### 4. Bulk Delete Saved Items
**Steps:**
1. Navigate to Lists view
2. Long press on a saved item to enter selection mode
3. Select multiple saved items
4. Click Delete button

**Expected Results:**
- [ ] All selected items are immediately removed
- [ ] Navigate to Feed
- [ ] All corresponding posts should show as unsaved
- [ ] No inconsistent states

### 5. Save Multiple Items Rapidly
**Steps:**
1. Navigate to Feed
2. Quickly save 3-4 items by clicking bookmark icons

**Expected Results:**
- [ ] All items should save without issues
- [ ] Navigate to Lists view
- [ ] All saved items should appear in "Saved Items" list
- [ ] All items should be clickable
- [ ] Order should be most recently saved first

## Console Logging

During testing, open browser console to verify these log messages appear:

### When Saving:
- `🔖 [OptimizedPostCard] Dispatching item-saved event...`
- `📌 [ListsView] Item saved event received...`
- `🔖 [MainScreen] Item saved event...`

### When Unsaving:
- `📌 [ListsView] Item unsaved event received...`
- `🔖 [MainScreen] Item unsaved event...`

### When Deleting:
- `🔔 [ListsView] Dispatching unsave event for post...`
- `🔖 [MainScreen] Item deleted event...`
- `🔄 [OptimizedPostCard] Saved item deleted, removing bookmark...`

## Edge Cases to Test

1. **Offline Mode**: Try saving/unsaving while offline
2. **Network Latency**: Test with slow network (Chrome DevTools Network throttling)
3. **Concurrent Updates**: Have two tabs open, save in one, verify it appears in the other
4. **App Resume**: Background the app, save an item, resume app, verify state is correct

## Success Criteria

✅ All saved items appear immediately without refresh
✅ All saved items are clickable immediately  
✅ Bookmark states sync correctly between Feed and Lists
✅ No duplicate items in Saved Items list
✅ No "stuck" bookmark states requiring refresh
✅ Console logs confirm event flow is working
✅ Works consistently across multiple save/unsave cycles
