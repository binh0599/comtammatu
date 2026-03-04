const STORAGE_KEY = "ctm_device_fp";

/**
 * Get or create a stable device fingerprint stored in localStorage.
 * Uses a random UUID so it's unique per browser profile per device.
 */
export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";

  let fp = localStorage.getItem(STORAGE_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, fp);
  }
  return fp;
}

/**
 * Build a human-readable device name from the browser's user agent.
 */
export function getDeviceName(): string {
  if (typeof window === "undefined") return "Unknown";

  const ua = navigator.userAgent;

  // Try to extract OS
  let os = "Unknown OS";
  if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("CrOS")) os = "ChromeOS";

  // Try to extract browser
  let browser = "Unknown Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  return `${browser} - ${os}`;
}
