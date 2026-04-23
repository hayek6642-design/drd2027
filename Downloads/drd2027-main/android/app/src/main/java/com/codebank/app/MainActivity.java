package com.codebank.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.view.WindowManager;
import androidx.annotation.Nullable;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private Bundle webViewState;
    
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Keep screen on to prevent WebView destruction
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        // Restore WebView state if available
        if (savedInstanceState != null) {
            webViewState = savedInstanceState.getBundle("WEBVIEW_STATE");
        }
    }
    
    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        
        // Save WebView state before destroy
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            Bundle state = new Bundle();
            webView.saveState(state);
            outState.putBundle("WEBVIEW_STATE", state);
        }
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        // CRITICAL: Pause WebView to save battery
        // Stops all JavaScript timers and animations
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onPause();           // Pauses rendering
            webView.pauseTimers();       // CRITICAL: Stops setInterval/setTimeout
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        // Resume WebView without reload
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onResume();          // Resume rendering
            webView.resumeTimers();      // Resume JavaScript timers
        }
    }
    
    @Override
    protected void onStop() {
        super.onStop();
        // Additional battery saving when app is fully stopped
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.pauseTimers();  // Ensure timers are paused
        }
    }
}
