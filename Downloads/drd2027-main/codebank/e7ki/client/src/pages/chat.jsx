import React, { useEffect, useState } from "react";
import { ThemeProvider } from "@/lib/theme-provider.jsx";
import { WebSocketProvider } from "@/lib/websocket-context.jsx";
import { ChatProvider, useChat } from "@/lib/chat-context.jsx";
import { ZagelProvider } from "@/lib/zagel-context.jsx";
import { ChatList, ConversationView, NewChatDialog } from "@/components/chat";
import { ThemeToggle } from "@/components/theme-toggle.jsx";
import { useIsMobile } from "@/hooks/use-mobile.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { MessageCircle, Shield, LogOut } from "lucide-react";
function ChatHeader() {
    return (<div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-primary-foreground"/>
        </div>
        <span className="font-bold text-lg">E7ki!</span>
      </div>
      <div className="flex items-center gap-1">
        <NewChatDialog />
        <ThemeToggle />
      </div>
    </div>);
}
function PrivacyBanner() {
    return (<div className="px-4 py-3 bg-muted/50 border-b">
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5"/>
        <div>
          <p className="text-sm font-medium">Privacy First</p>
          <p className="text-xs text-muted-foreground">
            Messages are stored temporarily and deleted automatically for your privacy.
          </p>
        </div>
      </div>
    </div>);
}
function ChatLayoutContent() {
    const { activeChat, setActiveChat } = useChat();
    const isMobile = useIsMobile();
    const [showConversation, setShowConversation] = useState(false);
    useEffect(() => {
        if (activeChat) {
            setShowConversation(true);
        }
    }, [activeChat]);
    const handleBack = () => {
        setShowConversation(false);
        setActiveChat(null);
    };
    if (isMobile) {
        return (<div className="flex flex-col h-screen w-full bg-background">
        {!showConversation ? (<>
            <ChatHeader />
            <PrivacyBanner />
            <ChatList />
          </>) : (<ConversationView onBack={handleBack} isMobile/>)}
      </div>);
    }
    return (<div className="flex h-screen w-full bg-background">
      <div className="w-[320px] border-r flex flex-col shrink-0">
        <ChatHeader />
        <PrivacyBanner />
        <ChatList />
      </div>
      <ConversationView />
    </div>);
}
// Identity derives from JWT via AuthProvider
function ChatPage() {
    const { user } = useAuth();
    const [currentUser] = useState(() => ({
        id: user?.id,
        name: user?.email || "me",
        email: user?.email || null,
        isOnline: true,
    }));
    return (<ThemeProvider defaultTheme="dark">
      <WebSocketProvider userId={currentUser.id}>
        <ChatProvider currentUser={currentUser}>
          <ZagelProvider userId={currentUser.id}>
            <ChatLayoutContent />
          </ZagelProvider>
        </ChatProvider>
      </WebSocketProvider>
    </ThemeProvider>);
}

export default ChatPage;
