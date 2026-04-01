import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useWebSocket } from "./websocket-context";
import { useAuth } from "./auth-context";
import { saveMessage, getMessages } from "./indexeddb";

const ChatContext = createContext(undefined);

export function ChatProvider({ children, currentUser }) {
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChatState] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { emit: wsSend, lastMessage, typingUsers, isConnected, joinChat, sendTyping } = useWebSocket();
    const { getAuthHeaders } = useAuth();

    const setTyping = useCallback((isTyping) => {
        if (activeChat) {
            sendTyping(activeChat.id, isTyping);
        }
    }, [activeChat, sendTyping]);

    const init = useCallback(async () => {
        try {
            const response = await fetch('/api/e7ki/chats', {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const chatsData = await response.json();
                setChats(chatsData.map(chat => ({
                    id: chat.id,
                    name: chat.title || 'Untitled Chat',
                    isGroup: !!chat.is_group,
                    participants: chat.participant_ids || [],
                    unreadCount: 0,
                    createdAt: new Date(chat.created_at).getTime(),
                    updatedAt: new Date(chat.updated_at || chat.created_at).getTime(),
                    lastMessage: null,
                })));
            }
        } catch (error) {
            console.error('Failed to fetch chats:', error);
        }
        setIsLoading(false);
    }, [getAuthHeaders]);

    useEffect(() => {
        init();
    }, [init]);

    useEffect(() => {
        if (activeChat) {
            joinChat(activeChat.id);
            const loadMessages = async () => {
                try {
                    const response = await fetch(`/api/e7ki/chats/${activeChat.id}/messages`, {
                        headers: getAuthHeaders(),
                    });
                    if (response.ok) {
                        const messagesData = await response.json();
                        setMessages(messagesData.map(msg => ({
                            id: msg.id,
                            chatId: msg.chat_id,
                            senderId: msg.sender_id,
                            senderName: msg.sender_username || 'Unknown',
                            type: msg.type,
                            content: msg.content,
                            reactions: [],
                            status: msg.status || 'read',
                            timestamp: new Date(msg.created_at).getTime(),
                        })));
                    }
                } catch (error) {
                    console.error('Failed to fetch messages:', error);
                }
            };
            loadMessages();
        } else {
            setMessages([]);
        }
    }, [activeChat?.id, getAuthHeaders]);

    useEffect(() => {
        if (lastMessage) {
            console.log('[E7ki] Received WebSocket message:', lastMessage);
            if (lastMessage.type === "new-message") {
                const newMessage = {
                    id: lastMessage.payload.id,
                    chatId: lastMessage.payload.chat_id,
                    senderId: lastMessage.payload.sender_id,
                    senderName: lastMessage.payload.sender_username || 'Unknown',
                    type: lastMessage.payload.type,
                    content: lastMessage.payload.content,
                    reactions: [],
                    status: lastMessage.payload.status || 'sent',
                    timestamp: new Date(lastMessage.payload.created_at).getTime(),
                };
                
                saveMessage(newMessage);
                
                if (activeChat && newMessage.chatId === activeChat.id) {
                    setMessages(prev => [...prev, newMessage]);
                }
                
                setChats((prev) => {
                    const exists = prev.find(c => c.id === newMessage.chatId);
                    if (!exists) {
                        // New chat notification, might need to fetch chat details
                        // For now, reload chats to be safe
                        init();
                        return prev;
                    }
                    const updated = prev.map((chat) => {
                        if (chat.id === newMessage.chatId) {
                            return {
                                ...chat,
                                lastMessage: newMessage,
                                updatedAt: newMessage.timestamp,
                                unreadCount: activeChat?.id === chat.id ? chat.unreadCount : chat.unreadCount + 1
                            };
                        }
                        return chat;
                    });
                    // Sort by updatedAt
                    return [...updated].sort((a, b) => b.updatedAt - a.updatedAt);
                });
            }
        }
    }, [lastMessage, activeChat?.id]);

    const setActiveChat = (chat) => {
        setActiveChatState(chat);
        if (chat) {
            setChats(prev => prev.map(c => 
                c.id === chat.id ? { ...c, unreadCount: 0 } : c
            ));
        }
    };

    const markAsRead = async (messageId) => {
        try {
            await fetch(`/api/e7ki/messages/${messageId}/read`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    };

    const sendMessage = async (chatId, content, type = 'text', options = {}) => {
        const messageData = {
            chatId,
            content,
            type,
            ...options,
            timestamp: Date.now(),
        };

        try {
            const response = await fetch('/api/e7ki/messages', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageData),
            });

            if (response.ok) {
                const sentMessage = await response.json();
                const formattedMsg = {
                    id: sentMessage.id,
                    chatId: sentMessage.chat_id,
                    senderId: sentMessage.sender_id,
                    senderName: sentMessage.sender_username || 'Me',
                    type: sentMessage.type,
                    content: sentMessage.content,
                    reactions: [],
                    status: sentMessage.status,
                    timestamp: new Date(sentMessage.created_at).getTime(),
                };
                setMessages(prev => [...prev, formattedMsg]);
                return formattedMsg;
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const createNewChat = async (participant) => {
        try {
            const response = await fetch('/api/e7ki/chats', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participantIds: [participant.id],
                    title: participant.name
                }),
            });

            if (response.ok) {
                const newChat = await response.json();
                const formattedChat = {
                    id: newChat.id,
                    name: newChat.title || participant.name,
                    isGroup: false,
                    participants: [participant],
                    unreadCount: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    lastMessage: null,
                };
                setChats(prev => [formattedChat, ...prev]);
                setActiveChat(formattedChat);
                return formattedChat;
            }
        } catch (error) {
            console.error('Failed to create new chat:', error);
        }
    };

    return (
        <ChatContext.Provider value={{
            chats,
            activeChat,
            messages,
            isLoading,
            isConnected,
            typingUsers,
            setActiveChat,
            sendMessage,
            createNewChat,
            setTyping,
            markAsRead,
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
