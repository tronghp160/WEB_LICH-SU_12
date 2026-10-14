"use client";

import { useSyncExternalStore } from "react";

// Mã kích hoạt gói luyện thi + mã thiết bị, lưu trong localStorage (docs/ke-hoach-thanh-toan.md, mục 5.2 ý 6).
// Không cần tài khoản: quyền làm đề = mã kích hoạt + mã thiết bị ngẫu nhiên của máy này (server chỉ lưu bản băm).
// localStorage có thể bị chặn (máy trường) → vẫn kích hoạt được trong phiên (giữ trong bộ nhớ), báo người dùng giữ mã.

export const LICENSE_KEY = "ls12:ban-quyen";
export const DEVICE_KEY = "ls12:thiet-bi";
const CHANGE_EVENT = "ls12:ban-quyen-doi";

export type StoredLicense = {
  code: string;
  productSlug: string | null;
  validUntil: string | null;
  activatedAt: string;
  devicesUsed: number;
  maxDevices: number;
};

let memoryLicense: StoredLicense | null = null;
let memoryDevice: string | null = null;
let cached: { raw: string | null; value: StoredLicense | null } | null = null;

function parse(raw: string | null): StoredLicense | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredLicense>;
    if (typeof value.code !== "string" || typeof value.activatedAt !== "string") return null;
    return {
      code: value.code,
      productSlug: typeof value.productSlug === "string" ? value.productSlug : null,
      validUntil: typeof value.validUntil === "string" ? value.validUntil : null,
      activatedAt: value.activatedAt,
      devicesUsed: typeof value.devicesUsed === "number" ? value.devicesUsed : 1,
      maxDevices: typeof value.maxDevices === "number" ? value.maxDevices : 3,
    };
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(LICENSE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): StoredLicense | null {
  const raw = readRaw();
  if (raw === null && memoryLicense) return memoryLicense;
  if (!cached || cached.raw !== raw) cached = { raw, value: parse(raw) };
  return cached.value;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Mã đã kích hoạt trên máy này; `null` khi chưa có (và khi render ở server / lần hydrate đầu). */
export function useLicense(): StoredLicense | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/** Đã đọc xong trình duyệt chưa (để không nháy "chưa kích hoạt" trước khi biết thật). */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

/** Lưu mã sau khi server xác nhận kích hoạt. Trả false nếu trình duyệt không cho lưu (chỉ nhớ trong phiên này). */
export function saveLicense(license: StoredLicense): boolean {
  memoryLicense = license;
  let persisted = true;
  try {
    window.localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
  } catch {
    persisted = false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return persisted;
}

export function clearLicense() {
  memoryLicense = null;
  try {
    window.localStorage.removeItem(LICENSE_KEY);
  } catch {
    // bỏ qua
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Mã thiết bị ngẫu nhiên (UUID) của trình duyệt này — tạo một lần, giữ mãi. */
export function getDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    memoryDevice ??= crypto.randomUUID();
    return memoryDevice;
  }
}
