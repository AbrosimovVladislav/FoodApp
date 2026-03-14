import { ChatClient } from '@/components/chat/chat-client'

export default function ChatPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="shrink-0 px-4 pt-6 pb-3">
        <h1 className="text-2xl">Помощник</h1>
      </div>
      <ChatClient />
    </div>
  )
}
