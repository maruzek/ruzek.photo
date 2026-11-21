/**
 * The two surfaces a dither covers an image or a wipe with. Canvas code needs the hex value, so it
 * is repeated here from `--night` and `--light` in styles/tokens.css (a unit test keeps them equal).
 */
export const COVER = { night: '#07080b', light: '#f2f2f3' } as const;
export type Cover = keyof typeof COVER;
