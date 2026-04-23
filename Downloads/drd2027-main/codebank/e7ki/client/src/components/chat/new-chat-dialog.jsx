import { useState, useEffect } from "react";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { 
    Dialog, 
    DialogTrigger, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Plus, Loader2, Search } from "lucide-react";

export function NewChatDialog({ children }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { createNewChat } = useChat();
    const { getAuthHeaders } = useAuth();

    useEffect(() => {
        if (open) {
            const fetchUsers = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch('/api/e7ki/users', {
                        headers: getAuthHeaders()
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setUsers(data);
                    }
                } catch (error) {
                    console.error("[E7ki] Failed to fetch users:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchUsers();
        }
    }, [open, getAuthHeaders]);

    const handleSelectUser = async (user) => {
        setIsLoading(true);
        try {
            if (createNewChat) {
                await createNewChat({
                    id: user.id,
                    name: user.username,
                    email: user.email
                });
            }
            setOpen(false);
            setSearch("");
        } catch (error) {
            console.error("[E7ki] Failed to create chat:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button size="icon" data-testid="button-new-chat">
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
                <div className="p-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            Start New Chat
                        </DialogTitle>
                        <DialogDescription>
                            Select a user from CodeBank to start a conversation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search users..." 
                            className="pl-9"
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                        />
                    </div>
                </div>

                <ScrollArea className="h-[300px] border-t">
                    <div className="p-2">
                        {isLoading && users.length === 0 ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors text-left"
                                >
                                    <Avatar>
                                        <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-none">{user.username}</p>
                                        <p className="text-xs text-muted-foreground truncate mt-1">{user.email}</p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No users found
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
