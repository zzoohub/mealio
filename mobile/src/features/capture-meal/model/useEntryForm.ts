import { useCallback } from "react";
import { useForm } from "@tanstack/react-form";
import { MealType } from "@/entities/meal";
import type { Entry } from "@/entities/entry";

// =============================================================================
// TYPES
// =============================================================================

export interface EntryFormValues {
  title: string;
  notes: string;
  mealType: MealType;
  eatenAt: Date;
  photoUri: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationAddress: string;
}

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
          mealType: value.mealType,
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
      onSubmit: ({ value }) => {
        if (!value.mealType) {
          return "Meal type is required";
        }
        if (!value.title && !value.notes) {
          return "Title or notes is required";
        }
        return undefined;
      },
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
