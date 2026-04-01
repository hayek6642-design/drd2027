import React from 'react'
import { ChatList, ConversationView, MessageInput } from '@/components/chat'
import * as ChatCtx from '../src/lib/chat-context.jsx'
import * as WS from '../src/lib/websocket-context.jsx'

export default function ChatPage(){
  const storedId = typeof localStorage !== 'undefined' ? localStorage.getItem('e7ki_user_id') : null
  const userId = storedId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))
  if (!storedId && typeof localStorage !== 'undefined') localStorage.setItem('e7ki_user_id', userId)

  const currentUser = { id: userId, name: 'Guest' }

  return (
    <WS.WebSocketProvider userId={userId}>
      <ChatCtx.ChatProvider currentUser={currentUser}>
        <div style={{display:'grid',gridTemplateColumns:'280px 1fr',height:'100vh'}}>
          <div style={{borderRight:'1px solid #eee'}}>
            <ChatList />
          </div>
          <div style={{display:'grid',gridTemplateRows:'1fr auto'}}>
            <ConversationView />
            <MessageInput />
          </div>
        </div>
      </ChatCtx.ChatProvider>
    </WS.WebSocketProvider>
  )
}