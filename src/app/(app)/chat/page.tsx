import { PageHeader } from '@/components/shared/page-header'
import { ChatClient } from '@/components/chat/chat-client'

export default function ChatPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Помощник" />
      <ChatClient />
    </div>
  )
}
