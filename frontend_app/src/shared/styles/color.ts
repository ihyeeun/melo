export const colors = {
  coral: {
    50: "#fff4f1",
    100: "#ffe7e1",
    200: "#ffd2c7",
    300: "#ffb3a0",
    400: "#ff8465",
    500: "#f8623b",
    600: "#df5222",
    700: "#c13714",
    800: "#a03014",
    900: "#842e18",
    950: "#481407",
  },

  navy: {
    50: "#f5f7fa",
    100: "#e9edf5",
    200: "#cedae9",
    300: "#a3bad6",
    400: "#7296be",
    500: "#5079a7",
    600: "#3d608c",
    700: "#334d71",
    800: "#2d435f",
    900: "#2a3a50",
    950: "#1f2a3c",
  },

  gray: {
    50: "#f5f5f6",
    100: "#f0f0f1",
    200: "#e5e6e8",
    300: "#cdcfd4",
    400: "#aaaeb6",
    500: "#777d88",
    600: "#565a64",
    700: "#4a4d54",
    800: "#414349",
    900: "#3a3b3f",
    950: "#242528",
  },
} as const;

export const semantic = {
  background: {
    default: colors.coral[400],
    selected: colors.gray[200],
    gray1: colors.gray[50],
    gray2: colors.gray[100],
    dark: colors.gray[950],
  },

  text: {
    primary: colors.gray[900],
    secondary: colors.gray[700],
    tertiary: colors.gray[500],
    disabled: colors.gray[400],
    accent: colors.gray[950],
  },

  primary: {
    normal: colors.coral[500],
  },

  border: {
    strong: colors.coral[500],
    default: colors.gray[200],
    subtle: colors.gray[100],
  },

  dimmer: {
    default: "rgba(0, 0, 0, 0.6)",
  },
} as const;
