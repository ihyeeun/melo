export const colors = {
  coral: {
    50: "#FFF4ED",
    100: "#FFE6D4",
    200: "#FFC9A9",
    300: "#FDA87B",
    400: "#FF9861",
    500: "#ED8240",
    600: "#CF5C27",
    700: "#AC4622",
    800: "#893923",
    900: "#6F311F",
    950: "#3C170E",
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
    default: "#fff",
    selected: colors.coral[100],
    gray_1: colors.gray[50],
    gray_2: colors.gray[100],
    dark: colors.gray[950],
  },

  text: {
    primary: colors.gray[900],
    secondary: colors.gray[700],
    tertiary: colors.gray[500],
    disabled: colors.gray[400],
    white: "#fff",
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

  btn: {
    default: colors.coral[400],
    disabled: colors.gray[200],
  },
} as const;
