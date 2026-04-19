import { useRef, useEffect, useState } from 'react';
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
type LayoutItem = { i: string; x: number; y: number; w: number; h: number };
import { useWorkspaceWidgets, useUpdateWidgetLayout } from '@/hooks/useWorkspaceWidgets';
import { KPIWidget } from './KPIWidget';
import { NoteWidget } from './NoteWidget';
import { AIRecsWidget } from './AIRecsWidget';
import { CalendarWidget } from './CalendarWidget';
import { Skeleton } from '@/components/ui/skeleton';
import { AddWidgetMenu } from './AddWidgetMenu';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(ref.current);
    setWidth(ref.current.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function WidgetGrid() {
  const { data: widgets = [], isLoading } = useWorkspaceWidgets();
  const updateLayout = useUpdateWidgetLayout();
  const { ref, width } = useContainerWidth();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-muted-foreground">Twój cockpit jest pusty. Dodaj pierwszy widget.</p>
        <AddWidgetMenu />
      </div>
    );
  }

  const layouts = {
    lg: widgets.map((w) => ({ i: w.id, x: w.grid_x, y: w.grid_y, w: w.grid_w, h: w.grid_h })),
  };

  const handleChange = (current: readonly LayoutItem[]) => {
    updateLayout.mutate(current.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
  };

  const renderWidget = (w: typeof widgets[number]) => {
    switch (w.widget_type) {
      case 'kpi':
        return <KPIWidget metric={w.config?.metric ?? 'contacts_active'} range={w.config?.range ?? '30d'} />;
      case 'note':
        return <NoteWidget widgetId={w.id} noteId={w.config?.note_id ?? null} />;
      case 'ai_recs':
        return <AIRecsWidget />;
      case 'calendar':
        return <CalendarWidget />;
    }
  };

  return (
    <div ref={ref}>
      <div className="flex justify-end mb-3">
        <AddWidgetMenu />
      </div>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={60}
        margin={[12, 12]}
        width={width}
        onLayoutChange={handleChange as any}
      >
        {widgets.map((w) => (
          <div key={w.id}>{renderWidget(w)}</div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
