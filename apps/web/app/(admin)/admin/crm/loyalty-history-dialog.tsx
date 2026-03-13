"use client";

import { useState } from "react";
import {
  formatDateTime,
  formatPoints,
  getLoyaltyTransactionTypeLabel,
} from "@comtammatu/shared";
import { getCustomerLoyaltyHistory } from "./actions";
import type { Customer, LoyaltyTransaction } from "./crm-types";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

export function LoyaltyHistoryDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [history, setHistory] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    setLoading(true);
    const result = await getCustomerLoyaltyHistory(customer.id);
    if (result && "data" in result && result.data) {
      setHistory(result.data);
    }
    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) loadHistory();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lịch sử điểm — {customer.full_name}</DialogTitle>
          <DialogDescription>
            20 giao dịch gần nhất
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="text-muted-foreground">Đang tải...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            Chưa có giao dịch nào
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Ngày</TableHead>
                  <TableHead scope="col">Loại</TableHead>
                  <TableHead scope="col" className="text-right">Điểm</TableHead>
                  <TableHead scope="col" className="text-right">Số dư</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(tx.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getLoyaltyTransactionTypeLabel(tx.type)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        tx.points > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatPoints(tx.points)}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.balance_after != null ? tx.balance_after : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
