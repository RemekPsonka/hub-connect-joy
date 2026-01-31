interface TimelineLegendProps {
  darkMode: boolean;
}

export function TimelineLegend({ darkMode }: TimelineLegendProps) {
  const items = [
    { 
      label: 'Aktywna polisa', 
      color: darkMode ? 'bg-blue-400' : 'bg-blue-500' 
    },
    { 
      label: 'Faza działań (90 dni)', 
      color: darkMode ? 'bg-green-400' : 'bg-green-600' 
    },
    { 
      label: 'Strefa zagrożenia (30 dni)', 
      gradient: darkMode 
        ? 'bg-gradient-to-r from-red-900 to-red-600'
        : 'bg-gradient-to-r from-red-100 to-red-500'
    },
  ];

  return (
    <div 
      className={`flex flex-wrap items-center gap-4 px-4 py-2 border-b text-xs ${
        darkMode ? 'bg-slate-800 text-slate-300' : 'bg-muted/50'
      }`}
    >
      <span className="font-medium text-muted-foreground">LEGENDA:</span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div 
            className={`w-4 h-3 rounded-sm ${item.color || item.gradient}`}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
