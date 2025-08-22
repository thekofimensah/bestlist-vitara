package com.test.bestlist;

import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.splashscreen.SplashScreenPlugin;
import android.os.Bundle;
import android.view.WindowManager;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register SplashScreen plugin
        registerPlugin(SplashScreenPlugin.class);
        
        // Ensure the window resizes with the keyboard
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN);
    }
}
