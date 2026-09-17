import { z } from "zod";

export const goalTypeSchema = z.enum(["WEEKLY", "MONTHLY"]);
export const goalStatusSchema = z.enum(["ACTIVE", "SUCCESS", "FAILED", "STOPPED"]);
const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

export const goalCreateSchema = z.object({
  goalType: goalTypeSchema,
  targetDistance: z.number().int().positive(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});

export const goalParamsSchema = z.object({
  goalIdx: z.coerce.number().int().positive(),
});

export const goalResponseSchema = z.object({
  idx: z.number().int(),
  goalType: goalTypeSchema,
  targetDistance: z.number().int(),
  status: goalStatusSchema,
  startDate: z.string(),
  endDate: z.string(),
  finishedAt: z.string().nullable().optional(),
});

export const currentGoalResponseSchema = z.object({
  goal: goalResponseSchema.nullable(),
  progress: z.object({
    distance: z.number().int(),
    rate: z.number(),
  }),
});

export const stopGoalResponseSchema = z.object({
  idx: z.number().int(),
  status: z.literal("STOPPED"),
  finishedAt: z.string(),
});

export type GoalCreateDTO =
  z.infer<typeof goalCreateSchema>;

export type GoalDTO =
  z.infer<typeof goalResponseSchema>;

export type CurrentGoalResponseDTO =
  z.infer<typeof currentGoalResponseSchema>;

export type StopGoalResponseDTO =
  z.infer<typeof stopGoalResponseSchema>;
