// Define global __DEV__
global.__DEV__ = false;

// Mock modules before imports
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));
jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
}));
jest.mock("../settingsApi", () => ({
  settingsApi: {
    deleteMe: jest.fn(),
  },
}));
jest.mock("@/features/auth", () => ({
  useAuthStore: jest.fn(),
}));
jest.mock("@/shared/lib/i18n", () => ({
  useSettingsI18n: jest.fn(),
  changeLanguage: jest.fn(),
}));
jest.mock("../settingsStore", () => ({
  useSettingsStore: jest.fn(),
}));

import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useDeleteAccountMutation } from "../useSettingsQueries";
import { useSettingsScreen } from "../useSettingsScreen";
import { settingsApi } from "../settingsApi";
import { useAuthStore } from "@/features/auth";
import { useSettingsI18n } from "@/shared/lib/i18n";
import { useSettingsStore } from "../settingsStore";

const mockAlert = Alert.alert as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockDeleteMe = settingsApi.deleteMe as jest.Mock;
const mockUseAuthStore = useAuthStore as jest.Mock;
const mockUseSettingsI18n = useSettingsI18n as jest.Mock;
const mockUseSettingsStore = useSettingsStore as jest.Mock;

// =============================================================================
// useDeleteAccountMutation Tests
// =============================================================================

describe("useDeleteAccountMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls useMutation with settingsApi.deleteMe", () => {
    const mockMutationReturn = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
    };

    mockUseMutation.mockReturnValue(mockMutationReturn);

    renderHook(() => useDeleteAccountMutation());

    expect(mockUseMutation).toHaveBeenCalledWith({
      mutationFn: expect.any(Function),
    });

    // Verify the mutationFn calls settingsApi.deleteMe
    const mutationConfig = mockUseMutation.mock.calls[0][0];
    mutationConfig.mutationFn();

    expect(mockDeleteMe).toHaveBeenCalled();
  });

  it("returns mutation object from useMutation", () => {
    const mockMutationReturn = {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
    };

    mockUseMutation.mockReturnValue(mockMutationReturn);

    const { result } = renderHook(() => useDeleteAccountMutation());

    expect(result.current).toBe(mockMutationReturn);
  });

  it("mutationFn is a function that calls settingsApi.deleteMe", () => {
    let capturedConfig: any;
    mockUseMutation.mockImplementation((config) => {
      capturedConfig = config;
      return {
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
      };
    });

    renderHook(() => useDeleteAccountMutation());

    expect(capturedConfig).toBeDefined();
    expect(typeof capturedConfig.mutationFn).toBe("function");

    // Call the mutationFn and verify it calls deleteMe
    capturedConfig.mutationFn();
    expect(mockDeleteMe).toHaveBeenCalled();
  });

  it("mutationFn returns result from settingsApi.deleteMe", async () => {
    let capturedConfig: any;
    mockUseMutation.mockImplementation((config) => {
      capturedConfig = config;
      return {
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
      };
    });

    mockDeleteMe.mockResolvedValue(undefined);

    renderHook(() => useDeleteAccountMutation());

    const result = await capturedConfig.mutationFn();
    expect(result).toBeUndefined();
  });

  it("mutationFn propagates errors from settingsApi.deleteMe", async () => {
    let capturedConfig: any;
    mockUseMutation.mockImplementation((config) => {
      capturedConfig = config;
      return {
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
      };
    });

    const testError = new Error("API Error");
    mockDeleteMe.mockRejectedValue(testError);

    renderHook(() => useDeleteAccountMutation());

    await expect(capturedConfig.mutationFn()).rejects.toThrow("API Error");
  });
});

// =============================================================================
// handleDeleteAccount Tests
// =============================================================================

describe("handleDeleteAccount", () => {
  const mockLogout = jest.fn();
  const mockMutateAsync = jest.fn();

  const mockAuthStoreReturn = {
    user: { id: "123", email: "test@example.com" },
    logout: mockLogout,
    isLoading: false,
  };

  const mockSettingsStoreReturn = {
    display: {
      theme: "dark" as const,
      language: "en" as const,
    },
    notifications: {
      enabled: true,
    },
    camera: {
      quality: "high" as const,
      aiProcessing: true,
      autoCapture: false,
      flashDefault: "auto" as const,
      saveToGallery: true,
    },
    isLoading: false,
    error: null,
    updateNotifications: jest.fn(),
    updateDisplay: jest.fn(),
    updateCamera: jest.fn(),
    loadSettings: jest.fn(),
    resetToDefaults: jest.fn(),
    clearError: jest.fn(),
  };

  const mockSettingsI18nReturn = {
    account: {
      deleteAccount: "Delete Account",
      deleteAccountConfirmation: "This will permanently delete your account and all associated data. This action cannot be undone.",
      deleteAccountButton: "Delete Account",
      deleteAccountSuccess: "Account deleted successfully",
      deleteAccountError: "Failed to delete account. Please try again.",
    },
    display: {
      theme: {
        light: "Light",
        dark: "Dark",
        system: "System",
        lightDesc: "Light theme",
        darkDesc: "Dark theme",
        systemDesc: "System theme",
      },
    },
    notifications: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue(mockAuthStoreReturn);
    mockUseSettingsStore.mockReturnValue(mockSettingsStoreReturn);
    mockUseSettingsI18n.mockReturnValue(mockSettingsI18nReturn);

    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
    });

    mockMutateAsync.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
  });

  it("shows Alert with correct title and message", () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      expect.any(Array)
    );
  });

  it("shows Alert with Cancel and Delete Account buttons", () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    expect(mockAlert).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: expect.any(Function),
        },
      ]
    );
  });

  it("pressing Cancel does nothing", () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    // Get the Cancel button
    const alertCall = mockAlert.mock.calls[0];
    const buttons = alertCall[2];
    const cancelButton = buttons[0];

    expect(cancelButton.text).toBe("Cancel");
    expect(cancelButton.style).toBe("cancel");

    // Cancel button should not have onPress or it should be undefined
    expect(cancelButton.onPress).toBeUndefined();

    // Verify mutation was not called
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("pressing Delete Account calls mutation and then logout on success", async () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    // Get the Delete button callback
    const alertCall = mockAlert.mock.calls[0];
    const buttons = alertCall[2];
    const deleteButton = buttons[1];

    expect(deleteButton.text).toBe("Delete Account");
    expect(deleteButton.style).toBe("destructive");

    // Call the delete button onPress
    await act(async () => {
      await deleteButton.onPress();
    });

    expect(mockMutateAsync).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();

    // Logout should be called after mutation succeeds
    const mutationCallOrder = mockMutateAsync.mock.invocationCallOrder[0];
    const logoutCallOrder = mockLogout.mock.invocationCallOrder[0];
    expect(mutationCallOrder).toBeLessThan(logoutCallOrder);
  });

  it("calls mutateAsync before logout (verified by call order)", async () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    await act(async () => {
      await deleteButton.onPress();
    });

    // Verify mutation was called
    expect(mockMutateAsync).toHaveBeenCalled();
    // Verify logout was called after (both should be called in the test)
    expect(mockLogout).toHaveBeenCalled();

    // Verify call order using invocationCallOrder
    const mutationCallOrder = mockMutateAsync.mock.invocationCallOrder[0];
    const logoutCallOrder = mockLogout.mock.invocationCallOrder[0];
    expect(mutationCallOrder).toBeLessThan(logoutCallOrder);
  });

  it("on mutation error shows error alert and does not call logout", async () => {
    const mutationError = new Error("Network error");
    mockMutateAsync.mockRejectedValue(mutationError);

    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    // Clear the first alert call
    mockAlert.mockClear();

    await act(async () => {
      await deleteButton.onPress();
    });

    // Should show error alert
    expect(mockAlert).toHaveBeenCalledWith(
      "Error",
      "Failed to delete account. Please try again."
    );

    // Should not call logout
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("on mutation error does not proceed to logout", async () => {
    mockMutateAsync.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(mockMutateAsync).toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("handles logout error by showing error alert", async () => {
    mockLogout.mockRejectedValue(new Error("Logout failed"));

    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    // Clear the first alert call
    mockAlert.mockClear();

    await act(async () => {
      await deleteButton.onPress();
    });

    // Both should be called
    expect(mockMutateAsync).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();

    // Error alert should be shown because the catch block catches any error
    expect(mockAlert).toHaveBeenCalledWith(
      "Error",
      "Failed to delete account. Please try again."
    );
  });

  it("handles network timeout error", async () => {
    const timeoutError = new Error("Request timeout");
    mockMutateAsync.mockRejectedValue(timeoutError);

    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    mockAlert.mockClear();

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Error",
      "Failed to delete account. Please try again."
    );
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("handles unauthorized error during deletion", async () => {
    const unauthorizedError = new Error("Unauthorized");
    mockMutateAsync.mockRejectedValue(unauthorizedError);

    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    mockAlert.mockClear();

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Error",
      "Failed to delete account. Please try again."
    );
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("catches error even if error object is not Error instance", async () => {
    mockMutateAsync.mockRejectedValue("String error");

    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    mockAlert.mockClear();

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Error",
      "Failed to delete account. Please try again."
    );
  });

  it("mutation is called with no arguments", async () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith();
  });

  it("logout is called with no arguments", async () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(mockLogout).toHaveBeenCalledWith();
  });

  it("does not show success alert when deletion succeeds", async () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    // Clear the first alert call
    mockAlert.mockClear();

    await act(async () => {
      await deleteButton.onPress();
    });

    // Only error alerts should be shown, no success alert
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it("executes deletion flow in correct sequence", async () => {
    const callOrder: string[] = [];

    mockMutateAsync.mockImplementation(async () => {
      callOrder.push("mutateAsync");
    });

    mockLogout.mockImplementation(async () => {
      callOrder.push("logout");
    });

    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(callOrder).toEqual(["mutateAsync", "logout"]);
  });

  it("can be called multiple times", async () => {
    const { result } = renderHook(() => useSettingsScreen());

    // First call
    act(() => {
      result.current.handleDeleteAccount();
    });

    expect(mockAlert).toHaveBeenCalledTimes(1);

    // Second call
    act(() => {
      result.current.handleDeleteAccount();
    });

    expect(mockAlert).toHaveBeenCalledTimes(2);
  });

  it("maintains consistent button order in alert", () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const buttons = alertCall[2];

    // Cancel should always be first
    expect(buttons[0].text).toBe("Cancel");
    expect(buttons[0].style).toBe("cancel");

    // Delete should always be second
    expect(buttons[1].text).toBe("Delete Account");
    expect(buttons[1].style).toBe("destructive");
  });

  it("executes onPress callback asynchronously", async () => {
    let resolveMutation: any;
    const mutationPromise = new Promise((resolve) => {
      resolveMutation = resolve;
    });
    mockMutateAsync.mockReturnValue(mutationPromise);

    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    // Start the async onPress
    const onPressPromise = deleteButton.onPress();

    // Mutation should be called immediately
    expect(mockMutateAsync).toHaveBeenCalled();

    // Logout should not be called yet
    expect(mockLogout).not.toHaveBeenCalled();

    // Resolve the mutation
    await act(async () => {
      resolveMutation(undefined);
      await onPressPromise;
    });

    // Now logout should be called
    expect(mockLogout).toHaveBeenCalled();
  });

  it("Alert.alert is called exactly once per handleDeleteAccount call", () => {
    const { result } = renderHook(() => useSettingsScreen());

    mockAlert.mockClear();

    act(() => {
      result.current.handleDeleteAccount();
    });

    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it("Delete button onPress is async function", () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    expect(deleteButton.onPress).toBeInstanceOf(Function);

    // Call it and verify it returns a Promise
    const returnValue = deleteButton.onPress();
    expect(returnValue).toBeInstanceOf(Promise);

    // Clean up the promise
    return returnValue.catch(() => {});
  });

  it("uses useCallback for handleDeleteAccount", () => {
    const { result, rerender } = renderHook(() => useSettingsScreen());

    const firstReference = result.current.handleDeleteAccount;

    rerender();

    const secondReference = result.current.handleDeleteAccount;

    // Function reference should be stable across rerenders
    expect(firstReference).toBe(secondReference);
  });

  it("handleDeleteAccount depends on deleteAccountMutation and logout", () => {
    const { result, rerender } = renderHook(() => useSettingsScreen());

    const firstReference = result.current.handleDeleteAccount;

    // Change the mutation mock (simulating dependency change)
    mockUseMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
    });

    rerender();

    const secondReference = result.current.handleDeleteAccount;

    // Function reference should change when dependencies change
    expect(firstReference).not.toBe(secondReference);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("useDeleteAccount integration", () => {
  const mockLogout = jest.fn();
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      user: { id: "123" },
      logout: mockLogout,
      isLoading: false,
    });

    mockUseSettingsStore.mockReturnValue({
      display: {
        theme: "dark" as const,
        language: "en" as const,
      },
      notifications: {
        enabled: true,
      },
      camera: {
        quality: "high" as const,
        aiProcessing: true,
        autoCapture: false,
        flashDefault: "auto" as const,
        saveToGallery: true,
      },
      isLoading: false,
      error: null,
      updateNotifications: jest.fn(),
      updateDisplay: jest.fn(),
      updateCamera: jest.fn(),
      loadSettings: jest.fn(),
      resetToDefaults: jest.fn(),
      clearError: jest.fn(),
    });

    mockUseSettingsI18n.mockReturnValue({
      account: {},
      display: {
        theme: {
          light: "Light",
          dark: "Dark",
          system: "System",
          lightDesc: "Light theme",
          darkDesc: "Dark theme",
          systemDesc: "System theme",
        },
      },
      notifications: {},
    });

    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
    });

    mockMutateAsync.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
  });

  it("full deletion flow: alert -> mutation -> logout", async () => {
    const { result } = renderHook(() => useSettingsScreen());

    // Step 1: Trigger the deletion
    act(() => {
      result.current.handleDeleteAccount();
    });

    expect(mockAlert).toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();

    // Step 2: Confirm deletion
    const alertCall = mockAlert.mock.calls[0];
    const deleteButton = alertCall[2][1];

    await act(async () => {
      await deleteButton.onPress();
    });

    // Step 3: Verify execution
    expect(mockMutateAsync).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it("cancellation flow: alert -> cancel -> no mutation", () => {
    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    expect(mockAlert).toHaveBeenCalled();

    // Don't press any button (equivalent to Cancel/dismiss)
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("error flow: alert -> mutation error -> error alert -> no logout", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useSettingsScreen());

    act(() => {
      result.current.handleDeleteAccount();
    });

    const firstAlertCall = mockAlert.mock.calls[0];
    const deleteButton = firstAlertCall[2][1];

    mockAlert.mockClear();

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(mockMutateAsync).toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith("Error", expect.any(String));
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
