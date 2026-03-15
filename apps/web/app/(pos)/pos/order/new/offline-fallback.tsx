"use client";

import { useState, useEffect } from "react";
import { WifiOff, Loader2 } from "lucide-react";
import { getCachedMenuData, getCachedTableData } from "../../lib/offline-db";
import { NewOrderClient } from "./new-order-client";

/**
 * Offline fallback for the new order page.
 * Loads cached menu items, categories, and tables from IndexedDB
 * and renders the NewOrderClient with cached data.
 */
export function OfflineFallback() {
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<unknown[] | null>(null);
  const [categories, setCategories] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCache() {
      try {
        const [menuEntry, categoriesEntry] = await Promise.all([
          getCachedMenuData("menu"),
          getCachedMenuData("categories"),
        ]);

        if (!menuEntry?.data || !categoriesEntry?.data) {
          setError("Không có dữ liệu menu được lưu trữ. Vui lòng kết nối mạng và tải lại trang.");
          return;
        }

        setMenuItems(menuEntry.data as unknown[]);
        setCategories(categoriesEntry.data as unknown[]);
      } catch {
        setError("Không thể đọc dữ liệu từ bộ nhớ cục bộ.");
      } finally {
        setLoading(false);
      }
    }

    loadCache();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Đang tải dữ liệu từ bộ nhớ cục bộ...</p>
      </div>
    );
  }

  if (error || !menuItems || !categories) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-full bg-yellow-100 p-4">
          <WifiOff className="size-8 text-yellow-600" />
        </div>
        <h2 className="text-lg font-semibold">Chế độ ngoại tuyến</h2>
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          {error ?? "Không có dữ liệu menu. Kết nối mạng để tải menu lần đầu."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto mb-3 flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-2 text-yellow-800">
        <WifiOff className="size-4" />
        <span className="text-sm font-medium">
          Chế độ ngoại tuyến — đơn hàng sẽ được đồng bộ khi có mạng
        </span>
      </div>
      <NewOrderClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Offline cache data shape matches server but lacks generated type
        menuItems={menuItems as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Offline cache data shape matches server but lacks generated type
        categories={categories as any}
        terminalId={0} // Offline — terminal validation happens on sync
        tableId={null}
        tableCapacity={null}
      />
    </>
  );
}
