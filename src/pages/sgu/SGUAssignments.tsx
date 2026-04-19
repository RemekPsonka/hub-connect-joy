import { AssignmentBoard } from '@/components/sgu/AssignmentBoard';

export default function SGUAssignments() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Przypisania klientów</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Przeciągnij kartę klienta między kolumnami, aby zmienić przypisanie do przedstawiciela.
        </p>
      </div>
      <AssignmentBoard />
    </div>
  );
}
