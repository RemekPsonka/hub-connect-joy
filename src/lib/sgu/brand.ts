/**
 * SGU brand tokens — solid HSL definitions used by `[data-sgu-theme="true"]`
 * scope in `src/index.css`. Keep in sync with that block.
 */
export const SGU_COLORS = {
  navy: '224 64% 18%',       // primary background accent
  navyDeep: '224 70% 12%',
  gold: '44 92% 56%',        // accent (yellow letters)
  goldSoft: '44 92% 70%',
  paper: '40 30% 96%',
} as const;

export type SGUColorToken = keyof typeof SGU_COLORS;
