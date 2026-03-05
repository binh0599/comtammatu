"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@comtammatu/shared";
import { getExpiringBatches } from "./actions";

interface ExpiringBatch {
  id: number;
  ingredient_id: number;
  branch_id: number;
  quantity: number;
  expiry_date: string;
  po_id: number | null;
  created_at: string;
  ingredients: { name: string; unit: string } | null;
}

export function ExpiryTab({
  initialData,
}: {
  initialData: ExpiringBatch[];
}) {
  const [batches, setBatches] = useState<ExpiringBatch[]>(initialData);
  const [daysAhead, setDaysAhead] = useState("7");
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      const days = parseInt(daysAhead) || 7;
      const data = await getExpiringBatches(days);
      setBatches(data as ExpiringBatch[]);
    });
  }

  function getDaysUntilExpiry(expiryDate: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    return diff;
  }

  function getExpiryBadge(expiryDate: string) {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) {
      return <Badge variant="destructive">Da het han</Badge>;
    }
    if (days === 0) {
      return <Badge variant="destructive">Het han hom nay</Badge>;
    }
    if (days <= 2) {
      return (
        <Badge className="bg-red-500 hover:bg-red-600">
          Con {days} ngay
        </Badge>
      );
    }
    if (days <= 5) {
      return (
        <Badge className="bg-yellow-600 hover:bg-yellow-700">
          Con {days} ngay
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        Con {days} ngay
      </Badge>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Han su dung</h2>
          <p className="text-muted-foreground">
            Theo doi lo hang sap het han su dung
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="days-ahead" className="whitespace-nowrap text-sm">
              Xem truoc (ngay)
            </Label>
            <Input
              id="days-ahead"
              type="number"
              min="1"
              max="90"
              className="w-20 h-9"
              value={daysAhead}
              onChange={(e) => setDaysAhead(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Dang tai..." : "Lam moi"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Nguyen lieu</TableHead>
              <TableHead scope="col">Don vi</TableHead>
              <TableHead scope="col" className="text-right">So luong</TableHead>
              <TableHead scope="col">Han su dung</TableHead>
              <TableHead scope="col">Tinh trang</TableHead>
              <TableHead scope="col">Don mua hang</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  Khong co lo hang nao sap het han
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">
                    {batch.ingredients?.name ?? `#${batch.ingredient_id}`}
                  </TableCell>
                  <TableCell>
                    {batch.ingredients?.unit ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(batch.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell>{formatDate(batch.expiry_date)}</TableCell>
                  <TableCell>{getExpiryBadge(batch.expiry_date)}</TableCell>
                  <TableCell>
                    {batch.po_id ? `PO #${batch.po_id}` : "-"}
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
