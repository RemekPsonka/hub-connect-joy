
Błąd z replay: `relation 'public.task_activity_log' does not exist`. Trigger na `tasks` próbuje wpisywać do nieistniejącej tabeli, więc każdy UPDATE zadania pada (status, priority, title itp.).

Sprawdzę triggery na `tasks` i co dokładnie odwołuje się do `task_activity_log`, potem zdecyduję: utworzyć tabelę czy usunąć trigger.
