"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import ChatPage from "@/pages/chat";
import AuthPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { startIndexedDBCleanup } from "@/lib/indexeddb-cleaner";
startIndexedDBCleanup();

function Router() {
    const { user, isLoading } = useAuth();
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }
    if (!user) {
        return <AuthPage />;
    }
    return (<Switch>
      <Route path="/" component={ChatPage}/>
      <Route component={NotFound}/>
    </Switch>);
}
export default function App() {
    return (<QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>);
}
