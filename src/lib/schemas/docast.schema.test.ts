import { describe, it, expect } from 'vitest';
import { DocBlockSchema, DocASTSchema } from './docast.schema';
import { v4 as uuid } from 'uuid';

describe('DocBlockSchema', () => {
  it('validates a valid block', () => {
    const block = {
      blockId: uuid(),
      type: 'paragraph',
      content: 'This is a clause about confidentiality.',
      index: 0,
    };
    expect(DocBlockSchema.parse(block)).toEqual(block);
  });

  it('validates a heading block with level', () => {
    const block = {
      blockId: uuid(),
      type: 'heading',
      content: 'Section 1 - Definitions',
      level: 2,
      index: 0,
    };
    expect(DocBlockSchema.parse(block)).toEqual(block);
  });

  it('rejects invalid block type', () => {
    const block = {
      blockId: uuid(),
      type: 'image',
      content: 'test',
      index: 0,
    };
    expect(() => DocBlockSchema.parse(block)).toThrow();
  });

  it('rejects invalid blockId (not uuid)', () => {
    const block = {
      blockId: 'not-a-uuid',
      type: 'paragraph',
      content: 'test',
      index: 0,
    };
    expect(() => DocBlockSchema.parse(block)).toThrow();
  });

  it('rejects negative index', () => {
    const block = {
      blockId: uuid(),
      type: 'paragraph',
      content: 'test',
      index: -1,
    };
    expect(() => DocBlockSchema.parse(block)).toThrow();
  });
});

describe('DocASTSchema', () => {
  it('validates a valid DocAST', () => {
    const blockId = uuid();
    const ast = {
      tenantId: 'default',
      jobId: uuid(),
      blocks: [
        { blockId, type: 'paragraph', content: 'Clause text', index: 0 },
      ],
      metadata: {
        totalBlocks: 1,
        parsedAt: new Date().toISOString(),
      },
    };
    expect(DocASTSchema.parse(ast)).toEqual(ast);
  });

  it('validates DocAST with empty blocks', () => {
    const ast = {
      tenantId: 'default',
      jobId: uuid(),
      blocks: [],
      metadata: {
        totalBlocks: 0,
        parsedAt: new Date().toISOString(),
      },
    };
    expect(DocASTSchema.parse(ast)).toEqual(ast);
  });

  it('rejects missing tenantId', () => {
    const ast = {
      jobId: uuid(),
      blocks: [],
      metadata: { totalBlocks: 0, parsedAt: new Date().toISOString() },
    };
    expect(() => DocASTSchema.parse(ast)).toThrow();
  });
});
