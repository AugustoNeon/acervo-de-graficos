import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const graficos = defineCollection({
  loader: glob({
    pattern: '*/*/README.md',
    base: '../graficos',
    generateId: ({ entry }) => entry.replace(/\/README\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    date: z.coerce.date(),
    source: z.string().url(),
    interactive: z.boolean().default(false),
  }),
});

export const collections = { graficos };
