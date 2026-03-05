"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatTime, getShiftAssignmentStatusLabel } from "@comtammatu/shared";
import { getMyShiftAssignments } from "@/app/(employee)/employee/actions";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ScheduleCalendarProps {
  initialAssignments: any[];
  initialYear: number;
  initialMonth: number;
}

export function ScheduleCalendar({
  initialAssignments,
  initialYear,
  initialMonth,
}: ScheduleCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assignments, setAssignments] = useState<any[]>(initialAssignments);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday = 0, Sunday = 6
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  // Build assignment lookup by date
  const assignmentsByDate = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const date = a.date;
    if (!assignmentsByDate.has(date)) {
      assignmentsByDate.set(date, []);
    }
    assignmentsByDate.get(date)!.push(a);
  }

  const today = toLocalDateString(new Date());

  function navigateMonth(direction: -1 | 1) {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(null);

    const startDate = toLocalDateString(new Date(newYear, newMonth, 1));
    const endDate = toLocalDateString(new Date(newYear, newMonth + 1, 0));

    startTransition(async () => {
      const data = await getMyShiftAssignments(startDate, endDate);
      setAssignments(data);
    });
  }

  const selectedAssignments = selectedDate ? assignmentsByDate.get(selectedDate) ?? [] : [];

  // Compute prev/next month labels for aria
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(-1)}
          disabled={isPending}
          aria-label={`Tháng trước: ${MONTH_NAMES[prevMonth]} ${prevYear}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(1)}
          disabled={isPending}
          aria-label={`Tháng sau: ${MONTH_NAMES[nextMonth]} ${nextYear}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: startWeekday }, (_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const hasShift = assignmentsByDate.has(dateStr);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`relative flex h-10 items-center justify-center rounded-md text-sm transition-colors
                    ${isSelected ? "bg-primary text-primary-foreground" : ""}
                    ${isToday && !isSelected ? "border-primary border font-bold" : ""}
                    ${!isSelected && !isToday ? "hover:bg-accent" : ""}
                  `}
                >
                  {dayNum}
                  {hasShift && (
                    <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected date details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAssignments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có ca làm ngày này.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedAssignments.map((a: typeof assignments[number]) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{a.shifts?.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatTime(a.shifts?.start_time)} - {formatTime(a.shifts?.end_time)}
                      </p>
                      {a.shifts?.branches?.name && (
                        <p className="text-muted-foreground text-xs">{a.shifts.branches.name}</p>
                      )}
                      {a.notes && (
                        <p className="text-muted-foreground text-xs mt-1">{a.notes}</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {getShiftAssignmentStatusLabel(a.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
