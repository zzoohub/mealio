import { useCallback } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { MealType } from "@/entities/meal";
import type { Entry } from "@/entities/entry";

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const mealTypeValues = Object.values(MealType) as [string, ...string[]];

const entryFormSchema = z
  .object({
    title: z.string(),
    notes: z.string(),
    mealType: z.enum(mealTypeValues),
    eatenAt: z.date(),
    photoUri: z.string(),
    locationLatitude: z.number().nullable(),
    locationLongitude: z.number().nullable(),
    locationAddress: z.string(),
  })
  .refine((data) => data.title || data.notes, {
    message: "Title or notes is required",
    path: ["title"],
  });

// =============================================================================
// TYPES
// =============================================================================

export type EntryFormValues = z.infer<typeof entryFormSchema>;

interface UseEntryFormOptions {
  onSubmit: (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  defaultValues?: Partial<EntryFormValues>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useEntryForm({ onSubmit, defaultValues }: UseEntryFormOptions) {
  const form = useForm({
    defaultValues: {
      title: defaultValues?.title ?? "",
      notes: defaultValues?.notes ?? "",
      mealType: defaultValues?.mealType ?? MealType.LUNCH,
      eatenAt: defaultValues?.eatenAt ?? new Date(),
      photoUri: defaultValues?.photoUri ?? "",
      locationLatitude: defaultValues?.locationLatitude ?? null,
      locationLongitude: defaultValues?.locationLongitude ?? null,
      locationAddress: defaultValues?.locationAddress ?? "",
    } satisfies EntryFormValues,
    onSubmit: async ({ value }) => {
      const entry: Omit<Entry, "id" | "createdAt" | "updatedAt"> = {
        userId: "",
        timestamp: value.eatenAt,
        notes: value.notes || value.title,
        meal: {
          photoUri: value.photoUri,
          mealType: value.mealType as MealType,
        },
      };

      if (value.locationLatitude != null && value.locationLongitude != null) {
        const loc: Entry["location"] & object = {
          latitude: value.locationLatitude,
          longitude: value.locationLongitude,
        };
        if (value.locationAddress) {
          loc.address = value.locationAddress;
        }
        entry.location = loc;
      }

      await onSubmit(entry);
    },
    validators: {
      onSubmit: entryFormSchema,
    },
  });

  const handleSubmit = useCallback(() => {
    form.handleSubmit();
  }, [form]);

  return {
    form,
    handleSubmit,
  };
}
