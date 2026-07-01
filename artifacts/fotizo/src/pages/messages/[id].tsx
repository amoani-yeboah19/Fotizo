import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useMessages } from "@/context/MessagesContext";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MessageThread() {
  const [, params] = useRoute("/messages/:id");
  const [, setLocation] = useLocation();
  const { conversations, sendMessage, markAsRead } = useMessages();
  const { user } = useAuth();
  
  const conversation = conversations.find(c => c.id === params?.id);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params?.id) {
      markAsRead(params.id);
    }
  }, [params?.id, conversations.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  if (!conversation) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;
    sendMessage(conversation.id, inputText, user.id, user.name);
    setInputText("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 flex overflow-hidden pt-20">
        
        {/* Left Panel - Hidden on mobile when thread is active */}
        <div className="hidden lg:flex w-96 shrink-0 border-r border-border bg-white flex-col h-[calc(100vh-80px)]">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => setLocation(`/messages/${conv.id}`)}
                className={`flex items-start gap-3 p-4 border-b border-border cursor-pointer transition-colors ${conv.id === conversation.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/50'}`}
              >
                <img src={conv.participantAvatar || "/images/avatar-1.png"} alt={conv.participantName} className="w-12 h-12 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-semibold text-sm truncate">{conv.participantName}</h4>
                  </div>
                  <p className="text-xs font-medium text-primary mb-1 truncate">{conv.subject}</p>
                  <p className="text-sm truncate text-muted-foreground">{conv.lastMessage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Active Conversation */}
        <div className="flex-1 flex flex-col h-[calc(100vh-80px)] bg-muted/10">
          
          {/* Header */}
          <div className="h-16 border-b border-border bg-white px-4 flex items-center gap-4 shrink-0 shadow-sm z-10">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setLocation("/messages")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={conversation.participantAvatar || "/images/avatar-1.png"} alt={conversation.participantName} className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h3 className="font-bold text-sm leading-tight">{conversation.participantName}</h3>
              <p className="text-xs text-muted-foreground">{conversation.participantRole}</p>
            </div>
            <div className="ml-auto hidden sm:block">
              <span className="text-xs font-medium bg-muted px-3 py-1 rounded-full">{conversation.subject}</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {conversation.messages.map((msg, idx) => {
              const isMe = msg.senderId === user?.id;
              
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                    {!isMe && (
                      <img src={conversation.participantAvatar || "/images/avatar-1.png"} alt={msg.senderName} className="w-8 h-8 rounded-full mt-auto" />
                    )}
                    
                    <div className="flex flex-col">
                      <div className={`px-4 py-3 rounded-2xl ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-white border border-border rounded-bl-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className={`text-[10px] text-muted-foreground mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        {format(new Date(msg.timestamp), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-border shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <Input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full bg-muted/50 border-transparent focus-visible:ring-primary/20"
              />
              <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!inputText.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
