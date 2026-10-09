import './styles/base.css';
import { fitStage } from './ui/stage';
import { bootLab } from './ui/lab';
import { Game } from './ui/game';

// /#review: bảng thử để duyệt trên Figma (không dựng stage)
if (location.hash === '#review') import('./ui/review').then((m) => m.bootReview());
else if (location.hash === '#bowl-lab') import('./ui/review').then((m) => m.bootBowlLab());
else {
  fitStage();
  if (location.hash.startsWith('#lab') || location.hash === '#icons' || location.hash === '#beans') bootLab();
  else new Game().boot();
}
