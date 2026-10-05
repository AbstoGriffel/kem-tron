import raw from '../data/ingredients.json';
import type { Base, Combo, Ingredient, Rules } from './types';

export const INGREDIENTS = raw.ingredients as Ingredient[];
export const BASES = raw.bases as Base[];
export const COMBOS = raw.combos as Combo[];
export const RULES = raw.rules as Rules;

const ingMap = new Map(INGREDIENTS.map((i) => [i.id, i]));
const baseMap = new Map(BASES.map((b) => [b.id, b]));

export function ing(id: string): Ingredient {
  const x = ingMap.get(id);
  if (!x) throw new Error(`Không có nguyên liệu ${id}`);
  return x;
}
export function base(id: string): Base {
  const x = baseMap.get(id);
  if (!x) throw new Error(`Không có cốt ${id}`);
  return x;
}
export const isBase = (id: string) => baseMap.has(id);
export const isIng = (id: string) => ingMap.has(id);
