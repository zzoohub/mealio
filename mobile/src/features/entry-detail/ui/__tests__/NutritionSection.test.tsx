// Mock native modules and dependencies
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  TextInput: "TextInput",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => {
      if (!style) return {};
      if (!Array.isArray(style)) return style;
      return style.reduce((acc, s) => ({ ...acc, ...s }), {});
    },
  },
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

jest.mock("@/shared/ui/theme", () => ({
  createStyles: jest.fn((fn) => fn),
  useStyles: jest.fn((stylesFn) => {
    const mockColors = {
      bg: { primary: "#FFFFFF", secondary: "#F5F5F5" },
      border: { default: "#E5E5E5" },
      text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
      interactive: { primary: "#007AFF" },
    };
    return stylesFn(mockColors);
  }),
  useTheme: jest.fn(() => ({
    colors: {
      bg: { primary: "#FFFFFF", secondary: "#F5F5F5" },
      border: { default: "#E5E5E5" },
      text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
      interactive: { primary: "#007AFF" },
    },
  })),
}));

jest.mock("@/shared/lib/i18n", () => ({
  useDiaryI18n: jest.fn(() => ({
    nutritionCalories: "Calories",
    nutritionProtein: "Protein",
    nutritionFat: "Fat",
    nutritionCarbs: "Carbs",
    nutritionFiber: "Fiber",
    nutritionSugar: "Sugar",
    nutritionSodium: "Sodium",
    nutritionInfo: "Nutrition",
    editNutrition: "Edit Nutrition",
    editDone: "Edit Done",
    addNutrition: "Add nutrition info",
  })),
  useCommonI18n: jest.fn(() => ({
    done: "Done",
    edit: "Edit",
  })),
}));

jest.mock("@/shared/ui/tokens", () => ({
  tokens: {
    spacing: {
      component: { xs: 4, sm: 8, md: 12, lg: 16 },
      layout: { sm: 12, md: 16 },
    },
    typography: {
      fontSize: { body: 15, bodySmall: 13, caption: 12 },
      fontWeight: { normal: "400", medium: "500", semibold: "600" },
    },
    radius: { sm: 4, md: 8, full: 9999 },
    size: { icon: { xs: 16, sm: 20 } },
  },
}));

jest.mock("@/entities/meal", () => ({}));

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { NutritionSection } from "../NutritionSection";
import type { NutritionInfo } from "@/entities/meal";
import { useStyles } from "@/shared/ui/theme";
import { useDiaryI18n, useCommonI18n } from "@/shared/lib/i18n";

const mockUseStyles = useStyles as jest.Mock;
const mockUseDiaryI18n = useDiaryI18n as jest.Mock;
const mockUseCommonI18n = useCommonI18n as jest.Mock;

// =============================================================================
// HELPERS
// =============================================================================

function createMockNutrition(overrides: Partial<NutritionInfo> = {}): NutritionInfo {
  return {
    calories: 450,
    protein: 35,
    fat: 12,
    carbs: 45,
    fiber: 8,
    sugar: 10,
    sodium: 500,
    ...overrides,
  };
}

// =============================================================================
// NutritionSection — rendering tests
// =============================================================================

describe("NutritionSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDiaryI18n.mockReturnValue({
      nutritionCalories: "Calories",
      nutritionProtein: "Protein",
      nutritionFat: "Fat",
      nutritionCarbs: "Carbs",
      nutritionFiber: "Fiber",
      nutritionSugar: "Sugar",
      nutritionSodium: "Sodium",
      nutritionInfo: "Nutrition",
      editNutrition: "Edit Nutrition",
      editDone: "Edit Done",
      addNutrition: "Add nutrition info",
    });
    mockUseCommonI18n.mockReturnValue({
      done: "Done",
      edit: "Edit",
    });
    mockUseStyles.mockImplementation((stylesFn) => {
      const mockColors = {
        bg: { primary: "#FFFFFF", secondary: "#F5F5F5" },
        border: { default: "#E5E5E5" },
        text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
        interactive: { primary: "#007AFF" },
      };
      return stylesFn(mockColors);
    });
  });

  // =============================================================================
  // EMPTY STATE
  // =============================================================================

  describe("empty state", () => {
    it("renders empty state when nutrition is undefined", () => {
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={undefined} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const ctaText = texts.find((text: any) => text.props.children === "Add nutrition info");
      expect(ctaText).toBeTruthy();
    });

    it("renders empty state when nutrition is null", () => {
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={null} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const ctaText = texts.find((text: any) => text.props.children === "Add nutrition info");
      expect(ctaText).toBeTruthy();
    });

    it("renders empty state when all nutrition values are zero", () => {
      const nutrition = createMockNutrition({
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const ctaText = texts.find((text: any) => text.props.children === "Add nutrition info");
      expect(ctaText).toBeTruthy();
    });

    it("never returns null when no nutrition data", () => {
      const { toJSON } = render(<NutritionSection nutrition={undefined} />);
      expect(toJSON()).not.toBeNull();
    });

    it("renders restaurant-outline icon in empty state", () => {
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={undefined} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const restaurantIcon = ionicons.find(
        (icon: any) => icon.props.name === "restaurant-outline"
      );
      expect(restaurantIcon).toBeTruthy();
      expect(restaurantIcon.props.size).toBe(20);
    });

    it("renders CTA as pressable in empty state", () => {
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={undefined} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      expect(pressables.length).toBeGreaterThan(0);
    });

    it("CTA is pressable when not disabled", () => {
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={undefined} />);

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const ctaPressable = pressables[0];
      expect(ctaPressable.props.disabled).toBeFalsy();
      expect(ctaPressable.props.onPress).toBeDefined();
    });

    it("CTA is not pressable when disabled", () => {
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={undefined} disabled={true} />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const ctaPressable = pressables[0];
      expect(ctaPressable.props.disabled).toBe(true);
      expect(ctaPressable.props.onPress).toBeUndefined();
    });

    it("pressing CTA enters edit mode", () => {
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={undefined} onNutritionChange={jest.fn()} />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const ctaPressable = pressables[0];
      fireEvent.press(ctaPressable);

      // Should now show edit mode with TextInputs
      const inputs = UNSAFE_getAllByType("TextInput" as any);
      expect(inputs.length).toBe(6); // 6 nutrition items (no fiber)
    });

    it("applies testID to empty state CTA", () => {
      const result = render(
        <NutritionSection nutrition={undefined} testID="nutrition-test" />
      );

      const cta = result.getByTestId("nutrition-test-empty-cta");
      expect(cta).toBeTruthy();
    });

    it("uses i18n translation for CTA text", () => {
      mockUseDiaryI18n.mockReturnValue({
        nutritionCalories: "Calories",
        nutritionProtein: "Protein",
        nutritionFat: "Fat",
        nutritionCarbs: "Carbs",
        nutritionFiber: "Fiber",
        nutritionSugar: "Sugar",
        nutritionSodium: "Sodium",
        nutritionInfo: "Nutrition",
        editNutrition: "Edit Nutrition",
        editDone: "Edit Done",
        addNutrition: "영양 정보 추가",
      });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={undefined} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const ctaText = texts.find((text: any) => text.props.children === "영양 정보 추가");
      expect(ctaText).toBeTruthy();
    });
  });

  // =============================================================================
  // VIEW STATE
  // =============================================================================

  describe("view state", () => {
    it("renders view state when nutrition data is provided", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      expect(inputs.length).toBe(6);
    });

    it("renders section header with restaurant-outline icon", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const restaurantIcon = ionicons.find(
        (icon: any) => icon.props.name === "restaurant-outline"
      );
      expect(restaurantIcon).toBeTruthy();
      expect(restaurantIcon.props.size).toBe(16);
    });

    it("renders section header with Nutrition text", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const titleText = texts.find((text: any) => text.props.children === "Nutrition");
      expect(titleText).toBeTruthy();
    });

    it("renders 6 nutrition items in grid (no fiber)", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      expect(inputs.length).toBe(6);
    });

    it("displays calories value", () => {
      const nutrition = createMockNutrition({ calories: 450 });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const caloriesInput = inputs.find((input: any) => input.props.value === "450");
      expect(caloriesInput).toBeTruthy();
    });

    it("displays protein value", () => {
      const nutrition = createMockNutrition({ protein: 35 });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const proteinInput = inputs.find((input: any) => input.props.value === "35");
      expect(proteinInput).toBeTruthy();
    });

    it("displays fat value", () => {
      const nutrition = createMockNutrition({ fat: 12 });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const fatInput = inputs.find((input: any) => input.props.value === "12");
      expect(fatInput).toBeTruthy();
    });

    it("displays carbs value", () => {
      const nutrition = createMockNutrition({ carbs: 45 });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const carbsInput = inputs.find((input: any) => input.props.value === "45");
      expect(carbsInput).toBeTruthy();
    });

    it("displays sugar value", () => {
      const nutrition = createMockNutrition({ sugar: 10 });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const sugarInput = inputs.find((input: any) => input.props.value === "10");
      expect(sugarInput).toBeTruthy();
    });

    it("displays sodium value", () => {
      const nutrition = createMockNutrition({ sodium: 500 });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const sodiumInput = inputs.find((input: any) => input.props.value === "500");
      expect(sodiumInput).toBeTruthy();
    });

    it("renders nutrition labels", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const caloriesLabel = texts.find((text: any) => text.props.children === "Calories");
      const proteinLabel = texts.find((text: any) => text.props.children === "Protein");
      const fatLabel = texts.find((text: any) => text.props.children === "Fat");
      const carbsLabel = texts.find((text: any) => text.props.children === "Carbs");
      const sugarLabel = texts.find((text: any) => text.props.children === "Sugar");
      const sodiumLabel = texts.find((text: any) => text.props.children === "Sodium");

      expect(caloriesLabel).toBeTruthy();
      expect(proteinLabel).toBeTruthy();
      expect(fatLabel).toBeTruthy();
      expect(carbsLabel).toBeTruthy();
      expect(sugarLabel).toBeTruthy();
      expect(sodiumLabel).toBeTruthy();
    });

    it("TextInputs are not editable in view mode", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      inputs.forEach((input: any) => {
        expect(input.props.editable).toBe(false);
      });
    });

    it("renders view state when only one nutrient has value", () => {
      const nutrition = createMockNutrition({
        calories: 100,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      expect(inputs.length).toBe(6);
    });

    it("renders view state when only fiber has value (non-displayed nutrient)", () => {
      const nutrition = createMockNutrition({
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 5,
        sugar: 0,
        sodium: 0,
      });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      expect(inputs.length).toBe(6);

      // Should NOT show the empty CTA
      const texts = UNSAFE_getAllByType("Text" as any);
      const ctaText = texts.find((text: any) => text.props.children === "Add nutrition info");
      expect(ctaText).toBeUndefined();
    });
  });

  // =============================================================================
  // EDIT BUTTON
  // =============================================================================

  describe("edit button", () => {
    it("shows Edit button when onNutritionChange is provided", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={jest.fn()} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "Edit");
      expect(editText).toBeTruthy();
    });

    it("hides Edit button when onNutritionChange is not provided", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "Edit");
      expect(editText).toBeUndefined();
    });

    it("hides Edit button when disabled is true", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection
          nutrition={nutrition}
          onNutritionChange={jest.fn()}
          disabled={true}
        />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "Edit");
      expect(editText).toBeUndefined();
    });

    it("pressing Edit button enters edit mode", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={jest.fn()} />
      );

      // Find edit button
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton);

      // Should now show Done button
      const texts = UNSAFE_getAllByType("Text" as any);
      const doneText = texts.find((text: any) => text.props.children === "Done");
      expect(doneText).toBeTruthy();
    });

    it("Edit button text uses common i18n", () => {
      mockUseCommonI18n.mockReturnValue({
        done: "Done",
        edit: "편집",
      });
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={jest.fn()} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "편집");
      expect(editText).toBeTruthy();
    });
  });

  // =============================================================================
  // EDIT MODE
  // =============================================================================

  describe("edit mode", () => {
    it("TextInputs become editable in edit mode", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={jest.fn()} />
      );

      // Enter edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton);

      // Check inputs are editable
      const inputs = UNSAFE_getAllByType("TextInput" as any);
      inputs.forEach((input: any) => {
        expect(input.props.editable).toBe(true);
      });
    });

    it("shows Done button in edit mode", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={jest.fn()} />
      );

      // Enter edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton);

      // Check for Done text
      const texts = UNSAFE_getAllByType("Text" as any);
      const doneText = texts.find((text: any) => text.props.children === "Done");
      expect(doneText).toBeTruthy();
    });

    it("Done button text uses common i18n", () => {
      mockUseCommonI18n.mockReturnValue({
        done: "완료",
        edit: "Edit",
      });
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={jest.fn()} />
      );

      // Enter edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton);

      const texts = UNSAFE_getAllByType("Text" as any);
      const doneText = texts.find((text: any) => text.props.children === "완료");
      expect(doneText).toBeTruthy();
    });
  });

  // =============================================================================
  // SAVE FUNCTIONALITY
  // =============================================================================

  describe("save functionality", () => {
    it("pressing Done calls onNutritionChange with current values", () => {
      const nutrition = createMockNutrition();
      const onNutritionChange = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={onNutritionChange} />
      );

      // Enter edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton);

      // Press Done
      const pressablesAfterEdit = UNSAFE_getAllByType("Pressable" as any);
      const doneButton = pressablesAfterEdit.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Done";
      });
      fireEvent.press(doneButton);

      expect(onNutritionChange).toHaveBeenCalledWith(nutrition);
    });

    it("pressing Done exits edit mode", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={jest.fn()} />
      );

      // Enter edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton);

      // Press Done
      const pressablesAfterEdit = UNSAFE_getAllByType("Pressable" as any);
      const doneButton = pressablesAfterEdit.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Done";
      });
      fireEvent.press(doneButton);

      // Should show Edit again
      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "Edit");
      expect(editText).toBeTruthy();
    });
  });

  // =============================================================================
  // NUTRITION INPUT
  // =============================================================================

  describe("nutrition input", () => {
    it("changing a value updates local state", () => {
      const nutrition = createMockNutrition({ calories: 450 });
      const onNutritionChange = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={onNutritionChange} />
      );

      // Enter edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton);

      // Change calories input
      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const caloriesInput = inputs.find((input: any) => input.props.value === "450");
      fireEvent.changeText(caloriesInput, "500");

      // Press Done
      const pressablesAfterEdit = UNSAFE_getAllByType("Pressable" as any);
      const doneButton = pressablesAfterEdit.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Done";
      });
      fireEvent.press(doneButton);

      expect(onNutritionChange).toHaveBeenCalledWith({
        ...nutrition,
        calories: 500,
      });
    });

    it("handles invalid numeric input gracefully", () => {
      const nutrition = createMockNutrition({ protein: 35 });
      const onNutritionChange = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={onNutritionChange} />
      );

      // Enter edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton);

      // Change protein input to invalid value
      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const proteinInput = inputs.find((input: any) => input.props.value === "35");
      fireEvent.changeText(proteinInput, "abc");

      // Press Done
      const pressablesAfterEdit = UNSAFE_getAllByType("Pressable" as any);
      const doneButton = pressablesAfterEdit.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Done";
      });
      fireEvent.press(doneButton);

      expect(onNutritionChange).toHaveBeenCalledWith({
        ...nutrition,
        protein: 0,
      });
    });

    it("handles empty input", () => {
      const nutrition = createMockNutrition({ fat: 12 });
      const onNutritionChange = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={onNutritionChange} />
      );

      // Enter edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton);

      // Clear fat input
      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const fatInput = inputs.find((input: any) => input.props.value === "12");
      fireEvent.changeText(fatInput, "");

      // Press Done
      const pressablesAfterEdit = UNSAFE_getAllByType("Pressable" as any);
      const doneButton = pressablesAfterEdit.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Done";
      });
      fireEvent.press(doneButton);

      expect(onNutritionChange).toHaveBeenCalledWith({
        ...nutrition,
        fat: 0,
      });
    });

    it("all inputs have numeric keyboard type", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      inputs.forEach((input: any) => {
        expect(input.props.keyboardType).toBe("numeric");
      });
    });
  });

  // =============================================================================
  // PROPS SYNC
  // =============================================================================

  describe("props sync", () => {
    it("updating nutrition prop syncs local state", () => {
      const nutrition = createMockNutrition({ calories: 450 });
      const { rerender, UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} />
      );

      // Update prop
      const updatedNutrition = createMockNutrition({ calories: 600 });
      rerender(<NutritionSection nutrition={updatedNutrition} />);

      // Check input reflects new value
      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const caloriesInput = inputs.find((input: any) => input.props.value === "600");
      expect(caloriesInput).toBeTruthy();
    });

    it("syncs all nutrition fields", () => {
      const nutrition = createMockNutrition();
      const { rerender, UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} />
      );

      // Update all fields
      const updatedNutrition: NutritionInfo = {
        calories: 100,
        protein: 20,
        fat: 5,
        carbs: 15,
        fiber: 3,
        sugar: 4,
        sodium: 200,
      };
      rerender(<NutritionSection nutrition={updatedNutrition} />);

      // Check all inputs reflect new values
      const inputs = UNSAFE_getAllByType("TextInput" as any);
      expect(inputs.find((input: any) => input.props.value === "100")).toBeTruthy();
      expect(inputs.find((input: any) => input.props.value === "15")).toBeTruthy();
      expect(inputs.find((input: any) => input.props.value === "20")).toBeTruthy();
      expect(inputs.find((input: any) => input.props.value === "5")).toBeTruthy();
      expect(inputs.find((input: any) => input.props.value === "4")).toBeTruthy();
      expect(inputs.find((input: any) => input.props.value === "200")).toBeTruthy();
    });
  });

  // =============================================================================
  // TEST ID
  // =============================================================================

  describe("testID prop", () => {
    it("applies testID to container", () => {
      const nutrition = createMockNutrition();
      const result = render(
        <NutritionSection nutrition={nutrition} testID="nutrition-section" />
      );

      const container = result.getByTestId("nutrition-section");
      expect(container).toBeTruthy();
    });

    it("applies testID to empty state container", () => {
      const result = render(
        <NutritionSection nutrition={undefined} testID="nutrition-empty" />
      );

      const container = result.getByTestId("nutrition-empty");
      expect(container).toBeTruthy();
    });

    it("applies testID-input-{key} to inputs", () => {
      const nutrition = createMockNutrition();
      const result = render(
        <NutritionSection nutrition={nutrition} testID="nutrition" />
      );

      const caloriesInput = result.getByTestId("nutrition-input-calories");
      const carbsInput = result.getByTestId("nutrition-input-carbs");
      const proteinInput = result.getByTestId("nutrition-input-protein");
      const fatInput = result.getByTestId("nutrition-input-fat");
      const sugarInput = result.getByTestId("nutrition-input-sugar");
      const sodiumInput = result.getByTestId("nutrition-input-sodium");

      expect(caloriesInput).toBeTruthy();
      expect(carbsInput).toBeTruthy();
      expect(proteinInput).toBeTruthy();
      expect(fatInput).toBeTruthy();
      expect(sugarInput).toBeTruthy();
      expect(sodiumInput).toBeTruthy();
    });
  });

  // =============================================================================
  // THEME INTEGRATION
  // =============================================================================

  describe("theme integration", () => {
    it("applies theme colors to empty icon", () => {
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={undefined} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const restaurantIcon = ionicons.find(
        (icon: any) => icon.props.name === "restaurant-outline"
      );
      expect(restaurantIcon.props.color).toBe("#999999");
    });

    it("applies theme colors to header icon", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const restaurantIcon = ionicons.find(
        (icon: any) => icon.props.name === "restaurant-outline"
      );
      expect(restaurantIcon.props.color).toBe("#007AFF");
    });

    it("applies custom theme colors via useStyles", () => {
      mockUseStyles.mockImplementationOnce((stylesFn) => {
        const mockColors = {
          bg: { primary: "#FFFFFF", secondary: "#F5F5F5" },
          border: { default: "#E5E5E5" },
          text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
          interactive: { primary: "#FF0000" },
        };
        return stylesFn(mockColors);
      });

      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const restaurantIcon = ionicons.find(
        (icon: any) => icon.props.name === "restaurant-outline"
      );
      expect(restaurantIcon.props.color).toBe("#FF0000");
    });
  });

  // =============================================================================
  // I18N INTEGRATION
  // =============================================================================

  describe("i18n integration", () => {
    it("calls useDiaryI18n hook", () => {
      const nutrition = createMockNutrition();
      render(<NutritionSection nutrition={nutrition} />);

      expect(mockUseDiaryI18n).toHaveBeenCalled();
    });

    it("calls useCommonI18n hook", () => {
      const nutrition = createMockNutrition();
      render(<NutritionSection nutrition={nutrition} onNutritionChange={jest.fn()} />);

      expect(mockUseCommonI18n).toHaveBeenCalled();
    });

    it("uses i18n translations for all labels", () => {
      mockUseDiaryI18n.mockReturnValue({
        nutritionCalories: "칼로리",
        nutritionProtein: "단백질",
        nutritionFat: "지방",
        nutritionCarbs: "탄수화물",
        nutritionFiber: "섬유질",
        nutritionSugar: "당",
        nutritionSodium: "나트륨",
        nutritionInfo: "영양 정보",
        editNutrition: "Edit Nutrition",
        editDone: "Edit Done",
        addNutrition: "Add nutrition info",
      });

      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      expect(texts.find((text: any) => text.props.children === "칼로리")).toBeTruthy();
      expect(texts.find((text: any) => text.props.children === "탄수화물")).toBeTruthy();
      expect(texts.find((text: any) => text.props.children === "단백질")).toBeTruthy();
      expect(texts.find((text: any) => text.props.children === "지방")).toBeTruthy();
      expect(texts.find((text: any) => text.props.children === "당")).toBeTruthy();
      expect(texts.find((text: any) => text.props.children === "나트륨")).toBeTruthy();
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe("edge cases", () => {
    it("handles very large nutrition values", () => {
      const nutrition = createMockNutrition({ calories: 999999 });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const caloriesInput = inputs.find((input: any) => input.props.value === "999999");
      expect(caloriesInput).toBeTruthy();
    });

    it("handles zero values in some fields", () => {
      const nutrition = createMockNutrition({
        calories: 100,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      });
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      const caloriesInput = inputs.find((input: any) => input.props.value === "100");
      expect(caloriesInput).toBeTruthy();
    });

    it("handles entering edit mode from empty state", () => {
      const onNutritionChange = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={undefined} onNutritionChange={onNutritionChange} />
      );

      // Press CTA to enter edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const ctaPressable = pressables[0];
      fireEvent.press(ctaPressable);

      // Should show TextInputs with empty values
      const inputs = UNSAFE_getAllByType("TextInput" as any);
      expect(inputs.length).toBe(6);
      inputs.forEach((input: any) => {
        expect(input.props.editable).toBe(true);
      });
    });

    it("multiple edit/save cycles work correctly", () => {
      const nutrition = createMockNutrition({ calories: 450 });
      const onNutritionChange = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={onNutritionChange} />
      );

      // First cycle
      let pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton1 = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton1);

      pressables = UNSAFE_getAllByType("Pressable" as any);
      const doneButton1 = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Done";
      });
      fireEvent.press(doneButton1);

      // Second cycle
      pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton2 = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });
      fireEvent.press(editButton2);

      pressables = UNSAFE_getAllByType("Pressable" as any);
      const doneButton2 = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Done";
      });
      fireEvent.press(doneButton2);

      expect(onNutritionChange).toHaveBeenCalledTimes(2);
    });

    it("does not crash with missing i18n translations", () => {
      mockUseDiaryI18n.mockReturnValue({});
      mockUseCommonI18n.mockReturnValue({});

      const nutrition = createMockNutrition();
      expect(() => render(<NutritionSection nutrition={nutrition} />)).not.toThrow();
    });

    it("works without testID", () => {
      const nutrition = createMockNutrition();
      const { UNSAFE_getAllByType } = render(<NutritionSection nutrition={nutrition} />);

      const inputs = UNSAFE_getAllByType("TextInput" as any);
      expect(inputs.length).toBeGreaterThan(0);
    });

    it("handles rapid state changes", () => {
      const nutrition = createMockNutrition();
      const onNutritionChange = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <NutritionSection nutrition={nutrition} onNutritionChange={onNutritionChange} />
      );

      // Rapidly toggle edit mode
      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });

      fireEvent.press(editButton);
      const pressablesAfterEdit = UNSAFE_getAllByType("Pressable" as any);
      const doneButton = pressablesAfterEdit.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Done";
      });
      fireEvent.press(doneButton);

      expect(onNutritionChange).toHaveBeenCalledTimes(1);
    });
  });
});
