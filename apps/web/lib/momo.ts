import crypto from "crypto";

// ===== Configuration =====

export const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE ?? "",
  accessKey: process.env.MOMO_ACCESS_KEY ?? "",
  secretKey: process.env.MOMO_SECRET_KEY ?? "",
};

const MOMO_ENDPOINT =
  process.env.NODE_ENV === "production"
    ? "https://payment.momo.vn"
    : "https://test-payment.momo.vn";

// ===== Types =====

export interface MomoIPNPayload {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

interface MomoCreateResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl: string;
  qrCodeUrl: string;
  deeplink: string;
  deeplinkMiniApp: string;
}

// ===== Signature Helpers =====

export function createMomoSignature(
  rawData: string,
  secretKey: string,
): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(rawData)
    .digest("hex");
}

export function buildRawSignature(
  params: Record<string, string | number>,
): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

export function verifyMomoSignature(
  params: Record<string, string | number>,
  receivedSignature: string,
  secretKey: string,
): boolean {
  const rawSignature = buildRawSignature(params);
  const expectedSignature = createMomoSignature(rawSignature, secretKey);

  const expected = Buffer.from(expectedSignature, "hex");
  const received = Buffer.from(receivedSignature, "hex");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

// ===== Payment Request =====

export async function createMomoPaymentRequest({
  orderId,
  orderInfo,
  amount,
  requestId,
  ipnUrl,
  redirectUrl,
}: {
  orderId: string;
  orderInfo: string;
  amount: number;
  requestId: string;
  ipnUrl: string;
  redirectUrl: string;
}): Promise<{
  qrCodeUrl: string;
  deeplink: string;
  payUrl: string;
  requestId: string;
}> {
  const { partnerCode, accessKey, secretKey } = MOMO_CONFIG;

  if (!partnerCode || !accessKey || !secretKey) {
    throw new Error("Momo payment credentials are not configured");
  }

  const requestType = "captureWallet";
  const extraData = JSON.stringify({ orderId });

  const rawSignature = buildRawSignature({
    accessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode,
    redirectUrl,
    requestId,
    requestType,
  });

  const signature = createMomoSignature(rawSignature, secretKey);

  const body = {
    partnerCode,
    partnerName: "Com Tam Ma Tu",
    storeId: partnerCode,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang: "vi",
    requestType,
    autoCapture: true,
    extraData,
    signature,
  };

  const response = await fetch(`${MOMO_ENDPOINT}/v2/gateway/api/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Momo API error: ${response.status} ${response.statusText}`);
  }

  const data: MomoCreateResponse = await response.json();

  if (data.resultCode !== 0) {
    throw new Error(`Momo error ${data.resultCode}: ${data.message}`);
  }

  return {
    qrCodeUrl: data.qrCodeUrl,
    deeplink: data.deeplink,
    payUrl: data.payUrl,
    requestId: data.requestId,
  };
}
