import { z } from 'zod';

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export function createApiSuccessSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    data: dataSchema,
  });
}

export const ApiErrorResponseSchema = z.object({
  error: ApiErrorSchema,
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
