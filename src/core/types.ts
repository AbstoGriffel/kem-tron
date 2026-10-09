export type StatKey = 't' | 'm' | 'n' | 'k';
export const STAT_KEYS: StatKey[] = ['t', 'm', 'n', 'k'];
export type Stats = Record<StatKey, number> & { d: number };
export type Proc = 'raw' | 'nghien' | 'xay';

export interface Ingredient {
  id: string;
  name: string;
  price: number;
  source: 'vuon' | 'cho' | 'mang' | 'si';
  stats: Stats;
  process: Exclude<Proc, 'raw'>[];
  override?: Partial<Record<Exclude<Proc, 'raw'>, Partial<Stats>>>;
  heatExtraDoc?: number;
  fake?: boolean;
  suspicion?: number;
  sideEffect?: number;
  color: string;
  unlockDay: number;
  tip: string;
}

export interface Base {
  id: string;
  name: string;
  price: number;
  stats: Stats;
  capacity: number;
  color: string;
  fake?: boolean;
  suspicion?: number;
  sideEffect?: number;
  unlockDay: number;
  tip: string;
}

export interface Combo {
  ids: string[];
  d?: number;
  m?: number;
  fx: string;
  name: string;
}

export interface Rules {
  statMax: number;
  docMax: number;
  overuseCount: number;
  overuseDoc: number;
  fakeClashDoc: number;
  heatDocDivisor: number;
}

export interface BowlItem {
  id: string;
  proc: Proc;
}

export interface MixResult {
  stats: Stats;
  /** chỉ số trước khi kẹp 0–10 (vd Khô âm = váng dầu trên thau) */
  raw: Stats;
  /** Độc trước khi kẹp hiển thị (có thể > docMax). */
  rawDoc: number;
  combos: Combo[];
  overused: string[];
  fakeClash: boolean;
  fakeCount: number;
  sideEffect: number;
  suspicion: number;
  cost: number;
  color: string;
  full: boolean;
  ruined: boolean;
}

export type Range = [number, number];
export interface Target {
  t?: Range;
  m?: Range;
  n?: Range;
  k?: Range;
  maxDoc?: number;
}
