import { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { createStyles, useStyles } from "@/design-system/theme";
import { Box, Text, HStack, VStack, Divider } from "@/design-system/styled";
import { tokens } from "@/design-system/tokens";
import { VALIDATION_PATTERNS } from "@/constants";

interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { name: "United States", code: "US", dialCode: "+1", flag: "US" },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "CA" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "GB" },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "DE" },
  { name: "France", code: "FR", dialCode: "+33", flag: "FR" },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "IT" },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "ES" },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "JP" },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "KR" },
  { name: "China", code: "CN", dialCode: "+86", flag: "CN" },
  { name: "India", code: "IN", dialCode: "+91", flag: "IN" },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "AU" },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "BR" },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "MX" },
];

// Flag emoji lookup
const FLAG_EMOJI: Record<string, string> = {
  US: "🇺🇸",
  CA: "🇨🇦",
  GB: "🇬🇧",
  DE: "🇩🇪",
  FR: "🇫🇷",
  IT: "🇮🇹",
  ES: "🇪🇸",
  JP: "🇯🇵",
  KR: "🇰🇷",
  CN: "🇨🇳",
  IN: "🇮🇳",
  AU: "🇦🇺",
  BR: "🇧🇷",
  MX: "🇲🇽",
};

interface PhoneInputProps {
  value: string;
  onChangeText: (phone: string) => void;
  countryCode: string;
  onCountryChange: (countryCode: string) => void;
  placeholder?: string;
  error?: string | undefined;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
}

export function PhoneInput({
  value,
  onChangeText,
  countryCode,
  onCountryChange,
  placeholder = "Phone number",
  error,
  disabled = false,
  autoFocus = false,
  onSubmitEditing,
}: PhoneInputProps) {
  const s = useStyles(createPhoneInputStyles(error));

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const selectedCountry = COUNTRIES.find((c) => c.dialCode === countryCode) ?? COUNTRIES[0];

  // Format phone number as user types
  const formatPhoneNumber = (text: string) => {
    const digits = text.replace(/\D/g, "");

    // Apply US/CA formatting for +1 numbers
    if (countryCode === "+1" && digits.length >= 3) {
      if (digits.length <= 3) {
        return `(${digits}`;
      } else if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      }
    }

    // Apply Korean formatting for +82 numbers
    if (countryCode === "+82" && digits.length >= 3) {
      const cleanDigits = digits.replace(/^0+/, "");

      if (cleanDigits.length <= 2) {
        return cleanDigits;
      } else if (cleanDigits.length <= 6) {
        return `${cleanDigits.slice(0, 2)}-${cleanDigits.slice(2)}`;
      } else if (cleanDigits.length <= 10) {
        return `${cleanDigits.slice(0, 2)}-${cleanDigits.slice(2, 6)}-${cleanDigits.slice(6)}`;
      } else {
        return `${cleanDigits.slice(0, 3)}-${cleanDigits.slice(3, 7)}-${cleanDigits.slice(7, 11)}`;
      }
    }

    return digits;
  };

  const handleTextChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    onChangeText(formatted);
  };

  const handleCountrySelect = (country: Country) => {
    onCountryChange(country.dialCode);
    setShowCountryPicker(false);
    onChangeText("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    const fullNumber = `${countryCode}${digits}`;
    return VALIDATION_PATTERNS.PHONE.test(fullNumber);
  };

  const isValid = value.length > 0 ? validatePhone(value) : true;

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity style={s.countryItem} onPress={() => handleCountrySelect(item)}>
      <Text style={s.flag}>{FLAG_EMOJI[item.code]}</Text>
      <View style={s.countryInfo}>
        <Text style={s.countryName}>{item.name}</Text>
        <Text style={s.dialCode}>{item.dialCode}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Box style={s.container}>
      <View style={[s.inputContainer, disabled && s.inputContainerDisabled]}>
        <TouchableOpacity
          style={s.countrySelector}
          onPress={() => !disabled && setShowCountryPicker(true)}
          disabled={disabled}
        >
          <Text style={s.flag}>{FLAG_EMOJI[selectedCountry?.code ?? "US"]}</Text>
          <Text style={s.countryCodeText}>{selectedCountry?.dialCode}</Text>
          <Text style={s.chevron}>▼</Text>
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={s.input}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={s.dialCode.color}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          blurOnSubmit={false}
          autoFocus={autoFocus}
          editable={!disabled}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="done"
        />
      </View>

      {error && <Text style={s.errorText}>{error}</Text>}

      {!isValid && !error && value.length > 0 && (
        <Text style={s.errorText}>Please enter a valid phone number</Text>
      )}

      <Modal
        visible={showCountryPicker}
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <Box style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setShowCountryPicker(false)} style={s.closeButton}>
              <Text style={s.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={COUNTRIES}
            renderItem={renderCountryItem}
            keyExtractor={(item) => item.code}
            style={s.countryList}
          />
        </Box>
      </Modal>
    </Box>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const createPhoneInputStyles = (error?: string | undefined) =>
  createStyles((colors) => ({
    container: {
      width: "100%" as const,
    },
    inputContainer: {
      flexDirection: "row" as const,
      borderWidth: tokens.borderWidth.default,
      borderRadius: tokens.radius.md,
      overflow: "hidden" as const,
      minHeight: tokens.size.touchTarget.lg,
      borderColor: error ? colors.status.error : colors.border.default,
      backgroundColor: colors.bg.secondary,
    },
    inputContainerDisabled: {
      opacity: tokens.opacity.disabled,
    },
    countrySelector: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: tokens.spacing.component.lg,
      borderRightWidth: tokens.borderWidth.default,
      borderRightColor: colors.border.default,
      minWidth: 100,
    },
    flag: {
      fontSize: 20,
      marginRight: tokens.spacing.component.sm,
    },
    countryCodeText: {
      fontSize: tokens.typography.fontSize.body,
      fontWeight: tokens.typography.fontWeight.medium,
      color: colors.text.primary,
      marginRight: tokens.spacing.component.xs,
    },
    chevron: {
      fontSize: 10,
      color: colors.text.secondary,
      transform: [{ scaleY: 0.6 }],
    },
    input: {
      flex: 1,
      paddingHorizontal: tokens.spacing.component.lg,
      paddingVertical: tokens.spacing.component.lg,
      fontSize: tokens.typography.fontSize.body,
      color: colors.text.primary,
    },
    errorText: {
      fontSize: tokens.typography.fontSize.caption,
      color: colors.status.error,
      marginTop: tokens.spacing.component.sm,
      marginLeft: tokens.spacing.component.xs,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.bg.primary,
    },
    modalHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      padding: tokens.spacing.component.lg,
      paddingTop: tokens.spacing.layout.xl,
      borderBottomWidth: tokens.borderWidth.default,
      borderBottomColor: colors.border.default,
    },
    modalTitle: {
      fontSize: tokens.typography.fontSize.h3,
      fontWeight: tokens.typography.fontWeight.semibold,
      color: colors.text.primary,
    },
    closeButton: {
      padding: tokens.spacing.component.sm,
    },
    closeButtonText: {
      fontSize: tokens.typography.fontSize.body,
      fontWeight: tokens.typography.fontWeight.semibold,
      color: colors.interactive.primary,
    },
    countryList: {
      flex: 1,
    },
    countryItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      padding: tokens.spacing.component.lg,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border.divider,
    },
    countryInfo: {
      marginLeft: tokens.spacing.component.md,
      flex: 1,
    },
    countryName: {
      fontSize: tokens.typography.fontSize.body,
      fontWeight: tokens.typography.fontWeight.medium,
      color: colors.text.primary,
      marginBottom: 2,
    },
    dialCode: {
      fontSize: tokens.typography.fontSize.bodySmall,
      color: colors.text.secondary,
    },
  }));
