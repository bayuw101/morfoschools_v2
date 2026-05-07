export type DashboardActivityType = "student" | "course" | "learning-session" | "exam-result";

export type DashboardActivity = {
  id: string;
  type: DashboardActivityType;
  count: number;
  active: boolean;
  minutesSpent: number;
  passed: boolean;
};

export type DashboardMetrics = {
  totalStudents: number;
  activeCourses: number;
  learningHours: number;
  passRate: number;
};

export type DashboardRole =
  | "master_admin"
  | "school_admin"
  | "academic_admin"
  | "teacher"
  | "student"
  | "parent"
  | "finance"
  | "proctor"
  | "content_reviewer";

export type DashboardQuickAction = {
  id: string;
  label: string;
  href: string;
  roles: DashboardRole[];
};

export type DashboardExperience = {
  headline: string;
  eyebrow: string;
  description: string;
  primaryMetricLabel: string;
  primaryMetricValue: string;
  secondaryMetricLabel: string;
  secondaryMetricValue: string;
  focusTitle: string;
  focusDescription: string;
  quickActions: DashboardQuickAction[];
};

export type DashboardAlertSeverity = "critical" | "warning" | "info" | "success";

export type DashboardAlert = {
  id: string;
  severity: DashboardAlertSeverity;
  createdAt: string;
  title: string;
};

const alertSeverityWeight: Record<DashboardAlertSeverity, number> = {
  critical: 4,
  warning: 3,
  info: 2,
  success: 1,
};

const quickActions: DashboardQuickAction[] = [
  { id: "tenant-console", label: "Tenant Console", href: "/app", roles: ["master_admin"] },
  { id: "school-ops", label: "School Ops", href: "/app", roles: ["school_admin"] },
  { id: "academic-plan", label: "Academic Plan", href: "/app", roles: ["academic_admin"] },
  { id: "teaching-room", label: "Teaching Room", href: "/app", roles: ["teacher"] },
  { id: "student-gate", label: "Exam Gate", href: "/app", roles: ["student"] },
  { id: "guardian-summary", label: "Guardian Summary", href: "/app", roles: ["parent"] },
  { id: "billing-ledger", label: "Billing Ledger", href: "/app", roles: ["finance"] },
  { id: "proctor-room", label: "Proctor Room", href: "/app", roles: ["proctor"] },
  { id: "content-review", label: "Review Queue", href: "/app/gallery", roles: ["content_reviewer"] },
];

const experiences: Record<DashboardRole, Omit<DashboardExperience, "quickActions">> = {
  master_admin: {
    eyebrow: "Platform Command",
    headline: "Master Admin Platform Overview",
    description: "Kontrol tenant, keamanan session, dan kesiapan operasional lintas sekolah.",
    primaryMetricLabel: "Tenant Aktif",
    primaryMetricValue: "12",
    secondaryMetricLabel: "Security Events",
    secondaryMetricValue: "3",
    focusTitle: "Tenant governance",
    focusDescription: "Pastikan switch tenant, audit trail, dan RBAC matrix tetap sehat sebelum modul akademik dibuka.",
  },
  school_admin: {
    eyebrow: "School Operations",
    headline: "School Admin Daily Control",
    description: "Pantau operasional sekolah, kelas, guru, dan kesiapan pembelajaran hari ini.",
    primaryMetricLabel: "Murid Aktif",
    primaryMetricValue: "1.240",
    secondaryMetricLabel: "Kelas Berjalan",
    secondaryMetricValue: "38",
    focusTitle: "Operasional sekolah",
    focusDescription: "Prioritas hari ini: kelola enrollment, jadwal kelas, dan kesiapan guru.",
  },
  academic_admin: {
    eyebrow: "Academic Planning",
    headline: "Academic Admin Curriculum Board",
    description: "Kelola course offering, teaching assignment, dan kalender akademik.",
    primaryMetricLabel: "Course Offering",
    primaryMetricValue: "24",
    secondaryMetricLabel: "Assignment Pending",
    secondaryMetricValue: "5",
    focusTitle: "Kurikulum & pengajaran",
    focusDescription: "Pastikan setiap subject punya teaching assignment dan struktur evaluasi yang siap.",
  },
  teacher: {
    eyebrow: "Teaching Workspace",
    headline: "Teacher Classroom Cockpit",
    description: "Ringkasan kelas, materi, tugas, dan aktivitas murid yang perlu ditindaklanjuti.",
    primaryMetricLabel: "Kelas Diampu",
    primaryMetricValue: "6",
    secondaryMetricLabel: "Tugas Perlu Cek",
    secondaryMetricValue: "18",
    focusTitle: "Pembelajaran hari ini",
    focusDescription: "Lanjutkan materi, cek submission, dan siapkan sesi evaluasi tanpa data admin yang tidak relevan.",
  },
  student: {
    eyebrow: "Student Journey",
    headline: "Student Learning Home",
    description: "Fokus ke progress belajar, tugas, materi, dan Exam Gate sebelum ujian.",
    primaryMetricLabel: "Progress Belajar",
    primaryMetricValue: "78%",
    secondaryMetricLabel: "Tugas Aktif",
    secondaryMetricValue: "4",
    focusTitle: "Lanjut belajar",
    focusDescription: "Masuk dari tugas terdekat, cek materi terakhir, lalu gunakan Exam Gate saat ujian dibuka.",
  },
  parent: {
    eyebrow: "Guardian View",
    headline: "Parent Progress Summary",
    description: "Ringkasan aman untuk wali murid: progress, kehadiran, dan tagihan penting.",
    primaryMetricLabel: "Ringkasan Anak",
    primaryMetricValue: "Baik",
    secondaryMetricLabel: "Notifikasi Baru",
    secondaryMetricValue: "2",
    focusTitle: "Pendampingan belajar",
    focusDescription: "Lihat perkembangan anak tanpa akses ke dashboard operasional internal sekolah.",
  },
  finance: {
    eyebrow: "Finance Desk",
    headline: "Finance Billing Control",
    description: "Pantau billing, pembayaran, dan rekonsiliasi tenant sekolah.",
    primaryMetricLabel: "Invoice Open",
    primaryMetricValue: "31",
    secondaryMetricLabel: "Rekonsiliasi",
    secondaryMetricValue: "94%",
    focusTitle: "Arus pembayaran",
    focusDescription: "Prioritaskan invoice overdue dan status rekonsiliasi agar operasional tetap lancar.",
  },
  proctor: {
    eyebrow: "Exam Reliability",
    headline: "Proctor Exam Monitoring",
    description: "Monitor sesi ujian, anomali, dan readiness tanpa akses admin akademik penuh.",
    primaryMetricLabel: "Sesi Ujian",
    primaryMetricValue: "7",
    secondaryMetricLabel: "Anomali",
    secondaryMetricValue: "1",
    focusTitle: "Pengawasan ujian",
    focusDescription: "Fokus pada Exam Gate, status koneksi, dan integrity signal saat ujian berjalan.",
  },
  content_reviewer: {
    eyebrow: "Content Quality",
    headline: "Content Reviewer Queue",
    description: "Review materi, soal, rubric, dan konten sebelum dipublikasikan ke siswa.",
    primaryMetricLabel: "Review Queue",
    primaryMetricValue: "9",
    secondaryMetricLabel: "Siap Publish",
    secondaryMetricValue: "14",
    focusTitle: "Kualitas materi",
    focusDescription: "Pastikan konten valid, rubric tersedia, dan aman untuk digunakan di kelas maupun ujian.",
  },
};

export function calculateDashboardMetrics(activities: DashboardActivity[]): DashboardMetrics {
  const totalStudents = activities
    .filter((activity) => activity.type === "student")
    .reduce((sum, activity) => sum + activity.count, 0);

  const activeCourses = activities
    .filter((activity) => activity.type === "course" && activity.active)
    .reduce((sum, activity) => sum + activity.count, 0);

  const learningMinutes = activities
    .filter((activity) => activity.type === "learning-session")
    .reduce((sum, activity) => sum + activity.minutesSpent, 0);

  const examResults = activities.filter((activity) => activity.type === "exam-result");
  const passedResults = examResults.filter((activity) => activity.passed).length;

  return {
    totalStudents,
    activeCourses,
    learningHours: Math.round(learningMinutes / 60),
    passRate: examResults.length === 0 ? 0 : Math.round((passedResults / examResults.length) * 100),
  };
}

export function getVisibleQuickActions<T extends DashboardQuickAction>(actions: T[], role: DashboardRole): T[] {
  return actions.filter((action) => action.roles.includes(role));
}

export function getDashboardExperience(role: DashboardRole): DashboardExperience {
  return {
    ...experiences[role],
    quickActions: getVisibleQuickActions(quickActions, role),
  };
}

export function orderOperationalAlerts<T extends DashboardAlert>(alerts: T[]): T[] {
  return [...alerts].sort((a, b) => {
    const severityDiff = alertSeverityWeight[b.severity] - alertSeverityWeight[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
