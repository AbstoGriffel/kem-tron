import './styles/base.css';
import { fitStage } from './ui/stage';
import { bootLab } from './ui/lab';
import { Game } from './ui/game';

fitStage();
if (location.hash.startsWith('#lab') || location.hash === '#icons' || location.hash === '#beans') bootLab();
else new Game().boot();
