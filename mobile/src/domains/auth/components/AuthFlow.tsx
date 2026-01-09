import { useState } from "react";
import { createStyles, useStyles } from "@/design-system/theme";
import { Box } from "@/design-system/styled";
import { PhoneAuthScreen } from "./PhoneAuthScreen";
import { VerificationScreen } from "./VerificationScreen";
import { useAuthStore } from "../stores/authStore";

interface AuthFlowProps {
  onComplete: () => void;
  onCancel?: () => void;
}

type AuthStep = "phone" | "verification";

export function AuthFlow({ onComplete, onCancel }: AuthFlowProps) {
  const s = useStyles(styles);

  const { clearPendingAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<AuthStep>("phone");

  const handlePhoneSuccess = () => {
    setCurrentStep("verification");
  };

  const handleVerificationSuccess = () => {
    onComplete();
  };

  const handleBackToPhone = () => {
    clearPendingAuth();
    setCurrentStep("phone");
  };

  const handleCancel = () => {
    clearPendingAuth();
    onCancel?.();
  };

  return (
    <Box style={s.container}>
      {currentStep === "phone" && <PhoneAuthScreen onSuccess={handlePhoneSuccess} onCancel={handleCancel} />}

      {currentStep === "verification" && (
        <VerificationScreen onSuccess={handleVerificationSuccess} onBack={handleBackToPhone} />
      )}
    </Box>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
}));
