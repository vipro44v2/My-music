"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import type { UserInfo } from "./TopBar";

interface ChatMessage {
  id: string;
  content: string;
  isAdmin: boolean;
  isRead: boolean;
  createdAt: string;
}

function ChatPanel({
  user,
  onClose,
  onClearBadge,
}: {
  user: UserInfo;
  onClose: () => void;
  onClearBadge: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((msgs: ChatMessage[]) => {
        setMessages(msgs);
        onClearBadge();
      })
      .catch(() => {});
  }, [onClearBadge]);

  useEffect(() => {
    loadMessages();
    inputRef.current?.focus();
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const es = new EventSource("/api/chat/events");
    es.onmessage = () => loadMessages();
    es.onerror = () => {};
    return () => es.close();
  }, [loadMessages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const msg: ChatMessage = await res.json();
      setMessages((prev) => [...prev, msg]);
    } finally {
      setSending(false);
    }
  };

  const initial = (user.name ?? user.email ?? "?")[0].toUpperCase();

  return (
    <div
      className="w-80 flex flex-col rounded-2xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden"
      style={{ height: "420px", background: "rgba(14,11,8,0.96)", backdropFilter: "blur(20px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 via-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initial}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">Chat với Admin</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/35 text-[10px]">Online</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/70 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-white/20 text-xs text-center pt-8 leading-relaxed">
            Send a message to start<br />chatting with admin
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isAdmin ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${
                msg.isAdmin
                  ? "bg-white/8 border border-white/8 text-white/85 rounded-tl-sm"
                  : "bg-teal-500/20 border border-teal-500/25 text-teal-100 rounded-tr-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-white/8 flex-shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Nhập tin nhắn..."
          className="flex-1 bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center hover:bg-teal-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

export default function ChatWidget({ user }: { user: UserInfo | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    if (!user) return;

    fetch("/api/chat/unread")
      .then((r) => r.json())
      .then((d: { count: number }) => setBadge(d.count))
      .catch(() => {});

    const es = new EventSource("/api/chat/events");
    es.onmessage = () => {
      setIsOpen((open) => {
        if (!open) setBadge((n) => n + 1);
        return open;
      });
    };
    es.onerror = () => {};
    return () => es.close();
  }, [user]);

  if (!user) return null;

  return (
    <div className="fixed bottom-[130px] lg:bottom-[88px] right-4 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <ChatPanel
          user={user}
          onClose={() => setIsOpen(false)}
          onClearBadge={() => setBadge(0)}
        />
      )}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center hover:bg-teal-500/30 transition-all shadow-lg shadow-teal-900/20 relative"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
    </div>
  );
}
