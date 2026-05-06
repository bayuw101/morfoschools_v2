import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message): message is ChatMessage => {
      if (!message || typeof message !== "object") return false;
      const candidate = message as Partial<ChatMessage>;
      return (candidate.role === "user" || candidate.role === "assistant" || candidate.role === "system") && typeof candidate.content === "string";
    })
    .slice(-8)
    .map((message) => ({ ...message, content: message.content.slice(0, 2000) }));
}

function localAssistantReply(messages: ChatMessage[]) {
  const latest = [...messages].reverse().find((message) => message.role === "user")?.content.toLowerCase() ?? "";
  if (latest.includes("ujian") || latest.includes("exam")) {
    return "Siap. Untuk scope awal rewrite, AI Agent masih demo-local. Rekomendasi saya: pastikan Exam Gate, autosave, dan ingestion shock absorber diprioritaskan sebelum integrasi AI operasional.";
  }
  if (latest.includes("kelas") || latest.includes("siswa")) {
    return "Bisa. Di clean foundation ini saya belum memanggil backend CRUD. Nanti kelas/siswa masuk sebagai vertical slice terpisah dengan TDD dan API kontrak yang jelas.";
  }
  return "Halo Pak/Bu, saya AI Agent demo-local Morfosis. Saya bisa bantu membaca konteks dashboard, menjelaskan rencana fitur, dan menyiapkan checklist implementasi tanpa memanggil API eksternal atau backend palsu.";
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const messages = normalizeMessages(payload?.messages);
  return NextResponse.json({ message: localAssistantReply(messages), source: "demo-local" });
}
