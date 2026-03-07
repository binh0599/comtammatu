"use client";

/**
 * Web Serial API hook for ESC/POS thermal printer connection.
 *
 * Web Serial API is only available in Chromium-based browsers (Chrome, Edge).
 * It provides direct access to serial ports (USB-to-serial adapters, built-in RS-232).
 *
 * Usage:
 *   const { status, connect, disconnect, print, isSupported } = useSerialPrinter();
 */

import { useState, useCallback, useRef } from "react";

export type SerialPrinterStatus = "disconnected" | "connecting" | "connected" | "error";

// Web Serial API type declarations (subset used by this module)
// These are not yet in the standard TypeScript lib definitions
declare global {
  interface SerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
  }

  interface SerialPortRequestOptions {
    filters?: { usbVendorId?: number; usbProductId?: number }[];
  }

  interface SerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: "none" | "even" | "odd";
    bufferSize?: number;
    flowControl?: "none" | "hardware";
  }

  interface SerialPort {
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    getInfo(): SerialPortInfo;
  }

  interface Serial extends EventTarget {
    getPorts(): Promise<SerialPort[]>;
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  }

  interface Navigator {
    serial?: Serial;
  }
}

const DEFAULT_BAUD_RATE = 9600;

export function useSerialPrinter() {
  const [status, setStatus] = useState<SerialPrinterStatus>("disconnected");
  const portRef = useRef<SerialPort | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);

  /** Check if Web Serial API is available in this browser */
  const isSupported =
    typeof navigator !== "undefined" && "serial" in navigator;

  /**
   * Connect to a serial printer.
   * Prompts user to select a serial port (requires user gesture).
   * Opens the port at the specified baud rate (default 9600).
   */
  const connect = useCallback(async (baudRate = DEFAULT_BAUD_RATE) => {
    if (!isSupported) {
      setStatus("error");
      throw new Error(
        "Web Serial API không được hỗ trợ trên trình duyệt này. Vui lòng sử dụng Chrome hoặc Edge.",
      );
    }

    try {
      setStatus("connecting");

      // Request port from user (shows browser port picker)
      const port = await navigator.serial!.requestPort();

      // Open the port
      await port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
      });

      portRef.current = port;

      // Get a writer for the writable stream
      if (port.writable) {
        writerRef.current = port.writable.getWriter();
      }

      setStatus("connected");
    } catch (err) {
      // User cancelled the port picker or open failed
      const isDOMException =
        err instanceof DOMException ||
        (err instanceof Error && err.name === "NotFoundError");

      if (isDOMException) {
        // User cancelled — go back to disconnected (not error)
        setStatus("disconnected");
      } else {
        setStatus("error");
        console.error("Serial connect error:", err);
      }
    }
  }, [isSupported]);

  /**
   * Disconnect from the serial printer.
   * Releases the writer and closes the port.
   */
  const disconnect = useCallback(async () => {
    try {
      if (writerRef.current) {
        await writerRef.current.releaseLock();
        writerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (err) {
      console.warn("Serial disconnect error:", err);
    } finally {
      setStatus("disconnected");
    }
  }, []);

  /**
   * Send raw ESC/POS byte data to the connected serial printer.
   * Chunks the data to avoid overwhelming the serial buffer.
   */
  const print = useCallback(
    async (data: Uint8Array) => {
      if (status !== "connected") {
        throw new Error("Máy in chưa kết nối. Vui lòng kết nối trước khi in.");
      }

      const writer = writerRef.current;
      if (!writer) {
        throw new Error("Không thể ghi dữ liệu vào máy in.");
      }

      try {
        // Send data in chunks to prevent buffer overflow
        const CHUNK_SIZE = 512;
        for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
          const chunk = data.slice(offset, offset + CHUNK_SIZE);
          await writer.write(chunk);
        }
      } catch (err) {
        setStatus("error");
        console.error("Serial print error:", err);
        throw err;
      }
    },
    [status],
  );

  return {
    status,
    connect,
    disconnect,
    print,
    isSupported,
  };
}
