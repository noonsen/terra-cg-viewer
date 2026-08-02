import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      releaseDate: z.date(),
      characters: z.array(z.string()),
      // Official event banner used as the archive/episode-grid cover, distinct
      // from the in-gallery CGs below (which are the actual episode illustrations).
      cover: z
        .object({
          image: z.union([image(), z.string()]),
          source: z.string(),
          credit: z.string(),
        })
        .optional(),
      theme: z.object({
        accent: z.string(),
        accentAlt: z.string(),
        bg: z.string(),
        surface: z.string(),
        labelFont: z.enum(['mono', 'voice']),
        motif: z.enum(['hud', 'inkwash']),
      }),
      cgs: z.array(
        z.object({
          // A real local asset (validated + optimized by astro:assets) once
          // it's been fetched, or a placeholder label string until then.
          image: z.union([image(), z.string()]),
          caption: z.string().optional(),
          source: z.string(),
          credit: z.string(),
          episode: z.string().optional(),
          episodeTitle: z.string().optional(),
          hero: z.boolean().optional(),
        })
      ),
    }),
});

export const collections = { events };
