The upload-update.js script will automatically create and update the version.json in Supabase storage based on your package.json version.
The flow is:

Update version in `package.json`
Run `npm run upload-update`
Script automatically updates version.json in Supabase storage

chrome://inspect/#devices .. go to bottom to see chrome like inspector to see logs

Changes to front end code:  npm run build &&  npx cap sync android 
Here's a comprehensive list of files and the corresponding commands needed when they change:

1. `npm install` needed when changing:
   - `package.json`
   - `package-lock.json`
   - Any `.js`/`.ts` files
   - Any `.jsx`/`.tsx` files
   - Any `.css`/`.scss` files
   - Any web assets (images, fonts, etc.)
   - `src/` directory files
   - `public/` directory files

2. `npx cap update android` needed when changing:
   - `capacitor.config.ts`
   - `package.json` (after npm install)
   - Any web assets that need to be copied to Android
   - `src/` directory files (after npm install)
   - `public/` directory files (after npm install)
   - `android/capacitor.config.json`
   - `android/app/src/main/assets/public/` directory

3. `./gradlew build` needed when changing:
   - `android/build.gradle`
   - `android/app/build.gradle`
   - `android/gradle.properties`
   - `android/settings.gradle`
   - `android/app/src/main/AndroidManifest.xml`
   - `android/app/src/main/java/` files
   - `android/app/src/main/kotlin/` files
   - `android/app/src/main/res/` files
   - Any `.gradle` files
   - `android/app/src/main/assets/` (non-public assets)

4. `./gradlew clean assembleDebug` needed when:
   - `./gradlew build` fails
   - You get strange build errors
   - You change Android SDK versions
   - You modify native Android code
   - You need to clear build cache

Common workflow patterns:
1. Web changes:
   ```
   Change web files → npm install → npx cap update android
   ```

2. Android changes:
   ```
   Change Android files → ./gradlew build
   ```

3. Build issues:
   ```
   Build fails → ./gradlew clean assembleDebug
   ```

4. Full update:
   ```
   Change web files → npm install → npx cap update android → ./gradlew build
   ```

Remember:
- Always run `npm install` before `npx cap update android` if you changed web files
- Always run `npx cap update android` before `./gradlew build` if you changed web files
- Use `./gradlew clean assembleDebug` as a last resort when builds fail

Command I use for changes:
npm run build && npx cap sync android


To do:

///////////////////////////


      


Add a prompt when they try and create an entry without any notes. It should say "Even a few words helps you remember why you loved this" and then they should have the option to contiune without notes, or go back and add a few words. There shuld also be a box to "Don't show again". There should also be a way to visually make the notes section look more important and not optional. 
  



   Product card should show easy to read date and time.
Cropping still not perfect

Keyboards aren't working like I like them to (swype, auto capitalize, etc...)
Profile view 
   Add button for contact support/ give feedback


Sign up and login a bit whack

Add cache for lists locally -- every time referesh hapens update teh cache -- tried and failed, couldn't get it to work. Need to add backend apparently

Add logging for durations for page loads, imports and AI -- because supabase may not be good for logs, you can save it in a pretty raw and easy form to store in supabase and then I cna pull somewhere else if needed. Add logging for how big cache is?

First time flow: a sliding in pop up should say "Welcome to ___" (next) "So many choices, so many products, but now you can finally save and share the best ones!" (next) "Let's create your first memory list where we'll save your images" (Name <The best....>, Decript (optional), next) "Now take a snap and never forget your faves!"



Gamify
   Achievemnts future and completed -- allow me to add new ones without sending and update. Design to interact with a db to pull the data rahter than hard coded


Fix sending version/other metadata to supabase

Need to add a little slider on the additemmodal that can say private or public. (default public)


Notifications
   
Be able to delete items on lists

Be able to rearrange lists

Remove "love" from lists view

Feed (this should follow tandard and follow bes ui practice and design as well as match the current design )
   Share functionality internally and externally
   Heart and Comments on public lists and photos
   Need to have an ability to follow a persons profile, so there should be an easy way to go from image to user and from user you can see their lists and like/comment
   Add to ai that if detected to be innappropriate, do not allow and flag to admin somehow.
   Feed should remove the current default ones and start showing real ones.
      Each photo should be a photo, and list the product name, rating, the location, and then what their notes are on it, a well as how many like and comments ther are adn share
      For you for now will just pull the up to date ones, and following will be for all those that you'rre following.
   Small issue, the feed has a greyed out section betwen the bottom of the card and the footer. It's pretty big, so good to remove it.

///////////////////////////
breadcrumbs
yourbests.com
favelist
foodfaves
The pinch list
Nibble list
Breadcrumbs
reelfoodie.app
Nomaru
Cultured
Cultured crumb
Cultiveat
Cultivate
Nama
Like nama cream
flavaru
Crumbs
trove
toplist
topist
Topivore
picky
aficionado
foodivore
Nombook


Name generation:
Should have a memorable association with concept (easy to pair)
Should be easy to talk abuot (shareability) i.e. have you tried ... before?
Should not have another same name in the same selling space
Small bonus, it can be good if when a person talks about it, the name is slightly unpredictable to get the other person to say "Huh, that sounds interesting"

Features
Track user version
Store locally and to the supabase
Handle multiple images uploaded
Handle single image
Take picture on loading of app
Ai lookup of image (not setup)
Update list items (edit and delete -- should reflect locally and supabase)
Share to friends (not setup)
Share to insta (it woudl be cool if you could upload a whole list)


New to do:
Need to make the supabase tables more comprehensive
   Save all AI metadata
   Save all the lsits information

There should be more padding between sections in the add item modal. IT's a bit tight right now

Create first time login permissions page

Crop still not draggging from corners

Change it so no more avoid or love. But on the screen maybe on the right of the stars it can display just there Love, like, Meh, Avoid, Hate

Android native back not working

Product name place holder should be smaller, but not the actual text

For sparkleing, I gave 3 stars, it gave 4, I gave 4 stars it gave 1. The logic is messed

When entering price, it would be gopd if it defaulted to number keyboard

The price should default to the currency of the current location (and it can also be changed) If they change it, then use that currency for now on, but if they click on the currency, they can change to a different one. Remove the word Cost

The x during the ai detection should only stop the ai detection, it shouldn't exit out. The x should also be placed in the middle of the image. If AI generation fails, a retry button should also be present for them to retry (max 3 times)

On the add item modal view, if they scroll up, then the card should scroll down so the entire image can be seen. Also darken the card a little bit to put more emphasis on the image. Do this using the latest in UI techinques to bring a nice flow to this. Default should be what the current code shows

For the add item modal, instead of showing the description by default, put it in an "AI Summary & Details" section  that is hidden by default. When the user clicks on it, it should show the genereated description and allergens (in bubbles with a background)