import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { photoSchema } from '@/lib/photos/schema';

const bilingual = z.object({ cs: z.string().min(1), en: z.string().min(1) });

const photos = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/photos' }),
  schema: ({ image }) => photoSchema(image()),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/case-studies' }),
  schema: z.object({
    draft: z.boolean(),
    title: bilingual,
    summary: bilingual,
    date: z.coerce.date(),
    photos: z.array(reference('photos')),
    matchReport: z.object({ score: z.string(), venue: z.string() }).optional(),
  }),
});

export const collections = { photos, caseStudies };
