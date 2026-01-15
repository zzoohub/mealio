/**
 * Development tools for i18n management
 * These tools help with translation management, validation, and debugging
 */

import type { TranslationResources } from "./types";

// Color codes for console output
const COLORS = {
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  RESET: "\x1b[0m",
} as const;

/**
 * Validates translation completeness between languages
 */
export const validateTranslationCompleteness = (
  enTranslations: TranslationResources,
  koTranslations: TranslationResources,
) => {
  if (!__DEV__) return;

  console.log(`${COLORS.BLUE}🌐 Validating translation completeness...${COLORS.RESET}`);

  const issues: string[] = [];

  // Check each namespace
  Object.keys(enTranslations).forEach(namespace => {
    const nsKey = namespace as keyof TranslationResources;
    const enNs = enTranslations[nsKey];
    const koNs = koTranslations[nsKey];

    if (!koNs) {
      issues.push(`${COLORS.RED}❌ Missing Korean namespace: ${namespace}${COLORS.RESET}`);
      return;
    }

    // Recursively check keys
    const checkKeys = (enObj: any, koObj: any, path: string = "") => {
      Object.keys(enObj).forEach(key => {
        const currentPath = path ? `${path}.${key}` : key;
        const fullPath = `${namespace}.${currentPath}`;

        if (!(key in koObj)) {
          issues.push(`${COLORS.YELLOW}⚠️  Missing Korean key: ${fullPath}${COLORS.RESET}`);
        } else if (typeof enObj[key] === "object" && enObj[key] !== null) {
          if (typeof koObj[key] !== "object" || koObj[key] === null) {
            issues.push(`${COLORS.RED}❌ Type mismatch at: ${fullPath}${COLORS.RESET}`);
          } else {
            checkKeys(enObj[key], koObj[key], currentPath);
          }
        }
      });
    };

    checkKeys(enNs, koNs);
  });

  if (issues.length === 0) {
    console.log(`${COLORS.GREEN}✅ All translations are complete!${COLORS.RESET}`);
  } else {
    console.log(`${COLORS.YELLOW}Found ${issues.length} translation issues:${COLORS.RESET}`);
    issues.forEach(issue => console.log(issue));
  }

  return issues;
};

/**
 * Extracts all translation keys from TypeScript files
 */
export const extractTranslationKeys = (sourceCode: string): string[] => {
  if (!__DEV__) return [];

  const keyRegex = /(?:t|translate)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const keys: string[] = [];
  let match;

  while ((match = keyRegex.exec(sourceCode)) !== null) {
    const capturedKey = match[1];
    if (typeof capturedKey === "string") {
      keys.push(capturedKey);
    }
  }

  return [...new Set(keys)]; // Remove duplicates
};

/**
 * Finds unused translation keys
 */
export const findUnusedKeys = (translations: TranslationResources, sourceFiles: Record<string, string>): string[] => {
  if (!__DEV__) return [];

  const allKeys: string[] = [];

  // Extract all keys from translations
  const extractKeys = (obj: any, prefix: string = "") => {
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        extractKeys(obj[key], fullKey);
      } else {
        allKeys.push(fullKey);
      }
    });
  };

  Object.keys(translations).forEach(namespace => {
    const nsKey = namespace as keyof TranslationResources;
    extractKeys(translations[nsKey], namespace);
  });

  // Extract all keys used in source files
  const usedKeys = new Set<string>();
  Object.values(sourceFiles).forEach(sourceCode => {
    const extractedKeys = extractTranslationKeys(sourceCode);
    extractedKeys.forEach(key => usedKeys.add(key));
  });

  // Find unused keys
  const unusedKeys = allKeys.filter(key => !usedKeys.has(key));

  if (unusedKeys.length > 0) {
    console.log(`${COLORS.YELLOW}🗑️  Found ${unusedKeys.length} unused translation keys:${COLORS.RESET}`);
    unusedKeys.forEach(key => console.log(`${COLORS.YELLOW}   - ${key}${COLORS.RESET}`));
  } else {
    console.log(`${COLORS.GREEN}✅ No unused translation keys found!${COLORS.RESET}`);
  }

  return unusedKeys;
};

/**
 * Finds missing translation keys in source code
 */
export const findMissingKeys = (translations: TranslationResources, sourceFiles: Record<string, string>): string[] => {
  if (!__DEV__) return [];

  const allKeys = new Set<string>();

  // Extract all available keys
  const extractKeys = (obj: any, prefix: string = "") => {
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        extractKeys(obj[key], fullKey);
      } else {
        allKeys.add(fullKey);
      }
    });
  };

  Object.keys(translations).forEach(namespace => {
    const nsKey = namespace as keyof TranslationResources;
    extractKeys(translations[nsKey], namespace);
  });

  // Find missing keys
  const missingKeys: string[] = [];
  Object.values(sourceFiles).forEach(sourceCode => {
    const usedKeys = extractTranslationKeys(sourceCode);
    usedKeys.forEach(key => {
      if (!allKeys.has(key)) {
        missingKeys.push(key);
      }
    });
  });

  const uniqueMissingKeys = [...new Set(missingKeys)];

  if (uniqueMissingKeys.length > 0) {
    console.log(`${COLORS.RED}❌ Found ${uniqueMissingKeys.length} missing translation keys:${COLORS.RESET}`);
    uniqueMissingKeys.forEach(key => console.log(`${COLORS.RED}   - ${key}${COLORS.RESET}`));
  } else {
    console.log(`${COLORS.GREEN}✅ All used keys have translations!${COLORS.RESET}`);
  }

  return uniqueMissingKeys;
};

/**
 * Generates TypeScript interfaces from translation objects
 */
export const generateTypeDefinitions = (translations: TranslationResources): string => {
  if (!__DEV__) return "";

  const generateInterface = (obj: any, interfaceName: string): string => {
    let result = `export interface ${interfaceName} {\n`;

    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        const nestedInterfaceName = `${interfaceName}${key.charAt(0).toUpperCase() + key.slice(1)}`;
        result += `  ${key}: ${nestedInterfaceName};\n`;
      } else {
        result += `  ${key}: string;\n`;
      }
    });

    result += "}\n\n";
    return result;
  };

  let output = "// Auto-generated TypeScript interfaces for translations\n\n";

  Object.keys(translations).forEach(namespace => {
    const nsKey = namespace as keyof TranslationResources;
    const interfaceName = `${namespace.charAt(0).toUpperCase() + namespace.slice(1)}Translations`;

    // Generate nested interfaces first
    const generateNestedInterfaces = (obj: any, prefix: string): string => {
      let nested = "";
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          const nestedName = `${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}`;
          nested += generateInterface(obj[key], nestedName);
          nested += generateNestedInterfaces(obj[key], nestedName);
        }
      });
      return nested;
    };

    output += generateNestedInterfaces(translations[nsKey], interfaceName);
    output += generateInterface(translations[nsKey], interfaceName);
  });

  return output;
};

/**
 * Translation statistics
 */
export const getTranslationStats = (translations: TranslationResources) => {
  if (!__DEV__) return null;

  const stats = {
    namespaces: 0,
    totalKeys: 0,
    keysByNamespace: {} as Record<string, number>,
    averageKeyLength: 0,
    longestKey: "",
    shortestKey: "",
  };

  let totalLength = 0;
  let allKeys: string[] = [];

  const countKeys = (obj: any, prefix: string = ""): number => {
    let count = 0;
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        count += countKeys(obj[key], fullKey);
      } else {
        count++;
        allKeys.push(fullKey);
        totalLength += obj[key].length;
      }
    });
    return count;
  };

  Object.keys(translations).forEach(namespace => {
    const nsKey = namespace as keyof TranslationResources;
    const keyCount = countKeys(translations[nsKey], namespace);
    stats.keysByNamespace[namespace] = keyCount;
    stats.totalKeys += keyCount;
    stats.namespaces++;
  });

  stats.averageKeyLength = Math.round(totalLength / stats.totalKeys);
  stats.longestKey = allKeys.reduce((a, b) => (a.length > b.length ? a : b), "");
  stats.shortestKey = allKeys.reduce((a, b) => (a.length < b.length ? a : b), allKeys[0] || "");

  console.log(`${COLORS.BLUE}📊 Translation Statistics:${COLORS.RESET}`);
  console.log(`   Namespaces: ${stats.namespaces}`);
  console.log(`   Total Keys: ${stats.totalKeys}`);
  console.log(`   Average Key Length: ${stats.averageKeyLength} characters`);
  console.log(`   Longest Key: ${stats.longestKey}`);
  console.log(`   Shortest Key: ${stats.shortestKey}`);
  console.log(`   Keys by Namespace:`);
  Object.entries(stats.keysByNamespace).forEach(([ns, count]) => {
    console.log(`     - ${ns}: ${count} keys`);
  });

  return stats;
};

/**
 * Validates translation key patterns
 */
export const validateKeyPatterns = (translations: TranslationResources): string[] => {
  if (!__DEV__) return [];

  const issues: string[] = [];
  const patterns = {
    camelCase: /^[a-z][a-zA-Z0-9]*$/,
    noSpecialChars: /^[a-zA-Z0-9.]+$/,
    noConsecutiveDots: /\.{2,}/,
    noStartEndDots: /^\.|\.$/,
  };

  const checkKeys = (obj: any, prefix: string = "") => {
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // Check key patterns
      if (!patterns.camelCase.test(key)) {
        issues.push(`Non-camelCase key: ${fullKey}`);
      }

      if (patterns.noConsecutiveDots.test(fullKey)) {
        issues.push(`Consecutive dots in key: ${fullKey}`);
      }

      if (patterns.noStartEndDots.test(fullKey)) {
        issues.push(`Key starts or ends with dot: ${fullKey}`);
      }

      if (typeof obj[key] === "object" && obj[key] !== null) {
        checkKeys(obj[key], fullKey);
      }
    });
  };

  Object.keys(translations).forEach(namespace => {
    const nsKey = namespace as keyof TranslationResources;
    checkKeys(translations[nsKey], namespace);
  });

  if (issues.length > 0) {
    console.log(`${COLORS.YELLOW}⚠️  Found ${issues.length} key pattern issues:${COLORS.RESET}`);
    issues.forEach(issue => console.log(`${COLORS.YELLOW}   - ${issue}${COLORS.RESET}`));
  } else {
    console.log(`${COLORS.GREEN}✅ All keys follow proper patterns!${COLORS.RESET}`);
  }

  return issues;
};
