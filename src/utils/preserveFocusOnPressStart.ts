import { Platform } from "react-native";

interface PreventableEvent {
  preventDefault(): void;
}

export const preserveFocusOnPressStart =
  Platform.OS === "web"
    ? {
        onMouseDown: (event: PreventableEvent) => event.preventDefault(),
        onPointerDown: (event: PreventableEvent) => event.preventDefault(),
        onTouchStart: (event: PreventableEvent) => event.preventDefault()
      }
    : undefined;
