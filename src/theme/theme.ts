import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts
} from "react-native-paper";

const fontConfig = {
  displayLarge: { fontFamily: "System" },
  displayMedium: { fontFamily: "System" },
  displaySmall: { fontFamily: "System" },
  headlineLarge: { fontFamily: "System" },
  headlineMedium: { fontFamily: "System" },
  headlineSmall: { fontFamily: "System" },
  titleLarge: { fontFamily: "System" },
  titleMedium: { fontFamily: "System" },
  titleSmall: { fontFamily: "System" },
  bodyLarge: { fontFamily: "System" },
  bodyMedium: { fontFamily: "System" },
  bodySmall: { fontFamily: "System" },
  labelLarge: { fontFamily: "System" },
  labelMedium: { fontFamily: "System" },
  labelSmall: { fontFamily: "System" }
} as const;

const animation = {
  scale: 0.45
} as const;

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#006A60",
    onPrimary: "#FFFFFF",
    primaryContainer: "#9EF2E3",
    onPrimaryContainer: "#00201C",
    secondary: "#4A635F",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#CCE8E2",
    onSecondaryContainer: "#05201C"
  },
  fonts: configureFonts({ config: fontConfig }),
  animation
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#82D5C7",
    onPrimary: "#003731",
    primaryContainer: "#005048",
    onPrimaryContainer: "#9EF2E3",
    secondary: "#B1CCC6",
    onSecondary: "#1C3531",
    secondaryContainer: "#334B47",
    onSecondaryContainer: "#CCE8E2"
  },
  fonts: configureFonts({ config: fontConfig }),
  animation
};
