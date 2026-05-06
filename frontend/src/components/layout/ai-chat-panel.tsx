"use client";

import * as React from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Paperclip,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { getSession } from "@/lib/auth";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_CONTEXT_MESSAGES = 8;
const MAX_CONTEXT_CHARS = 6_000;

function compactMessagesForRequest(messages: ChatMessage[]) {
  const compacted: ChatMessage[] = [];
  let usedChars = 0;

  for (const message of [...messages].reverse()) {
    if (
      message.role === "assistant" &&
      message.content === initialMessages[0]?.content
    )
      continue;
    const content = message.content.trim();
    if (!content) continue;
    const remaining = MAX_CONTEXT_CHARS - usedChars;
    if (remaining <= 0) break;
    compacted.unshift({
      ...message,
      content: content.slice(0, Math.min(content.length, remaining)),
    });
    usedChars += Math.min(content.length, remaining);
    if (compacted.length >= MAX_CONTEXT_MESSAGES) break;
  }

  return compacted;
}

const suggestions = [
  {
    title: "Ringkas jadwal ujian",
    description:
      "Tampilkan exam aktif, gate window, dan risiko jadwal bentrok.",
    prompt:
      "Ringkas jadwal ujian terbaru. Sertakan exam aktif, gate window, dan risiko jadwal bentrok jika ada.",
  },
  {
    title: "Susun kelas baru",
    description:
      "Buat draft kelas, cek wali kelas, lalu minta konfirmasi sebelum simpan.",
    prompt:
      "Bantu aku susun kelas baru. Tanyakan nama kelas, grade, tahun ajaran, dan wali kelas. Validasi guru dulu sebelum menyimpan.",
  },
  {
    title: "Draft exam reliabel",
    description:
      "Siapkan ujian dengan durasi, publish window, eligibility, dan security mode.",
    prompt:
      "Bantu aku buat draft exam baru. Tanyakan judul, mata pelajaran, durasi, publish window, eligibility, dan security mode.",
  },
  {
    title: "Buat soal + rubrik",
    description:
      "Generate soal pilihan ganda atau essay lengkap dengan kunci/rubrik.",
    prompt:
      "Bantu aku tambah soal ke exam. Tanyakan exam, tipe soal, prompt, poin, opsi jawaban, dan kunci/rubrik.",
  },
];

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Halo Pak BOS, saya MORFOSCHOOLS AI. Saya bisa bantu operasional sekolah dari satu panel: cek jadwal ujian, susun kelas, draft exam, buat soal lengkap dengan kunci/rubrik, sampai merapikan komunikasi akademik.\n\nTulis instruksi bebas seperti ngobrol biasa — saya akan tanya data yang kurang sebelum aksi penting disimpan.",
  },
];

type AiChatPanelProps = {
  onClose?: () => void;
};

export function AiChatPanel({ onClose }: AiChatPanelProps) {
  const [messages, setMessages] =
    React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: compactMessagesForRequest(nextMessages),
          session: getSession(),
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        message?: ChatMessage;
        error?: string;
      } | null;
      if (!response.ok || !data?.message?.content) {
        throw new Error(data?.error ?? "AI agent belum bisa merespons.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.message!.content },
      ]);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Gagal menghubungi MORFOSCHOOLS AI.",
      );
      setMessages((current) =>
        current.filter(
          (message, index) =>
            index !== current.length - 1 || message.role !== "user",
        ),
      );
      setInput(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <aside className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] bg-[color:var(--shell)] text-white md:rounded-[30px]">
      <div className="pointer-events-none absolute inset-0 bg-black/10" />
      <div className="relative shrink-0 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[#30302e] text-[#f5f7fb] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_18px_36px_rgba(0,0,0,0.22)]">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-[#f5f7fb]">
                MORFOSCHOOLS AI
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100">
                <Sparkles className="h-3 w-3" /> Live
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-[#b8b2a6]">
              Secure school operations assistant
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              aria-label="Close AI agent chat"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#f5f7fb] transition hover:bg-white/[0.1] md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/[0.06] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b8b2a6]">
              Model
            </p>
            <p className="mt-1 text-xs font-semibold text-[#f5f7fb]">
              MORFOSCHOOLS
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-emerald-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
              Status
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Router Ready
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 [scrollbar-color:rgba(255,255,255,0.22)_transparent]"
      >
        <div className="rounded-[26px] border border-white/[0.06] bg-black/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8d1c4]">
                <GraduationCap className="h-4 w-4" /> Quick starts
              </div>
              <p className="mt-1 text-xs leading-5 text-[#918b80]">
                Pilih contoh, lalu lanjutkan dengan bahasa natural.
              </p>
            </div>
            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#b8b2a6]">
              4 flows
            </span>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.title}
                type="button"
                disabled={isSending}
                onClick={() => void sendMessage(suggestion.prompt)}
                className="group flex w-full items-start gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.045] px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-white/[0.1] hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] transition group-hover:scale-105">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-5 text-[#f5f7fb]">
                    {suggestion.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#b8b2a6] group-hover:text-[#f0ddd2]">
                    {suggestion.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div
                key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                className={isUser ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`flex max-w-[90%] gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isUser
                        ? "bg-[#486b9c] text-white"
                        : "bg-white/10 text-[#f5f7fb]"
                    }`}
                  >
                    {isUser ? (
                      <GraduationCap className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div
                    className={`whitespace-pre-wrap rounded-[24px] px-4 py-3 text-sm leading-6 ${
                      isUser
                        ? "rounded-tr-lg bg-[#486b9c] text-white"
                        : "rounded-tl-lg bg-white/[0.08] text-[#f5f7fb]"
                    }`}
                  >
                    <p
                      className={`mb-1 text-[11px] font-bold uppercase tracking-[0.14em] ${isUser ? "text-white/72" : "text-[#9caeca]"}`}
                    >
                      {isUser ? "You" : "MORFOSCHOOLS AI"}
                    </p>
                    <p>{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {isSending ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-[24px] rounded-tl-lg bg-white/[0.08] px-4 py-3 text-sm font-medium text-[#cbd7ec]">
                <Loader2 className="h-4 w-4 animate-spin" /> MORFOSCHOOLS sedang
                berpikir...
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative shrink-0 bg-black/10 p-4"
      >
        {error ? (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        <div className="rounded-[26px] bg-white/[0.07] p-2 text-[#f5f7fb]">
          <textarea
            rows={3}
            value={input}
            disabled={isSending}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder="Tanya AI tentang ujian, siswa, kelas, atau operasional sekolah..."
            className="min-h-[76px] w-full resize-none rounded-[18px] bg-transparent px-3 py-2 text-sm leading-6 text-[#f5f7fb] outline-none placeholder:text-[#9caeca] disabled:cursor-not-allowed disabled:opacity-70"
          />
          <div className="flex items-center justify-between gap-2 px-1 pt-2">
            <button
              type="button"
              disabled
              className="group inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.055] pl-1.5 pr-3 text-xs font-bold text-[#d8d1c4] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition disabled:cursor-not-allowed disabled:opacity-75"
              aria-label="Context attachments coming soon"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-[#f5f7fb] ring-1 ring-white/[0.06]">
                <Paperclip className="h-3.5 w-3.5" />
              </span>
              <span>Context</span>
              <span className="hidden rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#918b80] xl:inline">
                Soon
              </span>
            </button>
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="group inline-flex h-10 items-center gap-2 rounded-full bg-[color:var(--brand)] pl-3 pr-1.5 text-xs font-extrabold text-white shadow-[0_14px_30px_color-mix(in_srgb,var(--brand)_28%,transparent)] transition hover:-translate-y-0.5 hover:bg-[color:var(--brand-strong)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-white/[0.09] disabled:text-[#918b80] disabled:shadow-none"
            >
              <span className="pl-1">
                {isSending ? "Sending" : input.trim() ? "Send" : "Write first"}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/18 text-white ring-1 ring-white/15 transition group-hover:bg-white/24 group-disabled:bg-white/[0.08] group-disabled:text-[#918b80]">
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SendHorizontal className="h-3.5 w-3.5" />
                )}
              </span>
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}
