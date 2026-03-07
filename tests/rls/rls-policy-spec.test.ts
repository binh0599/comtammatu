/**
 * RLS Policy Specification Tests
 *
 * Documents and validates the expected RLS policies for every table.
 * This is a "spec test" — it verifies the POLICY DESIGN is correct
 * by checking the SQL migration files, not by running queries against
 * a live database.
 *
 * To run: pnpm vitest tests/rls/
 *
 * For live validation, use tests/rls/rls-policy-audit.sql via
 * Supabase MCP execute_sql or supabase db execute.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Load all migration SQL
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = join(__dirname, "../../supabase/migrations");
const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const allSQL = migrationFiles
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf-8"))
  .join("\n");

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function hasRLSEnabled(table: string): boolean {
  const pattern = new RegExp(
    `ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  );
  return pattern.test(allSQL);
}

function getPolicies(table: string): string[] {
  const pattern = new RegExp(
    `CREATE\\s+POLICY\\s+"([^"]+)"\\s+ON\\s+${table}`,
    "gi",
  );
  const matches: string[] = [];
  let match;
  while ((match = pattern.exec(allSQL)) !== null) {
    matches.push(match[1]!);
  }
  return matches;
}

function hasPolicyForOperation(table: string, operation: string): boolean {
  const pattern = new RegExp(
    `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+${table}\\s+FOR\\s+${operation}`,
    "i",
  );
  return pattern.test(allSQL);
}

function hasPolicyWithRole(table: string, role: string): boolean {
  // Check if any policy on this table references the given role
  const policyPattern = new RegExp(
    `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+${table}[\\s\\S]*?(?=CREATE\\s+POLICY|$)`,
    "gi",
  );
  let match;
  while ((match = policyPattern.exec(allSQL)) !== null) {
    if (match[0].includes(`'${role}'`)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Expected RLS configuration per table
// ---------------------------------------------------------------------------

interface TableRLSSpec {
  table: string;
  expectedPolicyCount: number; // minimum number of policies
  requiredOperations: string[]; // SELECT, INSERT, UPDATE, DELETE, ALL
  description: string;
}

const TABLE_SPECS: TableRLSSpec[] = [
  // Tier 1: Core
  { table: "tenants", expectedPolicyCount: 2, requiredOperations: ["SELECT", "UPDATE"], description: "Tenant isolation: select own, owner can update" },
  { table: "branches", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Branch isolation by tenant" },
  { table: "branch_zones", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Zone isolation by branch->tenant" },
  { table: "tables", expectedPolicyCount: 3, requiredOperations: ["SELECT", "UPDATE", "ALL"], description: "Table access by branch, staff update, manager manage" },
  { table: "profiles", expectedPolicyCount: 3, requiredOperations: ["SELECT", "UPDATE", "ALL"], description: "Profile: see tenant, update own, manager manage" },

  // Menu system
  { table: "menus", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Menu tenant isolation" },
  { table: "menu_categories", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Category tenant isolation" },
  { table: "menu_items", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Item tenant isolation" },
  { table: "menu_item_variants", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Variant tenant isolation" },
  { table: "menu_item_modifiers", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Modifier tenant isolation" },
  { table: "menu_branches", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Menu-branch assignment isolation" },
  { table: "menu_item_available_sides", expectedPolicyCount: 2, requiredOperations: ["SELECT"], description: "Available sides tenant isolation" },

  // POS
  { table: "pos_terminals", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Terminal tenant isolation" },
  { table: "pos_sessions", expectedPolicyCount: 3, requiredOperations: ["SELECT", "INSERT", "UPDATE"], description: "Session: branch select, cashier insert/update" },
  { table: "orders", expectedPolicyCount: 3, requiredOperations: ["SELECT", "INSERT", "UPDATE"], description: "Order: branch select, staff insert/update" },
  { table: "order_items", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Order items: branch select, staff manage" },
  { table: "order_discounts", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Discounts: branch select, cashier manage" },
  { table: "order_status_history", expectedPolicyCount: 2, requiredOperations: ["SELECT", "INSERT"], description: "Status history: branch select, staff insert" },
  { table: "payments", expectedPolicyCount: 3, requiredOperations: ["SELECT", "INSERT", "UPDATE"], description: "Payments: branch select, cashier insert, manager update" },

  // KDS
  { table: "kds_stations", expectedPolicyCount: 2, requiredOperations: ["SELECT"], description: "KDS stations: branch/manager select" },
  { table: "kds_tickets", expectedPolicyCount: 3, requiredOperations: ["SELECT", "INSERT", "UPDATE"], description: "KDS tickets: branch select, staff insert, chef update" },
  { table: "kds_timing_rules", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "KDS timing rules isolation" },
  { table: "kds_station_categories", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "KDS station categories isolation" },

  // Inventory
  { table: "ingredients", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Ingredients tenant isolation" },
  { table: "suppliers", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Suppliers tenant isolation" },
  { table: "recipes", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Recipes tenant isolation" },
  { table: "recipe_ingredients", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Recipe ingredients isolation" },
  { table: "stock_levels", expectedPolicyCount: 3, requiredOperations: ["SELECT", "UPDATE", "INSERT"], description: "Stock levels: branch select, inventory update/insert" },
  { table: "stock_movements", expectedPolicyCount: 2, requiredOperations: ["SELECT", "INSERT"], description: "Stock movements: branch select, inventory insert" },
  { table: "waste_logs", expectedPolicyCount: 2, requiredOperations: ["SELECT", "INSERT"], description: "Waste logs: branch select, inventory insert" },
  { table: "purchase_orders", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "PO tenant isolation" },
  { table: "purchase_order_items", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "PO items tenant isolation" },

  // CRM
  { table: "customers", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Customers tenant isolation" },
  { table: "loyalty_tiers", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Loyalty tiers tenant isolation" },
  { table: "loyalty_transactions", expectedPolicyCount: 2, requiredOperations: ["SELECT", "INSERT"], description: "Loyalty transactions: tenant select, staff insert" },
  { table: "vouchers", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Vouchers tenant isolation" },
  { table: "voucher_branches", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Voucher branches isolation" },
  { table: "campaigns", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Campaigns tenant isolation" },
  { table: "customer_feedback", expectedPolicyCount: 3, requiredOperations: ["SELECT", "INSERT", "UPDATE"], description: "Feedback: branch select, anyone insert, manager update" },

  // HR
  { table: "employees", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Employees: branch select, HR manage" },
  { table: "shifts", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Shifts: branch select, manager manage" },
  { table: "shift_assignments", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Shift assignments: branch select, HR manage" },
  { table: "attendance_records", expectedPolicyCount: 2, requiredOperations: ["SELECT", "INSERT"], description: "Attendance: branch select, staff insert" },
  { table: "leave_requests", expectedPolicyCount: 3, requiredOperations: ["SELECT", "INSERT", "UPDATE"], description: "Leave: own/HR select, employee insert, HR update" },
  { table: "payroll_periods", expectedPolicyCount: 2, requiredOperations: ["SELECT"], description: "Payroll periods: HR/staff select" },
  { table: "payroll_items", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Payroll items: HR select/manage" },

  // System
  { table: "audit_logs", expectedPolicyCount: 2, requiredOperations: ["SELECT", "INSERT"], description: "Audit: manager select, authenticated insert. NEVER UPDATE/DELETE" },
  { table: "security_events", expectedPolicyCount: 2, requiredOperations: ["SELECT", "INSERT"], description: "Security events: owner select, authenticated insert. NEVER UPDATE/DELETE" },
  { table: "deletion_requests", expectedPolicyCount: 2, requiredOperations: ["SELECT", "INSERT"], description: "Deletion requests: manager select, anyone insert" },
  { table: "notifications", expectedPolicyCount: 3, requiredOperations: ["SELECT", "UPDATE", "INSERT"], description: "Notifications: own select/update, system insert" },
  { table: "system_settings", expectedPolicyCount: 2, requiredOperations: ["SELECT", "ALL"], description: "Settings: tenant select, owner manage" },
  { table: "printer_configs", expectedPolicyCount: 2, requiredOperations: ["SELECT"], description: "Printer configs: branch isolation" },
  { table: "registered_devices", expectedPolicyCount: 3, requiredOperations: ["SELECT", "INSERT"], description: "Devices: tenant select, own insert, manager update" },

  // Push notifications
  { table: "push_subscriptions", expectedPolicyCount: 4, requiredOperations: ["SELECT", "INSERT", "UPDATE", "DELETE"], description: "Push subs: own CRUD, service role select/update" },

  // Payroll
  { table: "payroll_entries", expectedPolicyCount: 3, requiredOperations: ["SELECT", "INSERT", "UPDATE"], description: "Payroll entries: HR/staff select, HR insert/update" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RLS Helper Functions", () => {
  it("defines auth_tenant_id() function", () => {
    expect(allSQL).toContain("CREATE OR REPLACE FUNCTION auth_tenant_id()");
  });

  it("defines auth_branch_id() function", () => {
    expect(allSQL).toContain("CREATE OR REPLACE FUNCTION auth_branch_id()");
  });

  it("defines auth_role() function", () => {
    expect(allSQL).toContain("CREATE OR REPLACE FUNCTION auth_role()");
  });

  it("auth_tenant_id looks up from profiles table", () => {
    expect(allSQL).toMatch(/auth_tenant_id[\s\S]*?SELECT tenant_id FROM profiles/);
  });

  it("auth_branch_id looks up from profiles table", () => {
    expect(allSQL).toMatch(/auth_branch_id[\s\S]*?SELECT branch_id FROM profiles/);
  });

  it("auth_role looks up from profiles table", () => {
    expect(allSQL).toMatch(/auth_role[\s\S]*?SELECT role FROM profiles/);
  });

  it("all helper functions use SECURITY DEFINER", () => {
    // SECURITY DEFINER ensures the function runs with the privileges of
    // the function owner (postgres), not the calling user
    const authFunctions = allSQL.match(
      /CREATE OR REPLACE FUNCTION auth_(tenant_id|branch_id|role)[\s\S]*?(?=\$\$;)/g,
    );
    expect(authFunctions).not.toBeNull();
    for (const fn of authFunctions!) {
      expect(fn).toContain("SECURITY DEFINER");
    }
  });
});

describe("RLS Enabled on All Tables", () => {
  for (const spec of TABLE_SPECS) {
    it(`${spec.table} has RLS enabled`, () => {
      expect(hasRLSEnabled(spec.table)).toBe(true);
    });
  }
});

describe("RLS Policy Coverage", () => {
  for (const spec of TABLE_SPECS) {
    describe(`${spec.table}: ${spec.description}`, () => {
      it(`has at least ${spec.expectedPolicyCount} policies`, () => {
        const policies = getPolicies(spec.table);
        expect(policies.length).toBeGreaterThanOrEqual(spec.expectedPolicyCount);
      });

      for (const op of spec.requiredOperations) {
        it(`has a policy for ${op}`, () => {
          expect(hasPolicyForOperation(spec.table, op)).toBe(true);
        });
      }
    });
  }
});

describe("Audit/Security Tables - Append-Only Enforcement", () => {
  it("audit_logs has NO UPDATE policy", () => {
    expect(hasPolicyForOperation("audit_logs", "UPDATE")).toBe(false);
  });

  it("audit_logs has NO DELETE policy", () => {
    expect(hasPolicyForOperation("audit_logs", "DELETE")).toBe(false);
  });

  it("security_events has NO UPDATE policy", () => {
    expect(hasPolicyForOperation("security_events", "UPDATE")).toBe(false);
  });

  it("security_events has NO DELETE policy", () => {
    expect(hasPolicyForOperation("security_events", "DELETE")).toBe(false);
  });
});

describe("Role-Based Access Control", () => {
  it("only owner can update tenants", () => {
    expect(hasPolicyWithRole("tenants", "owner")).toBe(true);
  });

  it("only owner can manage system_settings", () => {
    expect(hasPolicyWithRole("system_settings", "owner")).toBe(true);
  });

  it("manager+ can manage branches", () => {
    expect(hasPolicyWithRole("branches", "manager")).toBe(true);
  });

  it("cashier roles can manage payments", () => {
    expect(hasPolicyWithRole("payments", "cashier")).toBe(true);
  });

  it("inventory role can manage ingredients", () => {
    expect(hasPolicyWithRole("ingredients", "inventory")).toBe(true);
  });

  it("HR role can manage employees", () => {
    expect(hasPolicyWithRole("employees", "hr")).toBe(true);
  });

  it("chef role can update KDS tickets", () => {
    expect(hasPolicyWithRole("kds_tickets", "chef")).toBe(true);
  });
});

describe("Tenant Isolation", () => {
  const tenantIsolatedTables = [
    "tenants", "branches", "menus", "menu_categories", "menu_items",
    "menu_item_variants", "menu_item_modifiers", "pos_terminals",
    "ingredients", "suppliers", "recipes", "customers",
    "loyalty_tiers", "vouchers", "campaigns", "system_settings",
  ];

  for (const table of tenantIsolatedTables) {
    it(`${table} policies reference auth_tenant_id()`, () => {
      // Check that at least one policy on this table uses auth_tenant_id()
      const policySection = allSQL.match(
        new RegExp(
          `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+${table}[\\s\\S]*?(?=CREATE\\s+POLICY|ALTER\\s+TABLE|$)`,
          "gi",
        ),
      );
      const hastenantCheck = policySection?.some((p) =>
        p.includes("auth_tenant_id()"),
      );
      expect(hastenantCheck).toBe(true);
    });
  }
});
