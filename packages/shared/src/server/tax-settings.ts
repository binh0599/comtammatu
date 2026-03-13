import { SYSTEM_SETTINGS_KEYS, SYSTEM_SETTINGS_DEFAULTS } from "../constants";
import type { SupabaseClient } from "./action-context";

/**
 * Fetch tax_rate and service_charge from system_settings for a tenant.
 * Returns percentage values (e.g., 10 for 10%, 5 for 5%).
 *
 * @param supabase - Supabase client instance
 * @param tenantId - Tenant ID to scope the query
 * @returns { taxRate, serviceChargeRate } as percentages
 */
export async function getTaxSettings(supabase: SupabaseClient, tenantId: number) {
  const { data: settings } = await supabase
    .from("system_settings")
    .select("key, value")
    .eq("tenant_id", tenantId)
    .in("key", [SYSTEM_SETTINGS_KEYS.TAX_RATE, SYSTEM_SETTINGS_KEYS.SERVICE_CHARGE]);

  let taxRate: number = SYSTEM_SETTINGS_DEFAULTS[SYSTEM_SETTINGS_KEYS.TAX_RATE];
  let serviceChargeRate: number = SYSTEM_SETTINGS_DEFAULTS[SYSTEM_SETTINGS_KEYS.SERVICE_CHARGE];

  if (settings) {
    for (const s of settings as Array<{ key: string; value: string | null }>) {
      if (s.key === SYSTEM_SETTINGS_KEYS.TAX_RATE && s.value !== null) {
        taxRate = Number(s.value);
      }
      if (s.key === SYSTEM_SETTINGS_KEYS.SERVICE_CHARGE && s.value !== null) {
        serviceChargeRate = Number(s.value);
      }
    }
  }

  return { taxRate, serviceChargeRate };
}

/**
 * Same as getTaxSettings but returns rates as decimals (e.g., 0.10 for 10%).
 * Useful for direct multiplication with subtotals.
 */
export async function getTaxRates(supabase: SupabaseClient, tenantId: number) {
  const { taxRate, serviceChargeRate } = await getTaxSettings(supabase, tenantId);
  return {
    taxRate: taxRate / 100,
    serviceChargeRate: serviceChargeRate / 100,
  };
}
