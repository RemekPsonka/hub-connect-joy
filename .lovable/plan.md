

# Faza 0: Design System Refresh — Plan Implementacji

## Kontekst

Obecny stan designu:
- Primary: hsl(209, 59%, 30%) — ciemny niebieski (#1F4E79)
- Sidebar: jasne tło (hsl(0 0% 98%)) — generic
- Brak dark mode toggle
- Brak ThemeContext
- Font: systemowy (brak Inter)
- Radius: 0.5rem (--radius)
- ErrorBoundary: już istnieje z logowaniem do DB — wymaga tylko stylistycznego liftingu
- Dashboard: działa z MV (useDashboardStats) — wymaga redesignu kart

## Dostosowanie do preferencji

Brief proponuje `blue-600` jako secondary — ale użytkownik wyraźnie nie chce niebieskiego. Zamiast tego:
- **Primary**: hsl(263, 70%, 50%) — violet-600 (#7C3AED) — zgodnie z briefem
- **Secondary**: hsl(160, 84%, 39%) — emerald-500 (#10B981) — zamiast blue
- **Sidebar**: dark slate (hsl(215, 28%, 17%)) — zgodnie z briefem
- **Background**: hsl(210, 20%, 98%) — delikatnie cieplejszy slate

## 6 Promptów Fazy 0

---

### PROMPT 0.1 — Design Tokens + Theme Provider

**Pliki do modyfikacji:**
- `src/index.css` — nowe CSS variables (light + dark)
- `tailwind.config.ts` — nowe kolory (success, warning), radius 0.75rem
- `src/contexts/ThemeContext.tsx` — NOWY: ThemeProvider z localStorage persistence
- `src/main.tsx` — owinięcie App w ThemeProvider
- `index.html` — import fontu Inter z Google Fonts

**Zmiany CSS variables (light):**
```text
--primary: 263 70% 50%          (violet-600)
--primary-foreground: 0 0% 100%
--background: 210 20% 98%       (ciepły slate-50)
--card: 0 0% 100%
--foreground: 215 28% 17%       (slate-800)
--muted: 210 20% 95%
--muted-foreground: 215 16% 47%
--border: 214 20% 90%
--radius: 0.75rem
--sidebar-background: 215 28% 17%  (dark!)
--sidebar-foreground: 210 20% 90%
--sidebar-primary: 263 70% 65%
--sidebar-accent: 215 25% 22%
--sidebar-border: 215 25% 25%
```

**ThemeContext:**
- Trzy tryby: light / dark / system
- Persist w localStorage (key: "connecthub-theme")
- useEffect synchronizujący klasę `.dark` na `<html>`
- Hook `useTheme()` eksportujący { theme, setTheme }

---

### PROMPT 0.2 — Sidebar Redesign (Dark, ClickUp-style)

**Plik do modyfikacji:** `src/components/layout/AppSidebar.tsx`

**Zmiany wizualne (bez zmian logiki nawigacji):**
- Dark sidebar dzięki nowym CSS variables (sidebar-background: slate-800)
- Logo area: h-16, border-b border-sidebar-border, ikona violet
- Nav items: px-3 py-2 rounded-lg text-sm hover:bg-sidebar-accent transition-colors
- Active item: bg-violet-600/20 text-violet-300 border-l-2 border-violet-500
- Group labels: text-xs uppercase text-sidebar-foreground/50 tracking-wider
- User area (footer): border-t, avatar + imię + rola
- Smooth width transition na collapse/expand

**Co się NIE zmienia:**
- Grupy nawigacji (CRM, AI & Analiza, Sieć) — zachowane
- Logika ról (assistant, admin, superadmin) — zachowana
- Routing — zachowany

---

### PROMPT 0.3 — Header Bar + Breadcrumbs

**Pliki do modyfikacji:**
- `src/components/layout/AppLayout.tsx` — nowy header z breadcrumbs
- `src/components/layout/Breadcrumbs.tsx` — NOWY: auto-generowane breadcrumbs z route mapping

**Zmiany w header:**
- Sticky top-0 z-30, bg-background/80 backdrop-blur-sm border-b
- H-14 flex items-center justify-between px-6
- Left: SidebarTrigger + Breadcrumbs
- Center: Quick Search (obecny input — bez zmian funkcjonalnych)
- Right: NotificationBell + Theme toggle (sun/moon) + UserMenu

**Breadcrumbs:**
- Auto-generated z React Router location
- Route mapping: { '/': 'Dashboard', '/contacts': 'Kontakty', '/companies': 'Firmy', ... }
- Styl: text-sm text-muted-foreground, ostatni element text-foreground font-medium
- Separator: ChevronRight (lucide)

---

### PROMPT 0.4 — Card System + Empty States + Loading Skeletons

**Pliki do utworzenia:**
- `src/components/ui/stat-card.tsx` — NOWY
- `src/components/ui/data-card.tsx` — NOWY
- `src/components/ui/empty-state.tsx` — NOWY
- `src/components/ui/skeleton-card.tsx` — NOWY

**StatCard:**
- bg-card rounded-xl p-5 shadow-sm border border-border
- Ikona w kolorowym kółku (w-10 h-10 rounded-lg bg-primary/10)
- Value: text-2xl font-bold
- Label: text-sm text-muted-foreground
- Opcjonalny trend (+12% zielony, -5% czerwony)

**DataCard:**
- bg-card rounded-xl shadow-sm border overflow-hidden
- Header: px-5 py-3 border-b flex justify-between
- Body: p-5
- Footer: px-5 py-3 bg-muted/30 border-t

**EmptyState:**
- flex flex-col items-center py-12 text-center
- Ikona Lucide (w-12 h-12 text-muted-foreground/30)
- Heading + Description + CTA Button

**SkeletonCard:**
- animate-pulse bg-muted rounded-xl z konfigurowalną wysokością

---

### PROMPT 0.5 — Enhanced ErrorBoundary + Toast Polish

**Plik do modyfikacji:** `src/components/ErrorBoundary.tsx`

Obecny ErrorBoundary jest już dobry (loguje do DB, ma szczegóły w dev mode). Zmiany to tylko lifting wizualny:
- Większa ikona AlertTriangle w kolorowym kółku
- Gradient tło (subtle) zamiast płaskiego bg-background
- Przycisk "Zgłoś błąd" z mailto (error details w body)
- Lepsze formatowanie stack trace (font-mono, mniejszy tekst)

Toast system — bez zmian, Sonner działa prawidłowo. Opcjonalnie dodanie kolorowego left-border per typ.

---

### PROMPT 0.6 — Dashboard Redesign

**Plik do modyfikacji:** `src/pages/Dashboard.tsx`

**Zmiany:**
- Zastąpienie obecnych `StatsCard` nowymi `StatCard` z promptu 0.4
- Użycie `DataCard` jako wrapper dla widgetów (UpcomingConsultations, MeetingsOverview itd.)
- Grid: desktop grid-cols-12 gap-4
  - Top row: 4x StatCard (col-span-3)
  - Middle: 2x DataCard (col-span-6) — Konsultacje + Spotkania
  - Tasks row: 3x (KPI + My + Team) — zachowane
  - Bottom: 2x2 grid pozostałych widgetów
- Mobile: grid-cols-1

**Co się NIE zmienia:**
- useDashboardStats hook
- Komponenty widgetów (UpcomingConsultations, KPITasksWidget itd.) — zachowane
- Logika pustego stanu

---

## Kolejność implementacji

1. **0.1** Design Tokens + ThemeContext (fundament — wszystko inne na tym bazuje)
2. **0.2** Sidebar Redesign (natychmiast widoczna zmiana)
3. **0.3** Header + Breadcrumbs (uzupełnienie layoutu)
4. **0.4** Card System (reusable komponenty)
5. **0.5** ErrorBoundary polish (szybka zmiana)
6. **0.6** Dashboard Redesign (łączy wszystko razem)

## Pliki do modyfikacji (podsumowanie)

| Plik | Akcja |
|------|-------|
| `src/index.css` | Modyfikacja — nowe CSS variables |
| `tailwind.config.ts` | Modyfikacja — success/warning kolory, radius |
| `index.html` | Modyfikacja — import Inter font |
| `src/contexts/ThemeContext.tsx` | Nowy |
| `src/main.tsx` | Modyfikacja — ThemeProvider wrapper |
| `src/components/layout/AppSidebar.tsx` | Modyfikacja — dark theme styling |
| `src/components/layout/AppLayout.tsx` | Modyfikacja — header z breadcrumbs + theme toggle |
| `src/components/layout/Breadcrumbs.tsx` | Nowy |
| `src/components/ui/stat-card.tsx` | Nowy |
| `src/components/ui/data-card.tsx` | Nowy |
| `src/components/ui/empty-state.tsx` | Nowy |
| `src/components/ui/skeleton-card.tsx` | Nowy |
| `src/components/ErrorBoundary.tsx` | Modyfikacja — visual polish |
| `src/pages/Dashboard.tsx` | Modyfikacja — nowy grid z nowymi komponentami |

## Guardrails

- NIE modyfikuj hooków (useDashboardStats, useAuth itd.)
- NIE modyfikuj Edge Functions
- NIE usuwaj komponentów dashboard — tylko owijaj w nowe karty
- Zachowaj istniejącą logikę ról w sidebar
- Zachowaj istniejące route'y
- App.css (Vite boilerplate) — do usunięcia, nie jest używany
- Wszystko implementowane prompt po prompcie, testowane po każdym kroku

