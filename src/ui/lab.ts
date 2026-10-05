import { blender, bowlBack, bowlFront, calendar, clock, livePhone, moneyTin, mortar, noticeSheet, stove } from '../art/props';
import { sceneSvg } from '../art/scene';

/** Trang xem art (dev). */
import { iconSheet } from './lab-icons';
import { beanSheet } from './lab-beans';

export function bootLab() {
  if (location.hash === '#beans') return beanSheet();
  if (location.hash === '#lab') {}
  if (location.hash === '#icons') {
    const mods = import.meta.glob('../art/icons/*.ts', { eager: true }) as Record<string, Record<string, Record<string, string>>>;
    const all: Record<string, string> = {};
    for (const m of Object.values(mods)) for (const v of Object.values(m)) if (v && typeof v === 'object') Object.assign(all, v);
    return iconSheet(all);
  }
  const stage = document.getElementById('stage')!;
  stage.innerHTML = sceneSvg();
  const q = (id: string) => stage.querySelector('#' + id)!;
  q('wall-left').innerHTML = livePhone();
  q('wall-right').innerHTML = calendar() + clock() + noticeSheet(0) + noticeSheet(1) + moneyTin();
  q('station-stove').innerHTML = stove();
  q('station-bowl').innerHTML = bowlBack() + `<ellipse cx="205" cy="353" rx="98" ry="33" fill="#FFF6EE"/>` + bowlFront();
  q('station-blender').innerHTML = blender();
  q('station-mortar').innerHTML = mortar();
}
