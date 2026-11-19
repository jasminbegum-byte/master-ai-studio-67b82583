import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MessageSquareText, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { HydrationGate } from "@/components/common/HydrationGate";
import { NotConnectedNotice } from "@/components/common/NotConnectedNotice";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/ai/providers.functions";
import { formatBnDate } from "@/lib/domain/labels";
import { chat, newId, nowIso } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { ChatMessage } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "মিনি AI অ্যাসিস্ট্যান্ট — Master AI Studio" },
      { name: "description", content: "বাংলায় চ্যাট — বার্তা এই ডিভাইসে সংরক্ষিত থাকে।" },
      { property: "og:title", content: "মিনি AI অ্যাসিস্ট্যান্ট — Master AI Studio" },
      { property: "og:description", content: "বাংলা চ্যাট ইন্টারফেস, প্রোভাইডার সংযোগের অপেক্ষায়।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  return (
    <>
      <PageHeader icon={MessageSquareText} title="মিনি AI অ্যাসিস্ট্যান্ট" description="বার্তা এই ডিভাইসে সংরক্ষিত থাকে।" />
      <HydrationGate>
        <ChatBody />
      </HydrationGate>
    </>
  );
}

function ChatBody() {
  const messages = [...chat.useAll()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    const msg: ChatMessage = { id: newId(), role: "user", content, status: "awaiting_provider", createdAt: nowIso() };
    if (!safeSave(() => chat.upsert(msg))) return;
    setText("");
    setSending(true);
    try {
      const history = [...messages, msg].slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const res = await askAssistant({ data: { messages: history } });
      if (res.ok) {
        safeSave(() => {
          chat.upsert({ ...msg, status: "answered" });
          chat.upsert({ id: newId(), role: "assistant", content: res.reply, status: "answered", createdAt: nowIso() });
        });
      } else if (res.code === "provider_error") {
        safeSave(() => chat.upsert({ ...msg, status: "error" }));
      }
    } catch {
      safeSave(() => chat.upsert({ ...msg, status: "error" }));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-4">
      <NotConnectedNotice title="টেক্সট AI প্রোভাইডার">
        কোনো AI প্রোভাইডার সংযুক্ত নেই, তাই অ্যাসিস্ট্যান্ট উত্তর দেয় না। আপনার বার্তা সংরক্ষিত থাকবে ও ‘উত্তরের অপেক্ষায়’ দেখাবে।
      </NotConnectedNotice>
      <div className="studio-card flex min-h-[50vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="কোনো বার্তা নেই" description="নিচে বাংলায় লিখে পাঠান।" />
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <p
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "text-foreground",
                  )}
                >
                  {m.content}
                </p>
                <span className="mt-1 text-xs text-muted-foreground">
                  {formatBnDate(m.createdAt)}
                  {m.status === "awaiting_provider" && " · উত্তরের অপেক্ষায় (প্রোভাইডার সংযুক্ত নয়)"}
                  {m.status === "error" && " · পাঠানো যায়নি"}
                </span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-3">
          <Textarea
            ref={inputRef}
            autoFocus
            rows={2}
            value={text}
            aria-label="বার্তা লিখুন"
            placeholder="বার্তা লিখুন…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send(e);
            }}
          />
          <Button type="submit" size="icon" aria-label="পাঠান" disabled={!text.trim() || sending}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </div>
      {messages.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => safeSave(() => chat.clear(), "চ্যাট মুছে ফেলা হয়েছে")}>
          <Trash2 /> চ্যাট মুছুন
        </Button>
      )}
    </div>
  );
}
