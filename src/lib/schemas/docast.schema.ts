import { z } from 'zod';

export const DocBlockSchema = z.object({
  blockId: z.string().uuid(),
  type: z.enum(['heading', 'paragraph', 'list-item', 'table-cell']),
  content: z.string(),
  level: z.number().int().min(1).max(6).optional(),
  index: z.number().int().min(0),
});

export const DocASTSchema = z.object({
  tenantId: z.string(),
  jobId: z.string().uuid(),
  blocks: z.array(DocBlockSchema),
  metadata: z.object({
    totalBlocks: z.number().int(),
    parsedAt: z.string().datetime(),
  }),
});

export type DocBlock = z.infer<typeof DocBlockSchema>;
export type DocAST = z.infer<typeof DocASTSchema>;
