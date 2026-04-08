import { useRef, useState, useMemo, useEffect } from "react";
import { useChat } from "@/lib/chat-context";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isToday, isYesterday, isSameDay, format } from "date-fns";
import { MessageCircle, ArrowLeft, Phone, Video, Info } from "lucide-react";

function getInitials(name) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function formatDateSeparator(date) {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
}

function ConversationSkeleton() {
    return (
        <div className="flex-1 p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "justify-end" : "justify-start")}>
                    {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                    <div className={cn("space-y-1", i % 2 === 0 && "items-end")}>
                        <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-48" : "w-56")} />
                        <Skeleton className="h-3 w-12" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyConversation() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start the conversation</h3>
            <p className="text-sm text-muted-foreground max-w-[240px]">
                Send a message to begin chatting. Messages are temporary and will be deleted automatically.
            </p>
        </div>
    );
}

export function ConversationView({ onBack, isMobile }) {
    const { 
        activeChat, 
        messages, 
        currentUser, 
        typingUsers, 
        markAsRead, 
        isLoading 
    } = useChat();
    
    const scrollRef = useRef(null);
    const [replyTo, setReplyTo] = useState(null);

    const messagesWithDateSeparators = useMemo(() => {
        const result = [];
        let lastDate = null;
        messages.forEach((message) => {
            const messageDate = new Date(message.timestamp);
            if (!lastDate || !isSameDay(lastDate, messageDate)) {
                result.push({ type: "date", date: messageDate });
                lastDate = messageDate;
            }
            result.push({ type: "message", message });
        });
        return result;
    }, [messages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, typingUsers]);

    if (!activeChat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/30">
                <div className="rounded-full bg-muted p-8 mb-6">
                    <MessageCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">E7ki!</h2>
                <p className="text-muted-foreground max-w-[300px]">
                    Select a conversation to start messaging or create a new chat.
                </p>
            </div>
        );
    }

    const otherParticipant = activeChat.participants?.find((p) => p.id !== currentUser?.id);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="flex items-center gap-3 px-4 h-16 border-b bg-background shrink-0">
                {isMobile && (
                    <Button size="icon" variant="ghost" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}

                <div className="relative">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={activeChat.avatar || otherParticipant?.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                            {getInitials(activeChat.name)}
                        </AvatarFallback>
                    </Avatar>
                    {otherParticipant?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-status-online border-2 border-background" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate text-sm leading-tight">
                        {activeChat.name}
                    </h3>
                    {otherParticipant?.isOnline ? (
                        <p className="text-[10px] text-status-online">Online</p>
                    ) : (
                        <p className="text-[10px] text-muted-foreground">Offline</p>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                        <Video className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                        <Info className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                <div className="flex flex-col gap-4 py-4 min-h-full justify-end">
                    {messages.length === 0 ? (
                        <EmptyConversation />
                    ) : (
                        messagesWithDateSeparators.map((item, idx) => {
                            if (item.type === "date") {
                                return (
                                    <div key={`date-${idx}`} className="flex justify-center my-2">
                                        <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground font-medium uppercase tracking-wider">
                                            {formatDateSeparator(item.date)}
                                        </span>
                                    </div>
                                );
                            }
                            return (
                                <MessageBubble
                                    key={item.message.id}
                                    message={item.message}
                                    isMe={item.message.senderId === currentUser?.id}
                                    onReply={setReplyTo}
                                />
                            );
                        })
                    )}
                    <TypingIndicator />
                </div>
            </ScrollArea>

            <MessageInput replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
        </div>
    );
}
