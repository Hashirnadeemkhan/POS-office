import * as z from "zod"

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(50, {
      message: "Name must not exceed 50 characters.",
    }),
  description: z.string().optional(),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

