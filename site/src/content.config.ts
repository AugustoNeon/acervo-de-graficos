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
    // metadado interno: a fonte de referência NUNCA é renderizada no site
    source: z.string().url(),
    interactive: z.boolean().default(false),
    // ficha técnica — obrigatórios, ver passo 6 de docs/WORKFLOW.md
    resumo: z.string(),
    pacotes: z.array(z.string()).nonempty(),
    dados: z.string(),
    nivel: z.enum(['básico', 'intermediário', 'avançado']),
    tags: z.array(z.string()).nonempty(),
    // veredito rápido — opcionais: só aparecem enquanto nem os 55 READMEs
    // tiverem sido retrofitados (ver docs/pendencias-reformulacao-pagina-grafico.md)
    veredito_uso: z.string().optional(),
    veredito_evita: z.string().optional(),
  }),
});

export const collections = { graficos };
