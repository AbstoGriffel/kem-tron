import text from '../data/text.json';

/** Câu chữ hướng dẫn / thoại mới đã duyệt (tab "Lời thoại chờ duyệt", C01–C37). */
export const TEXT_UI = text.guide;

/**
 * Chống mồ côi chữ (R5) cho máy không có `text-wrap: pretty`: từ cuối ngắn (≤ max chữ cái, không tính dấu câu)
 * thì nối với từ đứng trước bằng NBSP để hai từ xuống dòng cùng nhau. Nhận cả chuỗi HTML (bỏ qua khoảng trắng trong thẻ).
 */
export function noOrphan(s: string, max = 6): string {
  s = s.trimEnd();
  // khoảng trắng cuối cùng nằm ngoài thẻ
  let at = -1, inTag = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '<') inTag = true;
    else if (ch === '>') inTag = false;
    else if (!inTag && ch === ' ') at = i;
  }
  if (at <= 0) return s;
  const last = s.slice(at + 1).replace(/<[^>]*>/g, '').normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');
  const before = s.slice(0, at).replace(/<[^>]*>/g, '').trim();
  if (!before || [...last].length > max) return s;
  return s.slice(0, at) + '\u00A0' + s.slice(at + 1);
}
