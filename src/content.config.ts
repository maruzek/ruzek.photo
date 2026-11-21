import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { contentDate } from '@/lib/content-date';
import { photoPath, photoSchema } from '@/lib/photos/schema';

const bilingual = z.object({ cs: z.string().min(1), en: z.string().min(1) });

const photos = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/photos' }),
  // `image` stays a path string: an `image()` field would import (and emit into `dist`) every file at load
  // time, also of a withdrawn photo. `getPhoto()` imports the file of a published photo only (issue E-14).
  schema: photoSchema(photoPath),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/case-studies' }),
  schema: z.object({
    draft: z.boolean(),
    title: bilingual,
    summary: bilingual,
    date: contentDate,
    photos: z.array(reference('photos')),
    matchReport: z.object({ score: z.string(), venue: z.string() }).optional(),
  }),
});

export const collections = { photos, caseStudies };
