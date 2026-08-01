'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement,
  ArcElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  DollarSignIcon, TrendingUpIcon, TrendingDownIcon, GraduationCapIcon,
  TagIcon, CreditCardIcon, BookOpenIcon, AlertCircleIcon,
  ChevronRightIcon, ZapIcon, XIcon,
} from 'lucide-react';

import { SidebarTrigger } from '@/shared/ui/sidebar';
import { Separator }      from '@/shared/ui/separator';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
} from '@/shared/ui/breadcrumb';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { Badge }       from '@/shared/ui/badge';
import { Skeleton }    from '@/shared/ui/skeleton';

import {
  useRevenueAnalytics,
  useTransactionAnalytics,
  useEnrollmentAnalytics,
  useCourseAnalytics,
  usePromotionAnalytics,
  usePaymentAnalytics,
  useAnalyticsStream,
} from '@/features/analytics/hooks';
import type { AnalyticsPeriod } from '@/features/analytics/api';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
);

// --- Fungsi pemformatan angka & tanggal, dipakai di seluruh halaman ---

// Mengubah angka menjadi format mata uang Rupiah penuh, misalnya "Rp 250.000".
function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n);
}

// Mengubah angka menjadi format ringkas supaya muat di kartu kecil,
// misalnya 2.700.000 menjadi "Rp 2.7jt" dan 950.000 menjadi "Rp 950rb".
function fmtCompact(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return fmt(n);
}

// Mengubah tanggal mentah dari backend (format "2026-08-01" atau
// "2026-08" untuk data bulanan) menjadi label singkat yang ditampilkan di
// sumbu grafik, misalnya "1 Aug" atau "Aug 26".
function fmtLabel(date: string) {
  if (date.length === 7) {
    const [y, m] = date.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', {
      month: 'short', year: '2-digit',
    });
  }
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const CHART_H         = 200;
const TICK_FILL       = '#9ca3af';
const TICK_SIZE       = 10;
const BASE_PIE_COLORS = ['#8b5cf6', '#f59e0b', '#3b82f6', '#10b981', '#ef4444'];

const STATUS_COLOR: Record<string, string> = {
  paid:      '#10b981',
  active:    '#10b981',
  completed: '#3b82f6',
  pending:   '#f59e0b',
  cancelled: '#f87171',
  withdrawn: '#9ca3af',
  expired:   '#d1d5db',
};

const TOOLTIP_BASE = {
  backgroundColor: 'rgba(17,24,39,0.92)',
  titleColor:      '#e5e7eb',
  bodyColor:       '#d1d5db',
  borderColor:     'rgba(255,255,255,0.08)',
  borderWidth:     1,
  padding:         8,
  cornerRadius:    8,
} as const;

// --- Dua "plugin" Chart.js buatan sendiri, untuk mempercantik tampilan grafik garis ---

// Menambahkan efek cahaya lembut (glow) di sekitar garis grafik, supaya
// terlihat lebih menonjol/hidup dibanding garis polos biasa.
const glowPlugin = {
  id: 'glow',
  beforeDatasetDraw(chart: any, args: any) {
    const color: string = args.meta.dataset._dataset?.borderColor ?? '#8b5cf6';
    chart.ctx.save();
    chart.ctx.shadowBlur  = 14;
    chart.ctx.shadowColor = color;
  },
  afterDatasetDraw(chart: any) { chart.ctx.restore(); },
};

// Menggambar garis vertikal putus-putus mengikuti posisi mouse saat
// pengguna mengarahkan kursor ke atas grafik, membantu membaca titik data
// tertentu secara presisi.
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart: any) {
    const active = chart.tooltip?._active;
    if (!active?.length) return;
    const x   = active[0].element.x;
    const ctx = chart.ctx as CanvasRenderingContext2D;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chart.chartArea.top);
    ctx.lineTo(x, chart.chartArea.bottom);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

// --- Fungsi pembuat pengaturan/data untuk grafik garis (area chart), dipakai berulang di beberapa bagian halaman ---

// Menyusun seluruh pengaturan tampilan grafik garis: warna sumbu, format
// tooltip saat hover, dan seterusnya. Parameter `yFmt` opsional dipakai
// untuk memformat angka di sumbu Y (misalnya jadi "Rp 2.7jt").
function areaChartOptions(color: string, yFmt?: (v: number) => string) {
  return {
    responsive:          true,
    maintainAspectRatio: false,
    interaction:         { mode: 'index' as const, intersect: false },
    plugins: {
      legend:  { display: false },
      tooltip: {
        ...TOOLTIP_BASE,
        ...(yFmt ? { callbacks: { label: (ctx: TooltipItem<'line'>) => yFmt(ctx.parsed.y ?? 0) } } : {}),
      },
    },
    scales: {
      x: {
        grid:   { display: false },
        ticks:  { color: TICK_FILL, font: { size: TICK_SIZE }, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        grid:   { color: 'rgba(107,114,128,0.15)' },
        ticks:  {
          color: TICK_FILL,
          font:  { size: TICK_SIZE },
          ...(yFmt ? { callback: (v: string | number) => yFmt(Number(v)) } : { precision: 0 }),
        },
        border: { display: false },
      },
    },
    color,
  };
}

// Menyusun data mentah (label tanggal + angka) menjadi bentuk yang siap
// dipakai komponen <Line> dari react-chartjs-2.
function makeAreaData(labels: string[], values: number[], color: string, bgColor: string) {
  return {
    labels,
    datasets: [{
      data:             values,
      borderColor:      color,
      backgroundColor:  bgColor,
      fill:             true,
      tension:          0.4,
      pointRadius:      0,
      pointHoverRadius: 4,
      borderWidth:      2,
    }],
  };
}

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today',          label: 'Today'          },
  { value: 'last_7_days',    label: 'Last 7 Days'    },
  { value: 'last_30_days',   label: 'Last 30 Days'   },
  { value: 'last_12_months', label: 'Last 12 Months' },
];

// Kelompok tombol untuk memilih rentang waktu data yang ditampilkan (Hari
// Ini, 7 Hari Terakhir, dst). Punya dua gaya tampilan berbeda tergantung
// prop `dark` — meski begitu, di halaman ini yang dipakai hanya gaya
// terangnya (dark tidak pernah diisi true).
function PeriodSelector({
  value, onChange, dark,
}: {
  value:    AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
  dark?:    boolean;
}) {
  if (dark) {
    return (
      <div className="flex w-fit gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
        {PERIODS.map(p => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              value === p.value
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="flex w-fit gap-1 rounded-lg border bg-muted/30 p-1">
      {PERIODS.map(p => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === p.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// --- Komponen UI kecil yang dipakai berulang di seluruh halaman ---
function ChartSkeleton({ h = CHART_H }: { h?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height: h }} />;
}

// Pesan singkat yang tampil kalau pengambilan data dari server gagal.
function ErrorBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
      <AlertCircleIcon className="size-3.5 shrink-0" />
      Failed to load data. Please refresh the page.
    </div>
  );
}

// Bingkai kotak putih dengan judul dan ikon di bagian atas, dipakai
// sebagai pembungkus seragam untuk tiap bagian dashboard (Revenue,
// Transactions, dst). `sectionRef` opsional dipakai supaya kartu KPI di
// atas bisa "menggulir otomatis" tepat ke section ini saat diklik.
function Section({
  title, icon: Icon, children, sectionRef,
}: {
  title:       string;
  icon:        React.ElementType;
  children:    React.ReactNode;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={sectionRef} className="rounded-xl border bg-card overflow-hidden scroll-mt-4">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// Baris berisi 2 atau 3 kotak ringkasan kecil (label + angka), tampil di
// bagian atas tiap section sebelum grafiknya.
function SummaryRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className={`grid gap-3 mb-4 ${items.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {items.map(it => (
        <div key={it.label} className="rounded-lg bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">{it.label}</p>
          <p className="mt-0.5 text-sm font-bold truncate">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

// Satu baris "batang horizontal" yang menunjukkan proporsi satu status
// (misalnya "paid: 8 dari 12 = 67%") dibanding totalnya — dipakai di
// bagian "Per Status" pada section Transactions dan Enrollment.
function HBarRow({ label, value, total, color = '#6366f1' }: {
  label: string; value: number; total: number; color?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="capitalize text-muted-foreground">{label.replace(/_/g, ' ')}</span>
        <span className="font-medium">
          {value.toLocaleString('en-US')}{' '}
          <span className="text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

const KPI_COLORS = {
  emerald: { icon: 'text-emerald-500', iconBg: 'bg-emerald-500/10', border: 'border-emerald-500/20', grad: 'rgba(16,185,129,0.08)'  },
  violet:  { icon: 'text-violet-500',  iconBg: 'bg-violet-500/10',  border: 'border-violet-500/20',  grad: 'rgba(139,92,246,0.08)' },
  blue:    { icon: 'text-blue-500',    iconBg: 'bg-blue-500/10',    border: 'border-blue-500/20',    grad: 'rgba(59,130,246,0.08)' },
  amber:   { icon: 'text-amber-500',   iconBg: 'bg-amber-500/10',   border: 'border-amber-500/20',   grad: 'rgba(245,158,11,0.08)' },
} as const;

/** Kartu KPI di atas halaman — hover menampilkan nilai periode sebelumnya alih-alih badge persentase perubahan. */
function KpiCard({
  label, value, changePercent, previousValue, info, icon: Icon, color, isLoading, onClick,
}: {
  label:          string;
  value:          string;
  changePercent?: number;
  previousValue?: string;
  info?:          string;
  icon:           React.ElementType;
  color:          keyof typeof KPI_COLORS;
  isLoading:      boolean;
  onClick?:       () => void;
}) {
  const [hovered, setHovered] = useState(false);

  if (isLoading) return <Skeleton className="h-[110px] rounded-xl" />;

  const c         = KPI_COLORS[color];
  const hasChange = changePercent !== undefined;
  const isUp      = hasChange && changePercent >= 0;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-xl border ${c.border} p-4 flex flex-col gap-3 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-violet-500/40' : ''
      }`}
      style={{ background: `linear-gradient(135deg, ${c.grad} 0%, var(--card) 65%)` }}
    >
      {onClick && (
        <ChevronRightIcon
          className={`absolute right-3 top-3 size-3.5 text-muted-foreground/40 transition-opacity ${
            hovered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`rounded-md p-1.5 ${c.iconBg}`}>
          <Icon className={`size-4 ${c.icon}`} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {hasChange && !hovered && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
            isUp ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {isUp ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
            <span>{isUp ? '+' : ''}{changePercent}% vs previous period</span>
          </div>
        )}
        {hovered && previousValue && (
          <div className="flex items-center gap-1 mt-1 text-xs font-medium text-violet-400">
            <ZapIcon className="size-3" />
            <span>Previous period: {previousValue}</span>
          </div>
        )}
        {!hasChange && !hovered && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/60">
            {info ? <span>{info}</span> : <span className="h-[1em]" />}
          </div>
        )}
      </div>
    </div>
  );
}

// Satu baris pada daftar peringkat kursus: nomor urut, gambar/ikon kursus,
// nama & jenjang kursus, dan jumlah pendaftarnya.
function CourseRankRow({ course, rank }: { course: { title: string; level: string; thumbnail?: string; enrollmentCount: number }; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1">
      <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground/60">{rank}</span>
      {course.thumbnail ? (
        <img src={course.thumbnail} alt={course.title} className="size-8 shrink-0 rounded object-cover" />
      ) : (
        <div className="size-8 shrink-0 rounded bg-muted/50 flex items-center justify-center">
          <BookOpenIcon className="size-3 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium">{course.title}</p>
        <p className="text-xs text-muted-foreground">{course.level}</p>
      </div>
      <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-xs font-semibold tabular-nums">
        {course.enrollmentCount}
      </span>
    </div>
  );
}

// Komponen halaman utama — semua bagian kecil di atas (Section, KpiCard,
// dst.) dirakit bersama di sini menjadi tampilan dashboard yang lengkap.
export default function AnalyticsPage() {
  // --- Status/keadaan halaman ---
  const [period, setPeriod]             = useState<AnalyticsPeriod>('last_30_days'); // rentang waktu yang dipilih pengguna
  const [debouncedPeriod, setDebPeriod] = useState<AnalyticsPeriod>('last_30_days'); // versi "tertunda" dari period, dipakai untuk request data
  const [activePaymentFilter, setActivePaymentFilter] = useState<string | null>(null); // metode pembayaran yang sedang disorot
  const [courseView, setCourseView]     = useState<'most' | 'least'>('most'); // sedang menampilkan kursus terpopuler atau paling sepi
  const [courseLimit, setCourseLimit]   = useState<5 | 10>(5); // jumlah kursus yang ditampilkan di peringkat

  // Referensi ke tiga section supaya bisa "digulir otomatis" ke sana saat kartu KPI terkait diklik.
  const revenueRef = useRef<HTMLDivElement>(null);
  const txRef      = useRef<HTMLDivElement>(null);
  const enrollRef  = useRef<HTMLDivElement>(null);

  // "Menunda" perubahan rentang waktu selama 300 milidetik sebelum benar-
  // benar memicu pengambilan data baru — supaya kalau pengguna mengeklik
  // beberapa pilihan rentang waktu dengan cepat berturut-turut, tidak ada
  // request yang sia-sia dikirim untuk pilihan yang langsung ditinggalkan.
  useEffect(() => {
    const t = setTimeout(() => setDebPeriod(period), 300);
    return () => clearTimeout(t);
  }, [period]);

  // --- Data fetching (real-time invalidation via SSE + React Query) ---
  useAnalyticsStream();

  const revenue     = useRevenueAnalytics(debouncedPeriod);
  const transaction = useTransactionAnalytics(debouncedPeriod);
  const enrollment  = useEnrollmentAnalytics(debouncedPeriod);
  const courses     = useCourseAnalytics(courseLimit);
  const promotions  = usePromotionAnalytics(debouncedPeriod);
  const payments    = usePaymentAnalytics(debouncedPeriod);

  // "Conversion Rate" (persentase transaksi yang berhasil lunas) tidak
  // dikirim langsung oleh backend, jadi dihitung sendiri di sini dari data
  // transaksi periode berjalan dan periode sebelumnya.
  const txTotal          = transaction.data?.summary.total          ?? 0;
  const enTotal          = enrollment.data?.summary.total           ?? 0;
  const paidTx           = transaction.data?.byStatus.find(s => s.status === 'paid')?.count ?? 0;
  const convRate         = txTotal > 0 ? Math.round((paidTx / txTotal) * 100) : 0;
  const prevTxTotal    = transaction.data?.summary.previousTotal     ?? 0;
  const prevPaidTx     = transaction.data?.summary.previousPaidCount ?? 0;
  const prevConvRate   = prevTxTotal > 0 ? Math.round((prevPaidTx / prevTxTotal) * 100) : 0;
  const convRateChange = transaction.isLoading ? undefined
    : prevTxTotal > 0 ? convRate - prevConvRate
    : convRate > 0    ? 100
    : 0;

  // Menyiapkan label sumbu dan nilai angka untuk ketiga grafik garis
  // (revenue, transactions, enrollment) dari data mentah yang sudah diambil.
  const revenueLabels = (revenue.data?.data     ?? []).map(d => fmtLabel(d.date));
  const revenueValues = (revenue.data?.data     ?? []).map(d => d.revenue);
  const txLabels      = (transaction.data?.trend ?? []).map(d => fmtLabel(d.date));
  const txValues      = (transaction.data?.trend ?? []).map(d => d.count);
  const enLabels      = (enrollment.data?.growth ?? []).map(d => fmtLabel(d.date));
  const enValues      = (enrollment.data?.growth ?? []).map(d => d.count);

  // --- Bagian ini menghitung data untuk grafik lingkaran (doughnut) metode pembayaran ---
  const paymentDist = payments.data?.distribution ?? [];
  const pieRevByIdx = paymentDist.map(d => d.totalRevenue);

  // Kalau pengguna sedang menyorot satu metode pembayaran (dengan klik
  // baris tabel atau slice grafik), data & persentasenya dihitung di sini
  // untuk ditampilkan di kotak ringkasan highlight.
  const activePaymentData = activePaymentFilter
    ? paymentDist.find(d => d.type === activePaymentFilter)
    : null;
  const filterTxShare = activePaymentData && payments.data
    ? Math.round((activePaymentData.count / (payments.data.summary.total || 1)) * 100)
    : 0;
  const filterRevShare = activePaymentData && payments.data
    ? Math.round((activePaymentData.totalRevenue / (payments.data.summary.totalRevenue || 1)) * 100)
    : 0;

  // Warna tiap potongan grafik lingkaran dibuat pudar kalau ada metode
  // pembayaran lain yang sedang disorot — supaya potongan yang sedang
  // difokuskan lebih menonjol dibanding yang lain.
  const pieColors = paymentDist.map((d, i) =>
    activePaymentFilter && d.type !== activePaymentFilter
      ? 'rgba(156,163,175,0.2)'
      : BASE_PIE_COLORS[i % BASE_PIE_COLORS.length]
  );

  // Daftar kursus yang ditampilkan tergantung tombol mana yang sedang aktif
  // (Most Popular atau Least Popular).
  const courseList = courseView === 'most'
    ? (courses.data?.mostEnrolled ?? [])
    : (courses.data?.leastEnrolled ?? []);

  // Pengaturan tampilan untuk grafik batang horizontal peringkat kursus.
  const barOptions = (color: string) => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend:  { display: false },
      tooltip: {
        ...TOOLTIP_BASE,
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) =>
            `${(ctx.parsed.x ?? 0).toLocaleString('en-US')} enrollments`,
        },
      },
    },
    scales: {
      x: {
        grid:   { color: 'rgba(107,114,128,0.15)' },
        ticks:  { color: TICK_FILL, font: { size: TICK_SIZE }, precision: 0 },
        border: { display: false },
      },
      y: {
        grid:   { display: false },
        ticks:  { color: TICK_FILL, font: { size: 9 } },
        border: { display: false },
      },
    },
    color,
  });

  // Pengaturan tampilan untuk grafik lingkaran (doughnut) metode pembayaran.
  const pieOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    cutout:              '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels:   { color: TICK_FILL, font: { size: 11 }, boxWidth: 8, padding: 14 },
      },
      tooltip: {
        ...TOOLTIP_BASE,
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) => {
            const count = (ctx.parsed as number).toLocaleString('en-US');
            const rev   = fmtCompact(pieRevByIdx[ctx.dataIndex] ?? 0);
            return [`${count} transactions`, `Revenue: ${rev}`];
          },
        },
      },
    },
    // Klik slice doughnut men-toggle filter; baris tabel & warna slice lain jadi
    // pudar untuk highlight silang antara chart dan tabel.
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!elements.length) { setActivePaymentFilter(null); return; }
      const type = paymentDist[elements[0].index]?.type;
      if (!type) return;
      setActivePaymentFilter(prev => prev === type ? null : type);
    },
  } as any;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">

        {/* Banner besar berwarna di bagian paling atas halaman, berisi judul
            "Analytics Dashboard". Bentuk gelombang di bagian bawahnya digambar
            memakai tiga lapis SVG (analytics-hill-1/2/3) untuk efek visual saja
            — tidak menampilkan data apa pun. */}
        <div className="analytics-hero-bg relative overflow-hidden rounded-2xl" style={{ minHeight: '220px' }}>

          <div
            className="pointer-events-none absolute"
            style={{
              top: '-15%', right: '-5%',
              width: '60%', height: '85%',
              background: 'radial-gradient(ellipse at 65% 30%, rgba(255,255,255,0.28), transparent 62%)',
            }}
          />

          <svg className="absolute bottom-0 w-full" style={{ height: '52%' }}
            viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
            <path className="analytics-hill-1"
              d="M0,55 C180,10 380,80 600,40 C820,0 1020,65 1200,35 C1340,15 1410,40 1440,32 L1440,120 L0,120 Z" />
          </svg>

          <svg className="absolute bottom-0 w-full" style={{ height: '38%' }}
            viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="analytics-hill-2"
              d="M0,55 C280,15 560,80 840,45 C1060,20 1260,65 1440,50 L1440,100 L0,100 Z" />
          </svg>

          <svg className="absolute bottom-0 w-full" style={{ height: '24%' }}
            viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
            <path className="analytics-hill-3"
              d="M0,40 C360,5 720,60 1080,30 C1260,15 1380,45 1440,38 L1440,80 L0,80 Z" />
          </svg>

          <div
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.06) 45%, transparent 70%)' }}
          />

          <div className="absolute inset-0 z-10 flex flex-col justify-end px-6 py-8">
            <h1 className="text-xl font-bold text-white drop-shadow sm:text-2xl">Analytics Dashboard</h1>
            <p className="mt-1 text-sm drop-shadow" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Monitor performance, enrollments, and transactions in real time
            </p>
          </div>
        </div>

        <PeriodSelector value={period} onChange={setPeriod} />

        {/* --- Kartu KPI: klik untuk scroll ke section terkait --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Revenue"
            value={fmtCompact(revenue.data?.summary.total ?? 0)}
            changePercent={revenue.data?.summary.changePercent}
            previousValue={revenue.data ? fmtCompact(revenue.data.summary.previousTotal) : undefined}
            icon={DollarSignIcon}
            color="emerald"
            isLoading={revenue.isLoading}
            onClick={() => revenueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
          <KpiCard
            label="Total Transactions"
            value={(transaction.data?.summary.total ?? 0).toLocaleString('en-US')}
            changePercent={transaction.data?.summary.changePercent}
            previousValue={transaction.data
              ? transaction.data.summary.previousTotal.toLocaleString('en-US')
              : undefined}
            icon={CreditCardIcon}
            color="violet"
            isLoading={transaction.isLoading}
            onClick={() => txRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
          <KpiCard
            label="Total Enrollments"
            value={(enrollment.data?.summary.total ?? 0).toLocaleString('en-US')}
            changePercent={enrollment.data?.summary.changePercent}
            previousValue={enrollment.data
              ? enrollment.data.summary.previousTotal.toLocaleString('en-US')
              : undefined}
            icon={GraduationCapIcon}
            color="blue"
            isLoading={enrollment.isLoading}
            onClick={() => enrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
          <KpiCard
            label="Conversion Rate"
            value={`${convRate}%`}
            changePercent={convRateChange}
            previousValue={`${prevConvRate}%`}
            icon={ZapIcon}
            color="amber"
            isLoading={transaction.isLoading}
            onClick={() => txRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        </div>

        {/* --- Section Revenue: grafik area + ringkasan --- */}
        <Section title="Revenue" icon={DollarSignIcon} sectionRef={revenueRef}>
          {revenue.isLoading ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
              <ChartSkeleton h={260} />
            </>
          ) : revenue.isError ? <ErrorBanner /> : revenue.data ? (
            <>
              <SummaryRow items={[
                { label: 'Total Revenue',     value: fmtCompact(revenue.data.summary.total)            },
                { label: 'Transaction Count', value: revenue.data.summary.count.toLocaleString('en-US') },
                { label: 'Average per Tx',    value: fmtCompact(revenue.data.summary.average)           },
              ]} />
              {revenueValues.length === 0 ? (
                <p className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                  No data for this period
                </p>
              ) : (
                <div style={{ height: 260 }}>
                  <Line
                    data={makeAreaData(revenueLabels, revenueValues, '#10b981', 'rgba(16,185,129,0.15)')}
                    options={areaChartOptions('#10b981', fmtCompact)}
                    plugins={[glowPlugin, crosshairPlugin]}
                  />
                </div>
              )}
            </>
          ) : null}
        </Section>

        {/* --- Section Transactions & Enrollment berdampingan --- */}
        <div className="grid gap-4 lg:grid-cols-2">

          <Section title="Transactions" icon={TrendingUpIcon} sectionRef={txRef}>
            {transaction.isLoading ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Skeleton className="h-12 rounded-lg" /><Skeleton className="h-12 rounded-lg" />
                </div>
                <ChartSkeleton />
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 rounded" />)}
                </div>
              </>
            ) : transaction.isError ? <ErrorBanner /> : transaction.data ? (
              <>
                <SummaryRow items={[
                  { label: 'Total Transactions', value: transaction.data.summary.total.toLocaleString('en-US') },
                  { label: 'Period',             value: PERIODS.find(p => p.value === period)?.label ?? period  },
                ]} />
                {txValues.length === 0 ? (
                  <p className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
                    No data for this period
                  </p>
                ) : (
                  <div style={{ height: CHART_H }}>
                    <Line
                      data={makeAreaData(txLabels, txValues, '#8b5cf6', 'rgba(139,92,246,0.15)')}
                      options={areaChartOptions('#8b5cf6')}
                      plugins={[glowPlugin, crosshairPlugin]}
                    />
                  </div>
                )}
                {transaction.data.byStatus.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per Status</p>
                    {transaction.data.byStatus.map(s => (
                      <HBarRow
                        key={s.status} label={s.status}
                        value={s.count} total={txTotal}
                        color={STATUS_COLOR[s.status] ?? '#6366f1'}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </Section>

          <Section title="Enrollment" icon={GraduationCapIcon} sectionRef={enrollRef}>
            {enrollment.isLoading ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Skeleton className="h-12 rounded-lg" /><Skeleton className="h-12 rounded-lg" />
                </div>
                <ChartSkeleton />
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 rounded" />)}
                </div>
              </>
            ) : enrollment.isError ? <ErrorBanner /> : enrollment.data ? (
              <>
                <SummaryRow items={[
                  { label: 'Total Enrollments', value: enrollment.data.summary.total.toLocaleString('en-US') },
                  { label: 'Period',           value: PERIODS.find(p => p.value === period)?.label ?? period },
                ]} />
                {enValues.length === 0 ? (
                  <p className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
                    No data for this period
                  </p>
                ) : (
                  <div style={{ height: CHART_H }}>
                    <Line
                      data={makeAreaData(enLabels, enValues, '#3b82f6', 'rgba(59,130,246,0.15)')}
                      options={areaChartOptions('#3b82f6')}
                      plugins={[glowPlugin, crosshairPlugin]}
                    />
                  </div>
                )}
                {enrollment.data.byStatus.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per Status</p>
                    {enrollment.data.byStatus.map(s => (
                      <HBarRow
                        key={s.status} label={s.status}
                        value={s.count} total={enTotal}
                        color={STATUS_COLOR[s.status] ?? '#6366f1'}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </Section>
        </div>

        {/* --- Section Course Ranking: toggle most/least populer + top 5/10 --- */}
        <div className="rounded-xl border bg-card overflow-hidden scroll-mt-4">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <BookOpenIcon className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Course Ranking</p>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex gap-1 rounded-lg border bg-muted/30 p-0.5">
                {(['most', 'least'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCourseView(v)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      courseView === v
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {v === 'most' ? 'Most Popular' : 'Least Popular'}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg border bg-muted/30 p-0.5">
                {([5, 10] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCourseLimit(v)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      courseLimit === v
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Top {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4">
            {courses.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: courseLimit }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-4" />
                    <Skeleton className="size-8 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-3 w-6" />
                  </div>
                ))}
              </div>
            ) : courses.isError ? <ErrorBanner /> : courseList.length ? (
              <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                <div className="min-w-0 divide-y">
                  {courseList.map((c, i) => (
                    <CourseRankRow key={c.courseId} course={c} rank={i + 1} />
                  ))}
                </div>
                <div className="min-w-0" style={{ height: Math.max(160, courseLimit * 28) }}>
                  <Bar
                    data={{
                      labels: courseList.map(c =>
                        c.title.length > 20 ? c.title.slice(0, 20) + '…' : c.title
                      ),
                      datasets: [{
                        data:            courseList.map(c => c.enrollmentCount),
                        backgroundColor: courseView === 'most' ? '#10b981' : '#f59e0b',
                        borderRadius:    4,
                        maxBarThickness: 18,
                      }],
                    }}
                    options={barOptions(courseView === 'most' ? '#10b981' : '#f59e0b')}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">No data yet</p>
            )}
          </div>
        </div>

        {/* --- Section Promo Usage & Payment Methods berdampingan --- */}
        <div className="grid gap-4 lg:grid-cols-2">

          <Section title="Promo Usage" icon={TagIcon}>
            {promotions.isLoading ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Skeleton className="h-12 rounded-lg" /><Skeleton className="h-12 rounded-lg" />
                </div>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
              </div>
            ) : promotions.isError ? <ErrorBanner /> : promotions.data ? (
              <>
                <SummaryRow items={[
                  { label: 'Promo Transactions', value: promotions.data.summary.totalPromoTransactions.toLocaleString('en-US') },
                  { label: 'Total Discount',     value: fmtCompact(promotions.data.summary.totalDiscount) },
                ]} />
                {promotions.data.promotions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No promotions used yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="pb-2 text-left font-medium">Code</th>
                          <th className="pb-2 text-right font-medium">Used</th>
                          <th className="pb-2 text-right font-medium">Discount</th>
                          <th className="pb-2 text-right font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {promotions.data.promotions.map(p => (
                          <tr key={p.code}>
                            <td className="py-2 font-mono font-semibold">
                              {p.code}
                              <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1">{p.type}</Badge>
                            </td>
                            <td className="py-2 text-right">{p.usageCount}</td>
                            <td className="py-2 text-right text-rose-600 dark:text-rose-400">
                              -{fmtCompact(p.totalDiscount)}
                            </td>
                            <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">
                              {fmtCompact(p.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </Section>

          <Section title="Payment Methods" icon={CreditCardIcon}>
            {payments.isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Skeleton className="h-12 rounded-lg" /><Skeleton className="h-12 rounded-lg" />
                </div>
                <ChartSkeleton h={240} />
              </div>
            ) : payments.isError ? <ErrorBanner /> : payments.data ? (
              <>
                <SummaryRow items={[
                  { label: 'Total Transactions', value: payments.data.summary.total.toLocaleString('en-US') },
                  { label: 'Total Revenue',   value: fmtCompact(payments.data.summary.totalRevenue)      },
                ]} />

                {activePaymentFilter && activePaymentData && (
                  <div className="mb-3 flex items-center justify-between rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-2 shrink-0 rounded-full bg-violet-400" />
                      <span className="text-xs font-semibold text-violet-300 shrink-0">
                        {activePaymentFilter}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        — {activePaymentData.count.toLocaleString('en-US')} tx ({filterTxShare}%)
                        · {fmtCompact(activePaymentData.totalRevenue)} ({filterRevShare}% rev)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePaymentFilter(null)}
                      className="ml-2 shrink-0 rounded p-0.5 hover:bg-white/10 transition-colors"
                    >
                      <XIcon className="size-3.5 text-muted-foreground" />
                    </button>
                  </div>
                )}

                {paymentDist.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="pb-2 text-left font-medium">Method</th>
                            <th className="pb-2 text-right font-medium">Tx</th>
                            <th className="pb-2 text-right font-medium">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paymentDist.map((d, i) => {
                            const isActive = activePaymentFilter === d.type;
                            return (
                              <tr
                                key={d.type}
                                onClick={() => setActivePaymentFilter(prev => prev === d.type ? null : d.type)}
                                className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                                  activePaymentFilter && !isActive ? 'opacity-40' : ''
                                }`}
                              >
                                <td className="py-1.5 flex items-center gap-1.5">
                                  <span
                                    className="inline-block size-2 rounded-full shrink-0"
                                    style={{ background: BASE_PIE_COLORS[i % BASE_PIE_COLORS.length] }}
                                  />
                                  <span className={`font-medium truncate ${isActive ? 'text-violet-400' : ''}`}>
                                    {d.type}
                                  </span>
                                </td>
                                <td className="py-1.5 text-right tabular-nums">
                                  {d.count.toLocaleString('en-US')}
                                </td>
                                <td className="py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                                  {fmtCompact(d.totalRevenue)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="cursor-pointer" style={{ height: 220 }}>
                      <Doughnut
                        data={{
                          labels:   paymentDist.map(d => d.type),
                          datasets: [{
                            data:            paymentDist.map(d => d.count),
                            backgroundColor: pieColors,
                            hoverOffset:     4,
                            borderWidth:     0,
                          }],
                        }}
                        options={{ ...pieOptions, plugins: { ...pieOptions.plugins, legend: { display: false } } }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </Section>

        </div>

      </div>
    </>
  );
}
