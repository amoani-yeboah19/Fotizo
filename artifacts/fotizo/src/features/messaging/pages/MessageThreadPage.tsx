import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { useMessages } from "@/contexts/MessagesContext";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Send, ArrowLeft, Handshake, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/common/Avatar";
import { Price } from "@/components/common/Price";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function MessageThread() {
  const [, params] = useRoute("/messages/:id");
  const [, setLocation] = useLocation();
  const { conversations, sendMessage, respondToOffer, markAsRead } = useMessages();
  const { user } = useAuth();
  
  const conversation = conversations.find(c => c.id === params?.id);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark read on open and whenever new messages arrive while the thread is open.
  useEffect(() => {
    if (params?.id) {
      markAsRead(params.id);
    }
  }, [params?.id, conversation?.messages.length]);

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
    <PageLayout footer={false} mainClassName="flex overflow-hidden pt-20">
        
        {/* Left Panel - Hidden on mobile when thread is active */}
        <div className="hidden lg:flex w-96 shrink-0 border-r border-border bg-white flex-col h-[calc(100dvh-80px)]">
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
                <Avatar src={conv.participantAvatar} name={conv.participantName} className="w-12 h-12 text-base shrink-0" />
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
        <div className="flex-1 flex flex-col h-[calc(100dvh-80px)] bg-muted/10">
          
          {/* Header */}
          <div className="h-16 border-b border-border bg-white px-4 flex items-center gap-4 shrink-0 shadow-sm z-10">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setLocation("/messages")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar src={conversation.participantAvatar} name={conversation.participantName} className="w-10 h-10 text-sm" />
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

              if (msg.offer) {
                const o = msg.offer;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className="w-full sm:w-[340px] rounded-2xl border-2 border-[#FF6A00]/30 bg-white overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2 bg-[#FF6A00]/10 px-4 py-2">
                        <Handshake className="w-4 h-4 text-[#FF6A00]" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wide text-[#FF6A00]">Custom Offer</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{format(new Date(msg.timestamp), "h:mm a")}</span>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-foreground whitespace-pre-wrap mb-4">{o.description}</p>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Offer</p>
                            <Price amount={o.amount} className="text-2xl font-extrabold text-foreground" />
                          </div>
                          {o.status !== "pending" ? (
                            <StatusBadge tone={o.status === "accepted" ? "success" : "danger"}>{o.status}</StatusBadge>
                          ) : isMe ? (
                            // My own offer — waiting on the other person to respond.
                            <StatusBadge tone="warning">pending</StatusBadge>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" className="gap-1 h-8" onClick={() => respondToOffer(conversation.id, msg.id, "accepted")}>
                                <Check className="w-3.5 h-3.5" aria-hidden="true" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 h-8 text-destructive hover:bg-destructive hover:text-white" onClick={() => respondToOffer(conversation.id, msg.id, "declined")}>
                                <X className="w-3.5 h-3.5" aria-hidden="true" /> Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                    {!isMe && (
                      <Avatar src={conversation.participantAvatar} name={msg.senderName} className="w-8 h-8 text-xs mt-auto" />
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
    </PageLayout>
  );
}
