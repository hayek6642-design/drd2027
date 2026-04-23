import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";

export function TypingIndicator() {
    const { typingUsers } = useChat();
    
    if (!typingUsers || typingUsers.length === 0)
        return null;
        
    const names = typingUsers.map((u) => u.username);
    const text = names.length === 1
        ? `${names[0]} is typing...`
        : names.length === 2
            ? `${names[0]} and ${names[1]} are typing...`
            : `${names[0]} and ${names.length - 1} others are typing...`;
            
    return (
        <div className="flex items-center gap-2 px-4 py-2" data-testid="typing-indicator">
            <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                    <span 
                        key={i} 
                        className={cn("h-1.5 w-1.5 rounded-full bg-muted-foreground", "animate-bounce")} 
                        style={{ animationDelay: `${i * 150}ms` }}
                    />
                ))}
            </div>
            <span className="text-[10px] text-muted-foreground italic">{text}</span>
        </div>
    );
}
