import { useState } from "react";
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";

const columns = [
  { id: "pendente", title: "Pendente" },
  { id: "em_andamento", title: "Em Andamento" },
  { id: "concluida", title: "Concluído" },
];

export function KanbanBoard({ tasks, onTaskMove, onEdit, onCollab }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const overId = over.id;

    // Check if dropped on a column or another task
    const newStatus = columns.find(c => c.id === overId) ? overId : tasks.find(t => t.id === overId)?.status;
    
    if (newStatus && active.data.current.status !== newStatus) {
      onTaskMove(taskId, newStatus);
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
        {columns.map((column) => (
          <KanbanColumn 
            key={column.id} 
            column={column} 
            tasks={tasks.filter(t => t.status === column.id)} 
            onEdit={onEdit}
            onCollab={onCollab}
          />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({ column, tasks, onEdit, onCollab }) {
  return (
    <div className="bg-muted/30 rounded-lg p-4 flex flex-col gap-4 border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {column.title}
          <Badge variant="secondary" className="text-[10px]">{tasks.length}</Badge>
        </h3>
      </div>
      <div className="flex flex-col gap-4 flex-1">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              onEdit={onEdit} 
              onCollab={onCollab}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableTaskCard({ task, onEdit, onCollab }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
    data: { status: task.status }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard 
        task={task} 
        onEdit={onEdit} 
        onCollab={onCollab}
        // Minimal props since drag handles listeners
        onDelete={() => {}} 
        onToggle={() => {}} 
        onHistory={() => {}} 
      />
    </div>
  );
}
