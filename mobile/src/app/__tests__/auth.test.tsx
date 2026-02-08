// Mock modules before imports
jest.mock("react-native", () => ({
  View: "View",
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock("@/features/auth/model/authStore", () => ({
  useAuthStore: jest.fn(),
  selectIsAuthenticated: jest.fn((state) => state.isAuthenticated),
}));

jest.mock("@/features/auth", () => ({
  AuthFlow: jest.fn(() => null),
}));

jest.mock("@/shared/lib/deeplink", () => ({
  consumePendingDeepLink: jest.fn(),
}));

import React from "react";
import { render } from "@testing-library/react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/features/auth/model/authStore";
import { AuthFlow } from "@/features/auth";
import { consumePendingDeepLink } from "@/shared/lib/deeplink";
import AuthScreen from "../../../app/auth";

describe("AuthScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (consumePendingDeepLink as jest.Mock).mockReturnValue(null);
  });

  describe("when user is not authenticated", () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue(false);
    });

    it("renders AuthFlow component", () => {
      render(<AuthScreen />);

      expect(AuthFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          onComplete: expect.any(Function),
        }),
        undefined
      );
    });

    it("does not redirect on mount", () => {
      render(<AuthScreen />);

      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  describe("when user is authenticated", () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue(true);
    });

    it("redirects to home when no pending deep link", () => {
      (consumePendingDeepLink as jest.Mock).mockReturnValue(null);

      render(<AuthScreen />);

      expect(consumePendingDeepLink).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/");
    });

    it("redirects to pending deep link when available", () => {
      (consumePendingDeepLink as jest.Mock).mockReturnValue("/diary/123");

      render(<AuthScreen />);

      expect(consumePendingDeepLink).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/diary/123");
    });

    it("handles empty string pending link by redirecting to empty string", () => {
      (consumePendingDeepLink as jest.Mock).mockReturnValue("");

      render(<AuthScreen />);

      expect(router.replace).toHaveBeenCalledWith("");
    });
  });

  describe("onComplete callback", () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue(false);
    });

    it("redirects to home when no pending deep link", () => {
      (consumePendingDeepLink as jest.Mock).mockReturnValue(null);
      (AuthFlow as jest.Mock).mockImplementation(({ onComplete }) => {
        onComplete();
        return null;
      });

      render(<AuthScreen />);

      expect(router.replace).toHaveBeenCalledWith("/");
    });

    it("redirects to pending deep link when available", () => {
      (consumePendingDeepLink as jest.Mock).mockReturnValue("/diary/456");
      (AuthFlow as jest.Mock).mockImplementation(({ onComplete }) => {
        onComplete();
        return null;
      });

      render(<AuthScreen />);

      expect(router.replace).toHaveBeenCalledWith("/diary/456");
    });

    it("consumes deep link only once per callback invocation", () => {
      (consumePendingDeepLink as jest.Mock).mockReturnValue("/diary/789");
      (AuthFlow as jest.Mock).mockImplementation(({ onComplete }) => {
        onComplete();
        return null;
      });

      render(<AuthScreen />);

      // Called once in useEffect (when authenticated check runs) and once in onComplete
      expect(consumePendingDeepLink).toHaveBeenCalledTimes(1);
    });
  });
});
