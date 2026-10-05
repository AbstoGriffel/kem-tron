/** Bảng xem icon (dev): /#icons */
export function iconSheet(icons: Record<string, string>, cols = 4) {
  const stage = document.getElementById('stage')!;
  stage.style.background = '#CFD6DB';
  const cells = Object.entries(icons).map(([id, body]) => `
    <div style="display:flex;flex-direction:column;align-items:center;background:#7A4A2A;border:3px solid #2A1A16;border-radius:10px;padding:4px">
      <svg viewBox="0 0 80 80" width="78" height="78" style="background:#8E5A36;border-radius:6px">${body}</svg>
      <div style="font:600 10px 'Baloo 2';color:#FFF8E6;margin-top:2px">${id}</div>
    </div>`).join('');
  stage.innerHTML = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;padding:6px">${cells}</div>`;
}
