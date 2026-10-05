declare module 'spectral.js' {
  export class Color {
    constructor(c: string | number[]);
    toString(opts?: { format?: string }): string;
  }
  export function mix(...pairs: [Color, number][]): Color;
  export function palette(a: Color, b: Color, n: number): Color[];
  export function gradient(t: number, ...stops: [Color, number][]): Color;
}
declare module '*/zzfx.js' {
  export const ZZFX: any;
  export function zzfx(...p: number[]): any;
}
