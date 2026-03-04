/**
 * ESC/POS Command Builder for thermal receipt printers.
 *
 * Generates raw ESC/POS byte sequences compatible with most thermal
 * printers (Epson TM-series, Star TSP, etc.).
 *
 * Reference: ESC/POS Application Programming Guide
 * https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/
 */

// WebUSB type declarations (subset used by this module)
declare global {
  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
  }
  interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
  }
  interface USBEndpoint {
    endpointNumber: number;
    direction: "in" | "out";
  }
  interface USBAlternateInterface {
    endpoints: USBEndpoint[];
  }
  interface USBInterface {
    interfaceNumber: number;
    alternate: USBAlternateInterface;
  }
  interface USBConfiguration {
    interfaces: USBInterface[];
  }
  interface USBDevice {
    configuration: USBConfiguration | null;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    transferOut(
      endpointNumber: number,
      data: BufferSource,
    ): Promise<unknown>;
  }
  interface USB {
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
  }
  interface Navigator {
    usb?: USB;
  }
}

// ===== ESC/POS Constants =====

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// ===== Helpers =====

function concat(...buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  return result;
}

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

/** Encode Vietnamese text to UTF-8 bytes */
function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

// ===== Command Builder =====

export class EscposBuilder {
  private parts: Uint8Array[] = [];

  /** Initialize printer — ESC @ */
  init(): this {
    this.parts.push(bytes(ESC, 0x40));
    return this;
  }

  /** Line feed */
  lf(count = 1): this {
    for (let i = 0; i < count; i++) {
      this.parts.push(bytes(LF));
    }
    return this;
  }

  /** Set text alignment — ESC a n (0=left, 1=center, 2=right) */
  align(mode: "left" | "center" | "right"): this {
    const n = mode === "left" ? 0 : mode === "center" ? 1 : 2;
    this.parts.push(bytes(ESC, 0x61, n));
    return this;
  }

  /** Toggle bold — ESC E n */
  bold(on: boolean): this {
    this.parts.push(bytes(ESC, 0x45, on ? 1 : 0));
    return this;
  }

  /** Set double width/height — ESC ! n */
  size(
    doubleWidth: boolean = false,
    doubleHeight: boolean = false,
  ): this {
    let n = 0;
    if (doubleWidth) n |= 0x20;
    if (doubleHeight) n |= 0x10;
    this.parts.push(bytes(ESC, 0x21, n));
    return this;
  }

  /** Set line spacing — ESC 3 n */
  lineSpacing(dots: number): this {
    this.parts.push(bytes(ESC, 0x33, dots));
    return this;
  }

  /** Reset line spacing to default — ESC 2 */
  defaultLineSpacing(): this {
    this.parts.push(bytes(ESC, 0x32));
    return this;
  }

  /** Toggle underline — ESC - n */
  underline(on: boolean): this {
    this.parts.push(bytes(ESC, 0x2d, on ? 1 : 0));
    return this;
  }

  /** Write text (UTF-8 encoded) */
  text(str: string): this {
    this.parts.push(encodeText(str));
    return this;
  }

  /** Write text + line feed */
  textLn(str: string): this {
    this.text(str);
    this.lf();
    return this;
  }

  /**
   * Write a two-column line: left-aligned text + right-aligned text.
   * Fills the middle with spaces to fit `lineWidth` characters.
   */
  columns(left: string, right: string, lineWidth = 42): this {
    const spaces = Math.max(1, lineWidth - left.length - right.length);
    this.textLn(left + " ".repeat(spaces) + right);
    return this;
  }

  /** Print a dashed separator line */
  separator(char = "-", lineWidth = 42): this {
    this.textLn(char.repeat(lineWidth));
    return this;
  }

  /** Feed and cut — GS V 1 (partial cut) */
  cut(): this {
    this.lf(3);
    this.parts.push(bytes(GS, 0x56, 1));
    return this;
  }

  /** Full cut — GS V 0 */
  fullCut(): this {
    this.lf(3);
    this.parts.push(bytes(GS, 0x56, 0));
    return this;
  }

  /** Open cash drawer — ESC p m t1 t2 */
  openCashDrawer(): this {
    this.parts.push(bytes(ESC, 0x70, 0, 25, 250));
    return this;
  }

  /** Build the final byte buffer */
  build(): Uint8Array {
    return concat(...this.parts);
  }
}

// ===== Printer Types =====

export interface PrinterConnectionConfig {
  type: "thermal_usb" | "thermal_network";
  /** USB: { vendor_id, product_id } */
  /** Network: { host, port, protocol } */
  usb?: {
    vendor_id: number;
    product_id: number;
    device_serial?: string;
  };
  network?: {
    host: string;
    port: number;
    protocol: "http" | "https" | "raw";
  };
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

// ===== Print Sending =====

/**
 * Send ESC/POS commands to a USB printer via WebUSB API.
 * Requires user gesture for first connection.
 */
export async function printViaUsb(
  commands: Uint8Array,
  config: { vendor_id: number; product_id: number },
): Promise<PrintResult> {
  try {
    if (!navigator.usb) {
      return { success: false, error: "WebUSB không được hỗ trợ trên trình duyệt này" };
    }

    // Request or get previously paired device
    const device = await navigator.usb.requestDevice({
      filters: [
        {
          vendorId: config.vendor_id,
          productId: config.product_id,
        },
      ],
    });

    await device.open();

    // Find the first OUT endpoint
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    const iface = device.configuration?.interfaces[0];
    if (!iface) {
      return { success: false, error: "Không tìm thấy interface máy in" };
    }

    await device.claimInterface(iface.interfaceNumber);

    const endpoint = iface.alternate.endpoints.find(
      (e) => e.direction === "out",
    );
    if (!endpoint) {
      return { success: false, error: "Không tìm thấy endpoint máy in" };
    }

    await device.transferOut(endpoint.endpointNumber, commands.buffer as ArrayBuffer);
    await device.close();

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi kết nối USB";
    return { success: false, error: message };
  }
}

/**
 * Send ESC/POS commands to a network printer via HTTP print server.
 * The print server receives raw bytes and forwards to printer socket.
 */
export async function printViaNetwork(
  commands: Uint8Array,
  config: { host: string; port: number; protocol: string },
): Promise<PrintResult> {
  try {
    const url = `${config.protocol}://${config.host}:${config.port}/print`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Blob([commands.buffer as ArrayBuffer]),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Máy in trả về lỗi: ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi kết nối mạng";
    return { success: false, error: message };
  }
}
