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
        // Prevent WebView reload on resume
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onPause();
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        // Resume WebView without reload
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onResume();
        }
    }
    
    @Override
    protected void onStop() {
        super.onStop();
        // Don't destroy WebView - just pause it
    }
}
