import { Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { useMessages } from "@/contexts/MessagesContext";
import { Avatar } from "@/components/common/Avatar";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  const { conversations } = useMessages();

  return (
    <PageLayout footer={false} mainClassName="flex overflow-hidden pt-20">
        <div className="w-full lg:w-96 shrink-0 border-r border-border bg-white flex flex-col h-[calc(100dvh-80px)]">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold">Messages</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No messages yet.</p>
              </div>
            ) : (
              conversations.map(conv => (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="flex items-start gap-3 p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Avatar src={conv.participantAvatar} name={conv.participantName} className="w-12 h-12 text-base shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-semibold text-sm truncate">{conv.participantName}</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(new Date(conv.lastMessageTime), 'MMM d')}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-primary mb-1 truncate">{conv.subject}</p>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Empty State */}
        <div className="hidden lg:flex flex-1 bg-muted/20 items-center justify-center h-[calc(100dvh-80px)]">
          <div className="text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-border">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
            <p className="text-muted-foreground">Select a conversation to start messaging.</p>
          </div>
        </div>
    </PageLayout>
  );
}
