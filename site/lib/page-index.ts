import generated from '@/content/page-index.json';
import { z } from 'zod';
const state = z.object({available:z.boolean(),translationState:z.string(),sectionAliases:z.record(z.string(),z.string())});
const page = z.object({id:z.string(),route:z.string(),aliases:z.array(z.string()),owner:z.string(),lifecycle:z.string(),source:z.string(),sourceHash:z.string(),sourceRevision:z.string().nullable(),sourceState:z.enum(['committed','working-copy']),factsStatus:z.literal('source-only'),graphSource:z.object({generationId:z.string(),generatedAt:z.string(),scope:z.literal('declared-source-refs'),sources:z.array(z.object({repository:z.string(),ref:z.string(),sourceSHA:z.string()}))}).optional(),locales:z.object({de:state,en:state})});
export type LocaleState = z.infer<typeof state>;
export type PublicPage = z.infer<typeof page>;
export const pageIndex = z.object({version:z.literal(1),pages:z.array(page)}).parse(generated);
