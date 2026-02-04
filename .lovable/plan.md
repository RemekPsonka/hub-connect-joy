
# Plan: Lazy Loading dla stron aplikacji

## Cel
Zaimplementować lazy loading dla wszystkich stron aplikacji (oprócz Login) w celu zmniejszenia początkowego rozmiaru bundle'a i przyspieszenia ładowania aplikacji.

---

## Zakres zmian

### 1. Nowy komponent: `src/components/PageLoadingFallback.tsx`

Prosty komponent fallback wyświetlany podczas ładowania lazy-loaded stron:

```typescript
import { Loader2 } from 'lucide-react';

export const PageLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Ładowanie...</p>
  </div>
);
```

### 2. Modyfikacja `src/App.tsx`

#### A. Zamiana importów statycznych na lazy()

| Strona | Przed | Po |
|--------|-------|-----|
| Dashboard | `import Dashboard from "./pages/Dashboard"` | `const Dashboard = lazy(() => import("./pages/Dashboard"))` |
| Contacts | `import Contacts from "./pages/Contacts"` | `const Contacts = lazy(() => import("./pages/Contacts"))` |
| ContactDetail | `import ContactDetail from "./pages/ContactDetail"` | `const ContactDetail = lazy(() => import("./pages/ContactDetail"))` |
| ... | ... | ... |

**Strony do konwersji (21 stron):**
- ForgotPassword
- Dashboard
- Contacts, ContactDetail
- Consultations, ConsultationDetail
- Meetings, MeetingDetail
- Matches
- Tasks
- AIChat
- Settings
- Search
- Notifications
- Analytics
- Owner
- Superadmin
- CompanyDetail
- BugReports
- Representatives
- PolicyPipeline
- NotFound

**Pozostają statyczne (1 strona):**
- Login (pierwsza strona którą widzi użytkownik)

**Już lazy-loaded:**
- Network (ma już własny NetworkFallback)

#### B. Owrapowanie Routes w Suspense

Najprostsze rozwiązanie - jeden Suspense wokół całego bloku Routes:

```tsx
<Suspense fallback={<PageLoadingFallback />}>
  <Routes>
    {/* wszystkie route'y */}
  </Routes>
</Suspense>
```

To zadziała dla wszystkich lazy-loaded stron oprócz Network, który ma własny specjalny fallback (z Skeleton).

---

## Szczegóły techniczne

### Import w App.tsx

```typescript
// Statyczne importy (strona logowania - szybkie ładowanie)
import Login from "./pages/Login";

// Lazy-loaded pages
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const Consultations = lazy(() => import("./pages/Consultations"));
const ConsultationDetail = lazy(() => import("./pages/ConsultationDetail"));
const Meetings = lazy(() => import("./pages/Meetings"));
const MeetingDetail = lazy(() => import("./pages/MeetingDetail"));
const Matches = lazy(() => import("./pages/Matches"));
const Tasks = lazy(() => import("./pages/Tasks"));
const AIChat = lazy(() => import("./pages/AIChat"));
const Settings = lazy(() => import("./pages/Settings"));
const Search = lazy(() => import("./pages/Search"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Owner = lazy(() => import("./pages/Owner"));
const Superadmin = lazy(() => import("./pages/Superadmin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const BugReports = lazy(() => import("./pages/BugReports"));
const Representatives = lazy(() => import("./pages/Representatives"));
const PolicyPipeline = lazy(() => import("./pages/PolicyPipeline"));
const Network = lazy(() => import("./pages/Network"));
```

### Struktura Suspense

Network zachowuje własny Suspense z NetworkFallback (lepszy UX dla tej strony).
Reszta używa globalnego PageLoadingFallback.

---

## Pliki do modyfikacji

| # | Plik | Akcja |
|---|------|-------|
| 1 | `src/components/PageLoadingFallback.tsx` | Utworzenie nowego pliku |
| 2 | `src/App.tsx` | Zamiana importów na lazy(), dodanie Suspense |

---

## Co pozostaje bez zmian

- Login - statyczny import (pierwsza strona)
- Logika AuthGuard i DirectorGuard
- Edge Functions
- Baza danych
- Pozostałe komponenty

---

## Korzyści

- **Mniejszy initial bundle** - strony ładowane na żądanie
- **Szybszy Time to First Paint** - tylko Login w początkowym bundle
- **Lepszy UX** - użytkownik widzi loading indicator zamiast białego ekranu
- **Code splitting** - Vite automatycznie tworzy osobne chunki dla każdej strony
