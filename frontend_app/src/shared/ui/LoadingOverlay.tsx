import { ActivityIndicator, StyleSheet, View } from "react-native";
import { semantic } from "@/src/shared/styles";
import { Typo } from "@/src/shared/ui/Typography";

type LoadingOverlayProps = {
  visible?: boolean;
  message?: string;
  color?: string;
  backgroundColor?: string;
  pointerEvents?: "auto" | "none";
};

export function LoadingOverlay({
  visible = true,
  message,
  color = semantic.primary.normal,
  backgroundColor = semantic.background.default,
  pointerEvents = "auto",
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View pointerEvents={pointerEvents} style={[styles.overlay, { backgroundColor }]}>
      <ActivityIndicator size="small" color={color} />
      {message ? (
        <Typo size="body-s-regular" color="primary" style={styles.message}>
          {message}
        </Typo>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  message: {
    marginTop: 8,
    textAlign: "center",
  },
});
