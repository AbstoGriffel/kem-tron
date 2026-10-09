/** Lưu/đọc localStorage an toàn: mọi lỗi (private mode, quota, JSON hỏng) đều trả về fallback. */
const KEY = 'kem-tron.save';

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* bỏ qua */
  }
}

export const SAVE_KEY = KEY;

/** Bật khi vừa ghi bản lấy từ mây và sắp tải lại trang: chặn Game.save() (pagehide) ghi đè bản cũ lên. */
export const saveLock = { on: false };
