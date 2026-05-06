"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { InputGroup, InputGroupItem } from "@/components/ui/input-group";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { MetricCard } from "@/components/ui/metric-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { PageLoader } from "@/components/ui/page-loader";
import { TextareaField } from "@/components/ui/textarea-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  BookOpen,
  CalendarDays,
  Clock,
  Mail,
  School,
  Star,
  UserRound,
  Users,
} from "lucide-react";

export default function GalleryPage() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = React.useState(false);
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [publishAt, setPublishAt] = React.useState("2026-05-06T07:15");
  const [examGateEnabled, setExamGateEnabled] = React.useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = React.useState(true);

  function addToast(tone: ToastItem["tone"]) {
    const id = crypto.randomUUID();
    setToasts((current) => [
      ...current,
      {
        id,
        tone,
        title:
          tone === "success"
            ? "Berhasil disimpan"
            : tone === "error"
              ? "Gagal memproses"
              : tone === "warning"
                ? "Perlu perhatian"
                : "Informasi sistem",
        description:
          "Ini adalah contoh custom toast Morfostocks-style tanpa native browser alert.",
      },
    ]);
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          UI Components Gallery
        </h1>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
          Review surface untuk komponen Morfostocks yang akan dipakai di LMS
          Morfosis.
        </p>
      </div>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="danger">Danger Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold">iOS Toggles</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleSwitch
            checked={examGateEnabled}
            onCheckedChange={setExamGateEnabled}
            label="Exam Gate"
            description="Aktifkan pemeriksaan eligibility sebelum siswa masuk ruang ujian."
          />
          <ToggleSwitch
            checked={autoSaveEnabled}
            onCheckedChange={setAutoSaveEnabled}
            label="Autosave answers"
            description="Simpan jawaban siswa otomatis sebagai shock absorber saat koneksi terbatas."
          />
          <ToggleSwitch
            defaultChecked={false}
            label="AI grading assist"
            description="Contoh toggle off dengan motion seperti iOS switch."
          />
          <ToggleSwitch
            disabled
            defaultChecked
            label="Locked by policy"
            description="Disabled state untuk setting yang dikunci oleh admin platform."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold">
          Floating Fields + InputGroup + Icons
        </h2>
        <InputGroup
          title="Jadwal Ujian"
          description="Contoh form management yang akan dipakai untuk Exams/Courses."
        >
          <InputGroupItem span="half">
            <FloatingInput
              label="Nama Ujian"
              prefix={<BookOpen className="h-4 w-4" />}
              defaultValue="Matematika Bab 1"
            />
          </InputGroupItem>
          <InputGroupItem span="half">
            <FloatingInput
              label="Email Guru"
              prefix={<Mail className="h-4 w-4" />}
              error="Format email tidak valid"
              defaultValue="guru@"
            />
          </InputGroupItem>
          <InputGroupItem span="third">
            <FloatingSelect
              label="Target Kelas"
              startAdornment={<School className="h-4 w-4" />}
              options={[
                { label: "Kelas 10-A", value: "10-a" },
                { label: "Kelas 11-B", value: "11-b" },
              ]}
            />
          </InputGroupItem>
          <InputGroupItem span="third">
            <FloatingInput
              label="Tanggal Publish"
              prefix={<CalendarDays className="h-4 w-4" />}
              defaultValue="2026-05-02"
            />
          </InputGroupItem>
          <InputGroupItem span="third">
            <FloatingInput
              label="Jam Open"
              prefix={<Clock className="h-4 w-4" />}
              defaultValue="07:15"
            />
          </InputGroupItem>
          <InputGroupItem span="half">
            <DateTimePicker
              label="Publish dengan Jam"
              value={publishAt}
              onChange={setPublishAt}
              helperText="Custom date + time picker, bukan native datetime-local. Content rata kiri dengan floating label."
            />
          </InputGroupItem>
          <InputGroupItem span="full">
            <TextareaField
              label="Instruksi Ujian"
              prefix={<BookOpen className="h-4 w-4" />}
              defaultValue="Kerjakan soal secara mandiri. Sistem autosave akan berjalan di background, jangan refresh halaman saat submit akhir."
              helperText="Textarea custom dengan floating label, multiline shell, dan alignment sama dengan input/select."
            />
          </InputGroupItem>
        </InputGroup>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold">Page Loader</h2>
        <PageLoader
          title="Memuat UI Gallery"
          description="Contoh loader halaman untuk state auth/session/API yang belum siap, tetap premium dan tidak blank screen."
        />
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold">Tabs</h2>
        <Tabs defaultValue="overview" className="max-w-3xl">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="visibility">Visibility</TabsTrigger>
            <TabsTrigger value="grading">Grading</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Panel className="p-5">
              <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                Konten Overview untuk ringkasan ujian/course.
              </p>
            </Panel>
          </TabsContent>
          <TabsContent value="visibility">
            <Panel className="p-5">
              <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                Konten Visibility untuk publish/open granular.
              </p>
            </Panel>
          </TabsContent>
          <TabsContent value="grading">
            <Panel className="p-5">
              <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                Konten Grading untuk essay/manual grading queue.
              </p>
            </Panel>
          </TabsContent>
        </Tabs>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold">Table</h2>
        <Panel className="overflow-hidden p-0">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <h3 className="font-display text-lg font-bold tracking-tight">
              Daftar Ujian Aktif
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Contoh table custom untuk management surface: dense, rounded, no
              native chrome.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
                  <th className="px-5 py-3 font-bold">Ujian</th>
                  <th className="px-5 py-3 font-bold">Kelas</th>
                  <th className="px-5 py-3 font-bold">Jadwal</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 text-right font-bold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {[
                  {
                    exam: "Matematika Bab 1",
                    klass: "10-A",
                    schedule: "06 Mei 2026 • 07:15",
                    status: "Live",
                    badge: "success",
                    progress: "86%",
                  },
                  {
                    exam: "Biologi Sel",
                    klass: "11-B",
                    schedule: "06 Mei 2026 • 09:00",
                    status: "Scheduled",
                    badge: "shell",
                    progress: "0%",
                  },
                  {
                    exam: "Bahasa Indonesia",
                    klass: "12 IPA",
                    schedule: "05 Mei 2026 • 10:30",
                    status: "Review",
                    badge: "default",
                    progress: "100%",
                  },
                ].map((row) => (
                  <tr
                    key={row.exam}
                    className="transition-colors hover:bg-[color:var(--surface-subtle)]/70"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[color:var(--foreground)]">
                        {row.exam}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                        Autosave + exam gate aktif
                      </p>
                    </td>
                    <td className="px-5 py-4 font-medium text-[color:var(--foreground)]">
                      {row.klass}
                    </td>
                    <td className="px-5 py-4 text-[color:var(--muted-foreground)]">
                      {row.schedule}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={row.badge as "default" | "success" | "shell"}
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-[color:var(--foreground)]">
                      {row.progress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold">Alerts</h2>
        <div className="max-w-3xl space-y-4">
          <Alert
            title="Informasi"
            description="Ini adalah informasi penting untuk semua guru."
            tone="info"
          />
          <Alert
            title="Berhasil"
            description="Data ujian berhasil disimpan ke server."
            tone="success"
          />
          <Alert
            title="Peringatan"
            description="Koneksi internet lambat, mencoba sinkronisasi ulang."
            tone="warning"
          />
          <Alert
            title="Kesalahan"
            description="Gagal mengunggah file. Pastikan format sesuai."
            tone="error"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold">Dialog + Toast</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Open Confirm Dialog
          </Button>
          <Button variant="primary" onClick={() => setFormDrawerOpen(true)}>
            Open Form Drawer
          </Button>
          <Button variant="primary" onClick={() => addToast("success")}>
            Show Success Toast
          </Button>
          <Button variant="secondary" onClick={() => addToast("info")}>
            Show Info Toast
          </Button>
          <Button variant="danger" onClick={() => addToast("error")}>
            Show Error Toast
          </Button>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Publish ujian ini?"
          description="Custom confirmation dialog, bukan window.confirm()."
          confirmLabel="Publish"
          cancelLabel="Batal"
          tone="warning"
          onConfirm={() => addToast("success")}
          details="Ujian akan muncul di dashboard siswa sesuai jadwal publish/open yang dipilih guru."
        />
        <FormDrawer
          open={formDrawerOpen}
          onOpenChange={setFormDrawerOpen}
          title="Buat Ujian Baru"
          description="Pulled-right modal di-render di dalam app shell, jadi tidak menutup AI Agents chatbox ketika panel chat terbuka."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setFormDrawerOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setFormDrawerOpen(false);
                  addToast("success");
                }}
              >
                Simpan Draft
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <FloatingInput
              label="Nama Ujian"
              prefix={<BookOpen className="h-4 w-4" />}
              defaultValue="Matematika Bab 1"
            />
            <FloatingSelect
              label="Target Kelas"
              startAdornment={<School className="h-4 w-4" />}
              options={[
                { label: "Kelas 10-A", value: "10-a" },
                { label: "Kelas 11-B", value: "11-b" },
              ]}
            />
            <DateTimePicker
              label="Jadwal Publish"
              value={publishAt}
              onChange={setPublishAt}
            />
            <TextareaField
              label="Instruksi Ujian"
              prefix={<BookOpen className="h-4 w-4" />}
              defaultValue="Kerjakan soal secara mandiri. Jangan refresh saat autosave berjalan."
            />
          </div>
        </FormDrawer>
        <div className="fixed right-4 top-4 z-[90] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={(id) =>
                setToasts((current) => current.filter((item) => item.id !== id))
              }
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl font-bold">
          Badges & Metrics
        </h2>
        <div className="mb-6 flex flex-wrap gap-4">
          <Badge>Active</Badge>
          <Badge variant="success">Completed</Badge>
          <Badge variant="shell">Draft Shell</Badge>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard
            label="Total Murid"
            value="1,240"
            detail="Terdaftar tahun ini"
            icon={Users}
          />
          <MetricCard
            label="Ujian Aktif"
            value="8"
            detail="Sedang berlangsung"
            icon={BookOpen}
          />
          <MetricCard
            label="Rata-rata Nilai"
            value="84.5"
            detail="Dari semua mapel"
            icon={Star}
          />
        </div>
      </section>
    </div>
  );
}
