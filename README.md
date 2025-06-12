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





To do:

Add AI function
Add cache for lists locally -- every time referesh hapens update teh cache -- tried and failed, couldn't get it to work.
The image bucket in supabase doesn't seem to be working correctly