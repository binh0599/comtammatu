"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { approveLeaveRequest } from "./actions";
import {
  formatDate,
  getLeaveTypeLabel,
  getLeaveStatusLabel,
} from "@comtammatu/shared";

interface LeaveRequest {
  id: number;
  employee_id: number;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  created_at: string;
  approved_by: string | null;
  employees: {
    id: number;
    profile_id: string;
    profiles: { full_name: string };
  };
  approver: { full_name: string } | null;
}

interface Employee {
  id: number;
  profiles: { full_name: string; id: string; role: string };
}

function getLeaveTypeBadgeVariant(
  type: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "annual":
      return "default";
    case "sick":
      return "destructive";
    case "unpaid":
      return "secondary";
    case "maternity":
      return "outline";
    default:
      return "default";
  }
}

function getLeaveStatusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "pending":
      return "outline";
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

export function LeaveTab({
  leaveRequests,
}: {
  leaveRequests: LeaveRequest[];
  employees: Employee[];
}) {
  const [filter, setFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? leaveRequests
      : leaveRequests.filter((r) => r.status === filter);

  function handleApprove(id: number, status: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await approveLeaveRequest({ id, status });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nghi phep</h2>
          <p className="text-muted-foreground">
            Quan ly yeu cau nghi phep cua nhan vien
          </p>
        </div>
      </div>

      <Tabs
        value={filter}
        onValueChange={setFilter}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="all">
            Tat ca ({leaveRequests.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Cho duyet (
            {leaveRequests.filter((r) => r.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Da duyet (
            {leaveRequests.filter((r) => r.status === "approved").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Tu choi (
            {leaveRequests.filter((r) => r.status === "rejected").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhan vien</TableHead>
              <TableHead>Loai</TableHead>
              <TableHead>Tu ngay</TableHead>
              <TableHead>Den ngay</TableHead>
              <TableHead>So ngay</TableHead>
              <TableHead>Ly do</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground h-24 text-center"
                >
                  Khong co yeu cau nghi phep nao
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.employees.profiles.full_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getLeaveTypeBadgeVariant(request.type)}>
                      {getLeaveTypeLabel(request.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(request.start_date)}</TableCell>
                  <TableCell>{formatDate(request.end_date)}</TableCell>
                  <TableCell>{request.days}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {request.reason ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getLeaveStatusBadgeVariant(request.status)}
                    >
                      {getLeaveStatusLabel(request.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === "pending" ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(request.id, "approved")}
                          disabled={isPending}
                          title="Duyet"
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(request.id, "rejected")}
                          disabled={isPending}
                          title="Tu choi"
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {request.approver
                          ? `Boi: ${request.approver.full_name}`
                          : "-"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
