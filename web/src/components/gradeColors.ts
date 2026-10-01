/** One colour per grade, so a class is recognisable at a glance across the staff portals. */
export const GRADE_COLOR = ['#FF8A1F', '#0AA5B5', '#6C4CF1', '#1E9A55', '#0C98A2', '#5B4CF0', '#0E8C80', '#2F6BF2', '#0B9467', '#E4572E', '#C2417B', '#1C7FB5'];
export const gradeColor = (g?: number | null) => GRADE_COLOR[((g ?? 1) - 1 + GRADE_COLOR.length) % GRADE_COLOR.length];
export const tintHex = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
