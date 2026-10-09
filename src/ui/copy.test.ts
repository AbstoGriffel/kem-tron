import { describe, expect, it } from 'vitest';
import { noOrphan } from './copy';
import { renderSay } from './speech';

describe('noOrphan', () => {
  it('nối 2 từ cuối khi từ cuối ngắn', () => {
    expect(noOrphan('Mẹ em dặn rồi, chị đợi được, mà đúng hẹn nha cưng.')).toBe('Mẹ em dặn rồi, chị đợi được, mà đúng hẹn nha\u00A0cưng.');
  });
  it('để yên khi từ cuối dài hơn 6 ký tự hoặc câu chỉ 1 từ', () => {
    expect(noOrphan('Mua thêm hộp kem trơn với chocolate')).toBe('Mua thêm hộp kem trơn với chocolate');
    expect(noOrphan('Ừm.')).toBe('Ừm.');
  });
  it('không tính dấu câu vào độ dài từ cuối', () => {
    expect(noOrphan('Giao nhanh, gói kỹ, nhãn dễ thương.')).toBe('Giao nhanh, gói kỹ, nhãn dễ\u00A0thương.');
    expect(noOrphan('Chị không hối, chị chỉ… nhắc…')).toBe('Chị không hối, chị chỉ…\u00A0nhắc…');
  });
  it('bỏ qua khoảng trắng trong thẻ, đếm chữ thấy được', () => {
    const h = renderSay('Cho chị kem {trắng|t} nha');
    expect(noOrphan(h)).toBe(h.replace(/ nha$/, '\u00A0nha'));
    const m = renderSay('Đừng có {khô|k-}');
    expect(noOrphan(m)).toContain('có\u00A0<mark');
    expect(noOrphan(m).match(/<mark[^>]*>/)![0]).toBe(m.match(/<mark[^>]*>/)![0]);
  });
});
