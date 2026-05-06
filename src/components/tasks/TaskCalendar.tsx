import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function TaskCalendar({ tasks, onSelectTask }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const tasksByDay = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (task.due_date) {
        const date = format(new Date(task.due_date), "yyyy-MM-dd");
        if (!map[date]) map[date] = [];
        map[date].push(task);
      }
    });
    return map;
  }, [tasks]);

  return (
    <div className="bg-background border rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b bg-muted/20">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
          <div key={day} className="p-2 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay[dateStr] || [];
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div 
              key={dateStr} 
              className={`min-h-[120px] p-2 border-r border-b last:border-r-0 transition-colors hover:bg-muted/5 ${
                !isCurrentMonth ? "bg-muted/10 opacity-50" : ""
              } ${isToday ? "bg-primary/5" : ""}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center ${
                  isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}>
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(task => (
                  <button
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`w-full text-left p-1 text-[10px] rounded border truncate transition-all hover:scale-105 active:scale-95 ${
                      task.status === 'concluida' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' :
                      task.priority === 'critica' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      'bg-primary/10 text-primary border-primary/20'
                    }`}
                  >
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center font-medium">
                    +{dayTasks.length - 3} mais
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
