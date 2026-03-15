"use client";

import { CalendarDays } from "lucide-react";
import { formatTime, getShiftAssignmentStatusLabel } from "@comtammatu/shared";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@comtammatu/ui";

interface ShiftDetailCardProps {
  selectedDate: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Shift assignment shape from dynamic query with joins
  assignments: any[];
}

export function ShiftDetailCard({ selectedDate, assignments }: ShiftDetailCardProps) {
  return (
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
        {assignments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Không có ca làm ngày này.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{a.shifts?.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatTime(a.shifts?.start_time)} - {formatTime(a.shifts?.end_time)}
                  </p>
                  {a.shifts?.branches?.name && (
                    <p className="text-muted-foreground text-xs">{a.shifts.branches.name}</p>
                  )}
                  {a.notes && <p className="text-muted-foreground text-xs mt-1">{a.notes}</p>}
                </div>
                <Badge variant="outline">{getShiftAssignmentStatusLabel(a.status)}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
