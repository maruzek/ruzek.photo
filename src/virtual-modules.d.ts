declare module 'virtual:published-photos' {
  /** Images of the published photos by photo id (scripts/vite-published-photos.ts). */
  const images: Readonly<Record<string, ImageMetadata>>;
  export default images;
}
