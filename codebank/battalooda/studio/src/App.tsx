import { useEffect, Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// 🚀 CRITICAL: Code Splitting for performance optimization
const Home = lazy(() => import("@/pages/home")); // Assuming Home is a page
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient();

function Router() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    // 🔧 Notify parent when ready
    const notifyReady = () => {
      window.parent.postMessage({
        source: 'battalooda-studio',
        action: 'studio-ready'
      }, '*');
    };

    // 🔧 Listen for parent commands
    const handleParentMessage = (e: MessageEvent) => {
      if (e.data?.target !== 'battalooda-studio') return;
      
      switch(e.data.action) {
        case 'load-track':
          console.log('[React] Loading track:', e.data.data);
          // Trigger React track load
          break;
        case 'start-recording':
          // Start engine recording
          break;
        case 'stop-recording':
          // Stop engine recording
          break;
        case 'apply-effect':
          // Apply effect logic
          break;
      }
    };

    window.addEventListener('message', handleParentMessage);
    notifyReady();

    return () => window.removeEventListener('message', handleParentMessage);
  }, []);

  // 🔧 Optimized helpers to send data to Battalooda
  const saveProject = (projectData: any) => {
    window.parent.postMessage({ source: 'battalooda-studio', action: 'save-project', data: projectData }, '*');
  };

  const exportAudio = (blob: Blob) => {
    window.parent.postMessage({ source: 'battalooda-studio', action: 'export-audio', blob }, '*');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
