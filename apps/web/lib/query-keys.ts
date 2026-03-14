export const queryKeys = {
  orders: {
    all: ["orders"] as const,
    list: (filters?: { status?: string; type?: string }) => ["orders", "list", filters] as const,
    detail: (id: number) => ["orders", "detail", id] as const,
  },
  tables: {
    all: ["tables"] as const,
    withOrders: ["tables", "with-orders"] as const,
  },
  menu: {
    items: ["menu", "items"] as const,
    categories: ["menu", "categories"] as const,
  },
  employees: {
    all: ["employees"] as const,
    list: (filters?: Record<string, unknown>) => ["employees", "list", filters] as const,
    detail: (id: number) => ["employees", "detail", id] as const,
  },
  customers: {
    all: ["customers"] as const,
    list: (filters?: Record<string, unknown>) => ["customers", "list", filters] as const,
    detail: (id: number) => ["customers", "detail", id] as const,
  },
  kds: {
    tickets: (stationId: number) => ["kds", "tickets", stationId] as const,
    stations: ["kds", "stations"] as const,
  },
  branches: {
    all: ["branches"] as const,
  },
} as const;
