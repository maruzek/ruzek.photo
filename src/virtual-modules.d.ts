declare module 'virtual:published-photos' {
  /** Images of the published photos by photo id (scripts/vite-published-photos.ts). */
  const images: Readonly<Record<string, ImageMetadata>>;
  export default images;
  /** Portrait phone crops of the published full-screen photos by photo id (src/lib/photos/mobile-crop.ts). */
  export const mobile: Readonly<Partial<Record<string, ImageMetadata>>>;
}
