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
    ingredients: "Ingredients",
    addIngredient: "Add...",
    editNutrition: "Edit Nutrition",
    editDone: "Edit Done",
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
      fontSize: { bodySmall: 13, caption: 12 },
      fontWeight: { normal: "400", medium: "500" },
    },
    radius: { full: 9999 },
    size: { icon: { xs: 16 } },
  },
}));

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { IngredientsSection, AIAnalysisSection } from "../AIAnalysisSection";
import { useStyles, useTheme } from "@/shared/ui/theme";
import { useDiaryI18n, useCommonI18n } from "@/shared/lib/i18n";

const mockUseStyles = useStyles as jest.Mock;
const mockUseTheme = useTheme as jest.Mock;
const mockUseDiaryI18n = useDiaryI18n as jest.Mock;
const mockUseCommonI18n = useCommonI18n as jest.Mock;

// =============================================================================
// HELPERS
// =============================================================================

function findEditButton(getAllByType: any) {
  const pressables = getAllByType("Pressable" as any);
  return pressables.find((p: any) => p.props.accessibilityLabel === "Edit Nutrition");
}

function findDoneButton(getAllByType: any) {
  const pressables = getAllByType("Pressable" as any);
  return pressables.find((p: any) => p.props.accessibilityLabel === "Edit Done");
}

function findRemoveButtons(getAllByType: any) {
  const ionicons = getAllByType("Ionicons" as any);
  const closeIcons = ionicons.filter((icon: any) => icon.props.name === "close");
  // Navigate up to the Pressable parent — use the Pressable list instead
  const pressables = getAllByType("Pressable" as any);
  return pressables.filter((p: any) => {
    try {
      // Remove button pressables have a View > Ionicons(close) inside
      const inner = p.props?.children;
      if (!inner) return false;
      const innerChildren = inner?.props?.children;
      if (!innerChildren) return false;
      return innerChildren?.props?.name === "close";
    } catch {
      return false;
    }
  });
}

function safeGetAllByType(root: any, type: string) {
  try {
    return root.UNSAFE_getAllByType(type as any);
  } catch {
    return [];
  }
}

// =============================================================================
// IngredientsSection — rendering tests
// =============================================================================

describe("IngredientsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDiaryI18n.mockReturnValue({
      ingredients: "Ingredients",
      addIngredient: "Add...",
      editNutrition: "Edit Nutrition",
      editDone: "Edit Done",
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
    mockUseTheme.mockReturnValue({
      colors: {
        bg: { primary: "#FFFFFF", secondary: "#F5F5F5" },
        border: { default: "#E5E5E5" },
        text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
        interactive: { primary: "#007AFF" },
      },
    });
  });

  // =============================================================================
  // NULL RENDERING
  // =============================================================================

  describe("null rendering", () => {
    it("returns null when ingredients is undefined", () => {
      const { toJSON } = render(<IngredientsSection ingredients={undefined} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when ingredients is null", () => {
      const { toJSON } = render(<IngredientsSection ingredients={null} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when ingredients is empty array", () => {
      const { toJSON } = render(<IngredientsSection ingredients={[]} />);
      expect(toJSON()).toBeNull();
    });

    it("returns null when ingredients is empty array and no onIngredientsChange", () => {
      const { toJSON } = render(
        <IngredientsSection ingredients={[]} onIngredientsChange={undefined} />
      );
      expect(toJSON()).toBeNull();
    });
  });

  // =============================================================================
  // CHIP RENDERING
  // =============================================================================

  describe("chip rendering", () => {
    it("renders ingredient chips with correct text", () => {
      const ingredients = ["Chicken", "Rice", "Broccoli"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const chickenText = texts.find((text: any) => text.props.children === "Chicken");
      const riceText = texts.find((text: any) => text.props.children === "Rice");
      const broccoliText = texts.find((text: any) => text.props.children === "Broccoli");

      expect(chickenText).toBeTruthy();
      expect(riceText).toBeTruthy();
      expect(broccoliText).toBeTruthy();
    });

    it("renders single ingredient", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const chickenText = texts.find((text: any) => text.props.children === "Chicken");
      expect(chickenText).toBeTruthy();
    });

    it("renders multiple ingredients", () => {
      const ingredients = ["A", "B", "C", "D", "E"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      expect(texts.filter((t: any) => ["A", "B", "C", "D", "E"].includes(t.props.children)).length).toBe(5);
    });

    it("handles ingredients with special characters", () => {
      const ingredients = ["Café", "Jalapeño", "Crème Brûlée"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const cafeText = texts.find((text: any) => text.props.children === "Café");
      expect(cafeText).toBeTruthy();
    });

    it("handles ingredients with emoji", () => {
      const ingredients = ["🍗 Chicken", "🍚 Rice"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const chickenText = texts.find((text: any) => text.props.children === "🍗 Chicken");
      expect(chickenText).toBeTruthy();
    });

    it("handles very long ingredient names", () => {
      const longIngredient = "A".repeat(200);
      const ingredients = [longIngredient];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const longText = texts.find((text: any) => text.props.children === longIngredient);
      expect(longText).toBeTruthy();
    });
  });

  // =============================================================================
  // HEADER
  // =============================================================================

  describe("header", () => {
    it("shows leaf-outline icon in header", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const leafIcon = ionicons.find((icon: any) => icon.props.name === "leaf-outline");
      expect(leafIcon).toBeTruthy();
      expect(leafIcon.props.size).toBe(16);
    });

    it("does not show sparkles icon", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const sparklesIcon = ionicons.find((icon: any) => icon.props.name === "sparkles");
      expect(sparklesIcon).toBeUndefined();
    });

    it("shows Ingredients text in header", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const ingredientsText = texts.find((text: any) => text.props.children === "Ingredients");
      expect(ingredientsText).toBeTruthy();
    });

    it("does not show AI Analysis text", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const aiAnalysisText = texts.find((text: any) => text.props.children === "AI Analysis");
      expect(aiAnalysisText).toBeUndefined();
    });

    it("uses i18n translation for ingredients text", () => {
      mockUseDiaryI18n.mockReturnValue({
        ingredients: "재료",
        addIngredient: "추가...",
        editNutrition: "영양 편집",
        editDone: "완료",
      });
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const ingredientsText = texts.find((text: any) => text.props.children === "재료");
      expect(ingredientsText).toBeTruthy();
    });

    it("applies correct icon color from theme", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const ionicons = UNSAFE_getAllByType("Ionicons" as any);
      const leafIcon = ionicons.find((icon: any) => icon.props.name === "leaf-outline");
      expect(leafIcon.props.color).toBe("#007AFF");
    });
  });

  // =============================================================================
  // EDIT BUTTON
  // =============================================================================

  describe("edit button", () => {
    it("shows Edit text when onIngredientsChange provided", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection
          ingredients={ingredients}
          onIngredientsChange={jest.fn()}
        />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "Edit");
      expect(editText).toBeTruthy();
    });

    it("hidden when onIngredientsChange not provided", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "Edit");
      expect(editText).toBeUndefined();
    });

    it("hidden when disabled is true", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection
          ingredients={ingredients}
          onIngredientsChange={jest.fn()}
          disabled={true}
        />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "Edit");
      expect(editText).toBeUndefined();
    });

    it("visible when disabled is false", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection
          ingredients={ingredients}
          onIngredientsChange={jest.fn()}
          disabled={false}
        />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "Edit");
      expect(editText).toBeTruthy();
    });

    it("uses i18n translation for edit text", () => {
      mockUseCommonI18n.mockReturnValue({
        done: "Done",
        edit: "편집",
      });
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection
          ingredients={ingredients}
          onIngredientsChange={jest.fn()}
        />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "편집");
      expect(editText).toBeTruthy();
    });
  });

  // =============================================================================
  // EDIT TOGGLE
  // =============================================================================

  describe("edit toggle", () => {
    it("pressing Edit enters edit mode and shows Done text", () => {
      const result = render(
        <IngredientsSection
          ingredients={["Chicken"]}
          onIngredientsChange={jest.fn()}
        />
      );

      const editBtn = findEditButton(result.UNSAFE_getAllByType);
      fireEvent.press(editBtn);

      const texts = result.UNSAFE_getAllByType("Text" as any);
      const doneText = texts.find((text: any) => text.props.children === "Done");
      expect(doneText).toBeTruthy();
    });

    it("shows remove buttons when in edit mode", () => {
      const result = render(
        <IngredientsSection
          ingredients={["Chicken", "Rice"]}
          onIngredientsChange={jest.fn()}
        />
      );

      const editBtn = findEditButton(result.UNSAFE_getAllByType);
      fireEvent.press(editBtn);

      const ionicons = result.UNSAFE_getAllByType("Ionicons" as any);
      const closeIcons = ionicons.filter((icon: any) => icon.props.name === "close");
      expect(closeIcons.length).toBe(2);
    });

    it("shows add ingredient input when in edit mode", () => {
      const result = render(
        <IngredientsSection
          ingredients={["Chicken"]}
          onIngredientsChange={jest.fn()}
        />
      );

      const editBtn = findEditButton(result.UNSAFE_getAllByType);
      fireEvent.press(editBtn);

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      expect(inputs.length).toBe(1);
      expect(inputs[0].props.placeholder).toBe("Add...");
    });

    it("hides remove buttons when not in edit mode", () => {
      const result = render(
        <IngredientsSection
          ingredients={["Chicken"]}
          onIngredientsChange={jest.fn()}
        />
      );

      const ionicons = result.UNSAFE_getAllByType("Ionicons" as any);
      const closeIcon = ionicons.find((icon: any) => icon.props.name === "close");
      expect(closeIcon).toBeUndefined();
    });

    it("hides add ingredient input when not in edit mode", () => {
      const result = render(
        <IngredientsSection
          ingredients={["Chicken"]}
          onIngredientsChange={jest.fn()}
        />
      );

      const inputs = safeGetAllByType(result, "TextInput");
      expect(inputs.length).toBe(0);
    });
  });

  // =============================================================================
  // REMOVE INGREDIENT
  // =============================================================================

  describe("remove ingredient", () => {
    it("pressing remove button removes ingredient from list", () => {
      const result = render(
        <IngredientsSection
          ingredients={["Chicken", "Rice", "Broccoli"]}
          onIngredientsChange={jest.fn()}
        />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      // Find remove buttons by their onPress handler — Pressables with style position absolute
      const pressables = result.UNSAFE_getAllByType("Pressable" as any);
      const removeButtons = pressables.filter((p: any) => p.props.style?.position === "absolute");
      fireEvent.press(removeButtons[0]);

      const texts = result.UNSAFE_getAllByType("Text" as any);
      expect(texts.find((t: any) => t.props.children === "Chicken")).toBeUndefined();
      expect(texts.find((t: any) => t.props.children === "Rice")).toBeTruthy();
      expect(texts.find((t: any) => t.props.children === "Broccoli")).toBeTruthy();
    });

    it("can remove all ingredients", () => {
      const result = render(
        <IngredientsSection
          ingredients={["Chicken"]}
          onIngredientsChange={jest.fn()}
        />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const pressables = result.UNSAFE_getAllByType("Pressable" as any);
      const removeButtons = pressables.filter((p: any) => p.props.style?.position === "absolute");
      fireEvent.press(removeButtons[0]);

      expect(result.toJSON()).not.toBeNull();
    });

    it("removes correct ingredient by index", () => {
      const result = render(
        <IngredientsSection
          ingredients={["A", "B", "C"]}
          onIngredientsChange={jest.fn()}
        />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const pressables = result.UNSAFE_getAllByType("Pressable" as any);
      const removeButtons = pressables.filter((p: any) => p.props.style?.position === "absolute");
      fireEvent.press(removeButtons[1]); // Remove "B"

      const texts = result.UNSAFE_getAllByType("Text" as any);
      expect(texts.find((t: any) => t.props.children === "A")).toBeTruthy();
      expect(texts.find((t: any) => t.props.children === "B")).toBeUndefined();
      expect(texts.find((t: any) => t.props.children === "C")).toBeTruthy();
    });
  });

  // =============================================================================
  // ADD INGREDIENT
  // =============================================================================

  describe("add ingredient", () => {
    it("typing in input and submitting adds new ingredient", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "Rice");
      fireEvent(inputs[0], "submitEditing");

      const texts = result.UNSAFE_getAllByType("Text" as any);
      expect(texts.find((t: any) => t.props.children === "Rice")).toBeTruthy();
    });

    it("shows add button when input has text", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "Rice");

      const ionicons = result.UNSAFE_getAllByType("Ionicons" as any);
      const addIcon = ionicons.find((icon: any) => icon.props.name === "add");
      expect(addIcon).toBeTruthy();
    });

    it("pressing add button adds ingredient", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "Rice");

      // Find the add button by its style (marginLeft)
      const pressables = result.UNSAFE_getAllByType("Pressable" as any);
      const addButton = pressables.find((p: any) => p.props.style?.marginLeft !== undefined);
      fireEvent.press(addButton);

      const texts = result.UNSAFE_getAllByType("Text" as any);
      expect(texts.find((t: any) => t.props.children === "Rice")).toBeTruthy();
    });

    it("clears input after adding ingredient", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "Rice");
      fireEvent(inputs[0], "submitEditing");

      const inputsAfter = result.UNSAFE_getAllByType("TextInput" as any);
      expect(inputsAfter[0].props.value).toBe("");
    });

    it("trims whitespace from ingredient name", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "  Rice  ");
      fireEvent(inputs[0], "submitEditing");

      const texts = result.UNSAFE_getAllByType("Text" as any);
      expect(texts.find((t: any) => t.props.children === "Rice")).toBeTruthy();
    });

    it("does not add empty ingredient", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "   ");
      fireEvent(inputs[0], "submitEditing");

      const texts = result.UNSAFE_getAllByType("Text" as any);
      const ingredientTexts = texts.filter((t: any) =>
        !["Ingredients", "Done", "Edit"].includes(t.props.children)
      );
      expect(ingredientTexts.length).toBe(1);
    });
  });

  // =============================================================================
  // DUPLICATE PREVENTION
  // =============================================================================

  describe("duplicate prevention", () => {
    it("does not add duplicate ingredient", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken", "Rice"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "Chicken");
      fireEvent(inputs[0], "submitEditing");

      const texts = result.UNSAFE_getAllByType("Text" as any);
      const chickenTexts = texts.filter((t: any) => t.props.children === "Chicken");
      expect(chickenTexts.length).toBe(1);
    });

    it("prevents duplicate with exact match", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "Chicken");
      fireEvent(inputs[0], "submitEditing");

      const texts = result.UNSAFE_getAllByType("Text" as any);
      expect(texts.filter((t: any) => t.props.children === "Chicken").length).toBe(1);
    });

    it("allows adding different ingredient", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "Rice");
      fireEvent(inputs[0], "submitEditing");

      const texts = result.UNSAFE_getAllByType("Text" as any);
      expect(texts.find((t: any) => t.props.children === "Chicken")).toBeTruthy();
      expect(texts.find((t: any) => t.props.children === "Rice")).toBeTruthy();
    });
  });

  // =============================================================================
  // SAVE
  // =============================================================================

  describe("save", () => {
    it("pressing Done calls onIngredientsChange with updated list", () => {
      const mockOnChange = jest.fn();
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={mockOnChange} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "Rice");
      fireEvent(inputs[0], "submitEditing");

      fireEvent.press(findDoneButton(result.UNSAFE_getAllByType));

      expect(mockOnChange).toHaveBeenCalledWith(["Chicken", "Rice"]);
    });

    it("calls onIngredientsChange with empty array when all removed", () => {
      const mockOnChange = jest.fn();
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={mockOnChange} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const pressables = result.UNSAFE_getAllByType("Pressable" as any);
      const removeButtons = pressables.filter((p: any) => p.props.style?.position === "absolute");
      fireEvent.press(removeButtons[0]);

      fireEvent.press(findDoneButton(result.UNSAFE_getAllByType));

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it("calls onIngredientsChange once per save", () => {
      const mockOnChange = jest.fn();
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={mockOnChange} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));
      fireEvent.press(findDoneButton(result.UNSAFE_getAllByType));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // PROPS SYNC
  // =============================================================================

  describe("props sync", () => {
    it("updating ingredients prop syncs local state", () => {
      const { rerender, UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={["Chicken"]} />
      );

      // Update ingredients
      rerender(<IngredientsSection ingredients={["Rice", "Broccoli"]} />);

      // Check new ingredients are displayed
      const texts = UNSAFE_getAllByType("Text" as any);
      const riceText = texts.find((text: any) => text.props.children === "Rice");
      const broccoliText = texts.find((text: any) => text.props.children === "Broccoli");
      const chickenText = texts.find((text: any) => text.props.children === "Chicken");

      expect(riceText).toBeTruthy();
      expect(broccoliText).toBeTruthy();
      expect(chickenText).toBeUndefined();
    });

    it("syncs when ingredients change from array to null", () => {
      const { rerender, toJSON } = render(
        <IngredientsSection ingredients={["Chicken"]} />
      );

      rerender(<IngredientsSection ingredients={null} />);

      expect(toJSON()).toBeNull();
    });

    it("syncs when ingredients change from null to array", () => {
      const { rerender, UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={null} />
      );

      rerender(<IngredientsSection ingredients={["Chicken"]} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const chickenText = texts.find((text: any) => text.props.children === "Chicken");
      expect(chickenText).toBeTruthy();
    });

    it("syncs when ingredients change from empty to populated", () => {
      const { rerender, UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={[]} />
      );

      rerender(<IngredientsSection ingredients={["Chicken", "Rice"]} />);

      const texts = UNSAFE_getAllByType("Text" as any);
      const chickenText = texts.find((text: any) => text.props.children === "Chicken");
      const riceText = texts.find((text: any) => text.props.children === "Rice");
      expect(chickenText).toBeTruthy();
      expect(riceText).toBeTruthy();
    });
  });

  // =============================================================================
  // TEST ID
  // =============================================================================

  describe("testID", () => {
    it("applies testID to container when provided", () => {
      const ingredients = ["Chicken"];
      const result = render(
        <IngredientsSection ingredients={ingredients} testID="custom-test-id" />
      );

      const container = result.getByTestId("custom-test-id");
      expect(container).toBeTruthy();
    });

    it("works without testID", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const views = UNSAFE_getAllByType("View" as any);
      expect(views.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // DEPRECATED ALIAS
  // =============================================================================

  describe("deprecated alias", () => {
    it("AIAnalysisSection export is same as IngredientsSection", () => {
      expect(AIAnalysisSection).toBe(IngredientsSection);
    });

    it("AIAnalysisSection renders correctly", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <AIAnalysisSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const ingredientsText = texts.find((text: any) => text.props.children === "Ingredients");
      expect(ingredientsText).toBeTruthy();
    });

    it("AIAnalysisSection has same functionality", () => {
      const mockOnChange = jest.fn();
      const result = render(
        <AIAnalysisSection ingredients={["Chicken"]} onIngredientsChange={mockOnChange} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      fireEvent.changeText(inputs[0], "Rice");
      fireEvent(inputs[0], "submitEditing");

      fireEvent.press(findDoneButton(result.UNSAFE_getAllByType));

      expect(mockOnChange).toHaveBeenCalledWith(["Chicken", "Rice"]);
    });
  });

  // =============================================================================
  // NO NUTRITION CODE
  // =============================================================================

  describe("no nutrition code", () => {
    it("does not render Calories text", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const caloriesText = texts.find((text: any) =>
        text.props.children && text.props.children.toString().includes("Calories")
      );
      expect(caloriesText).toBeUndefined();
    });

    it("does not render Protein text", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const proteinText = texts.find((text: any) =>
        text.props.children && text.props.children.toString().includes("Protein")
      );
      expect(proteinText).toBeUndefined();
    });

    it("does not render Carbs text", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const carbsText = texts.find((text: any) =>
        text.props.children && text.props.children.toString().includes("Carbs")
      );
      expect(carbsText).toBeUndefined();
    });

    it("does not render Fat text", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const fatText = texts.find((text: any) =>
        text.props.children && text.props.children.toString().includes("Fat")
      );
      expect(fatText).toBeUndefined();
    });

    it("does not render kcal text", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const kcalText = texts.find((text: any) =>
        text.props.children && text.props.children.toString().includes("kcal")
      );
      expect(kcalText).toBeUndefined();
    });

    it("does not render nutrition-related text in edit mode", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const texts = result.UNSAFE_getAllByType("Text" as any);
      const nutritionKeywords = ["Calories", "Protein", "Carbs", "Fat", "kcal", "Sodium", "Sugar"];
      const nutritionText = texts.find((t: any) =>
        t.props.children && nutritionKeywords.includes(t.props.children.toString())
      );
      expect(nutritionText).toBeUndefined();
    });

    it("only shows ingredient-related text", () => {
      const ingredients = ["Chicken", "Rice"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection
          ingredients={ingredients}
          onIngredientsChange={jest.fn()}
        />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const textContents = texts.map((t: any) => t.props.children);

      // Should only have: "Ingredients", "Edit", "Chicken", "Rice"
      const validContents = ["Ingredients", "Edit", "Chicken", "Rice"];
      textContents.forEach((content: string) => {
        expect(validContents).toContain(content);
      });
    });
  });

  // =============================================================================
  // THEME INTEGRATION
  // =============================================================================

  describe("theme integration", () => {
    it("applies theme colors to ingredient chips", () => {
      mockUseStyles.mockImplementationOnce((stylesFn) => {
        const mockColors = {
          bg: { primary: "#FFFFFF", secondary: "#FF0000" },
          border: { default: "#E5E5E5" },
          text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
          interactive: { primary: "#007AFF" },
        };
        return stylesFn(mockColors);
      });

      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const views = UNSAFE_getAllByType("View" as any);
      const chipView = views.find((v: any) => v.props.style?.backgroundColor === "#FF0000");
      expect(chipView).toBeTruthy();
    });

    it("applies theme text colors", () => {
      mockUseStyles.mockImplementationOnce((stylesFn) => {
        const mockColors = {
          bg: { primary: "#FFFFFF", secondary: "#F5F5F5" },
          border: { default: "#E5E5E5" },
          text: { primary: "#FF0000", secondary: "#666666", tertiary: "#999999" },
          interactive: { primary: "#007AFF" },
        };
        return stylesFn(mockColors);
      });

      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection ingredients={ingredients} />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const chickenText = texts.find((text: any) => text.props.children === "Chicken");
      const style = Array.isArray(chickenText.props.style) ? chickenText.props.style.flat() : [chickenText.props.style];
      const colorStyle = style.find((s: any) => s && s.color);
      expect(colorStyle.color).toBe("#FF0000");
    });

    it("applies theme interactive colors to edit button", () => {
      mockUseStyles.mockImplementationOnce((stylesFn) => {
        const mockColors = {
          bg: { primary: "#FFFFFF", secondary: "#F5F5F5" },
          border: { default: "#E5E5E5" },
          text: { primary: "#000000", secondary: "#666666", tertiary: "#999999" },
          interactive: { primary: "#00FF00" },
        };
        return stylesFn(mockColors);
      });

      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection
          ingredients={ingredients}
          onIngredientsChange={jest.fn()}
        />
      );

      const texts = UNSAFE_getAllByType("Text" as any);
      const editText = texts.find((text: any) => text.props.children === "Edit");
      const style = Array.isArray(editText.props.style) ? editText.props.style.flat() : [editText.props.style];
      const colorStyle = style.find((s: any) => s && s.color);
      expect(colorStyle.color).toBe("#00FF00");
    });
  });

  // =============================================================================
  // I18N INTEGRATION
  // =============================================================================

  describe("i18n integration", () => {
    it("calls useDiaryI18n hook", () => {
      const ingredients = ["Chicken"];
      render(<IngredientsSection ingredients={ingredients} />);

      expect(mockUseDiaryI18n).toHaveBeenCalled();
    });

    it("calls useCommonI18n hook", () => {
      const ingredients = ["Chicken"];
      render(
        <IngredientsSection
          ingredients={ingredients}
          onIngredientsChange={jest.fn()}
        />
      );

      expect(mockUseCommonI18n).toHaveBeenCalled();
    });

    it("uses i18n translation for add ingredient placeholder", () => {
      mockUseDiaryI18n.mockReturnValue({
        ingredients: "Ingredients",
        addIngredient: "추가...",
        editNutrition: "Edit Nutrition",
        editDone: "Edit Done",
      });

      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const inputs = result.UNSAFE_getAllByType("TextInput" as any);
      expect(inputs[0].props.placeholder).toBe("추가...");
    });
  });

  // =============================================================================
  // ACCESSIBILITY
  // =============================================================================

  describe("accessibility", () => {
    it("sets correct accessibility label on edit button", () => {
      const ingredients = ["Chicken"];
      const { UNSAFE_getAllByType } = render(
        <IngredientsSection
          ingredients={ingredients}
          onIngredientsChange={jest.fn()}
        />
      );

      const pressables = UNSAFE_getAllByType("Pressable" as any);
      const editButton = pressables.find((p: any) => {
        const texts = p.props.children?.props?.children;
        return texts === "Edit";
      });

      expect(editButton.props.accessibilityLabel).toBe("Edit Nutrition");
      expect(editButton.props.accessibilityRole).toBe("button");
    });

    it("changes accessibility label when in edit mode", () => {
      const result = render(
        <IngredientsSection ingredients={["Chicken"]} onIngredientsChange={jest.fn()} />
      );

      fireEvent.press(findEditButton(result.UNSAFE_getAllByType));

      const doneBtn = findDoneButton(result.UNSAFE_getAllByType);
      expect(doneBtn.props.accessibilityLabel).toBe("Edit Done");
    });
  });
});
