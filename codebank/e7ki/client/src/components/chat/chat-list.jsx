import { useRef } from "react";
import { useChat } from "@/lib/chat-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Image, Mic, Video, FileText, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";

function getInitials(name) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function getMessagePreview(message) {
    switch (message.type) {
        case "image":
            return (
                <span className="flex items-center gap-1 text-muted-foreground">
                    <Image className="h-3 w-3" />
                    Photo
                </span>
            );
        case "voice":
            return (
                <span className="flex items-center gap-1 text-muted-foreground">
                    <Mic className="h-3 w-3" />
                    Voice message
                </span>
            );
        case "video":
            return (
                <span className="flex items-center gap-1 text-muted-foreground">
                    <Video className="h-3 w-3" />
                    Video
                </span>
            );
        case "file":
            return (
                <span className="flex items-center gap-1 text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {message.fileName || "File"}
                </span>
            );
        default:
            return <span className="text-muted-foreground truncate">{message.content}</span>;
    }
}

function ChatListSkeleton() {
    return (
        <div className="flex flex-col gap-1 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-3 w-10" />
                </div>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
                Start a new chat to begin messaging
            </p>
        </div>
    );
}

export function ChatList() {
    const { chats, activeChat, setActiveChat, isLoading } = useChat();
    const parentRef = useRef(null);

    const rowVirtualizer = useVirtualizer({
        count: chats.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 76,
        overscan: 10,
    });

    if (isLoading) {
        return <ChatListSkeleton />;
    }

    if (chats.length === 0) {
        return <EmptyState />;
    }

    return (
        <ScrollArea className="flex-1">
            <div ref={parentRef} className="h-full">
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
                    {rowVirtualizer.getVirtualItems().map((vRow) => {
                        const chat = chats[vRow.index];
                        const isActive = activeChat?.id === chat.id;
                        const otherParticipant = chat.participants.find(p => p.id !== chat.participants[0]?.id);

                        return (
                            <div
                                key={chat.id}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    transform: `translateY(${vRow.start}px)`,
                                }}
                            >
                                <button
                                    onClick={() => setActiveChat(chat)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-md text-left transition-colors w-full",
                                        "hover-elevate active-elevate-2",
                                        isActive && "bg-sidebar-accent"
                                    )}
                                    data-testid={`chat-item-${chat.id}`}
                                >
                                    <div className="relative">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={chat.avatar || otherParticipant?.avatar} />
                                            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                                                {getInitials(chat.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {otherParticipant?.isOnline && (
                                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-status-online border-2 border-sidebar" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className="font-semibold truncate text-sm">
                                                {chat.name}
                                            </span>
                                            {chat.lastMessage && (
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(chat.lastMessage.timestamp, { addSuffix: false })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="truncate text-xs flex-1">
                                                {chat.lastMessage ? (
                                                    getMessagePreview(chat.lastMessage)
                                                ) : (
                                                    <span className="text-muted-foreground italic">No messages</span>
                                                )}
                                            </div>
                                            {chat.unreadCount > 0 && (
                                                <Badge variant="default" className="h-4 min-w-[16px] px-1 flex items-center justify-center bg-primary text-[10px]">
                                                    {chat.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ScrollArea>
    );
}
