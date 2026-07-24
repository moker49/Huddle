import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput as NativeTextInput,
  useWindowDimensions,
  View
} from "react-native";
import { Button, Dialog, Icon, IconButton, Portal, Text, useTheme } from "react-native-paper";

import { shape, spacing } from "@/theme/tokens";
import { preserveFocusOnPressStart } from "@/utils/preserveFocusOnPressStart";

interface HuddleIconPickerDialogProps {
  icon?: string;
  onDismiss: () => void;
  onSelect: (icon: string | undefined) => void;
  visible: boolean;
}

const availableIcons = Object.keys(MaterialCommunityIcons.glyphMap).sort();
const iconOptionMaxWidth = 56;
const iconOptionGap = spacing.xxs;
const webInputFocusReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as object)
  : undefined;

export function HuddleIconPickerDialog({
  icon,
  onDismiss,
  onSelect,
  visible
}: HuddleIconPickerDialogProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [gridWidth, setGridWidth] = useState(0);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingIcons = useMemo(() => (
    normalizedQuery
      ? availableIcons.filter((name) => name.includes(normalizedQuery))
      : availableIcons
  ), [normalizedQuery]);

  function dismiss() {
    setQuery("");
    onDismiss();
  }

  const columnCount = getColumnCount(gridWidth);
  const iconOptionWidth = getIconOptionWidth(gridWidth, columnCount);
  const iconListMaxHeight = Math.max(48, Math.min(312, windowHeight - 280));

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={dismiss}
        style={[styles.dialog, { maxHeight: windowHeight - spacing.lg * 2 }]}
      >
        <Dialog.Title>Choose huddle icon</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <View style={[styles.searchShell, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon source="magnify" size={24} color={theme.colors.onSurfaceVariant} />
            <NativeTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search icons"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              accessibilityLabel="Search huddle icons"
              style={[styles.searchInput, webInputFocusReset, { color: theme.colors.onSurface }]}
            />
            {query ? (
              <IconButton
                {...preserveFocusOnPressStart}
                icon="close"
                size={24}
                onPress={() => setQuery("")}
                accessibilityLabel="Clear icon search"
                focusable={false}
                iconColor={theme.colors.onSurfaceVariant}
                style={styles.clearSearchButton}
              />
            ) : null}
          </View>
          <View
            style={styles.gridContainer}
            onLayout={(event) => {
              const nextWidth = event.nativeEvent.layout.width;

              setGridWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
            }}
          >
            <FlatList
              key={columnCount}
              data={matchingIcons}
              keyExtractor={(item) => item}
              numColumns={columnCount}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.iconGrid}
              columnWrapperStyle={columnCount > 1 ? styles.iconRow : undefined}
              style={[styles.iconList, { maxHeight: iconListMaxHeight }]}
              renderItem={({ item }) => {
                const isSelected = item === icon;

                return (
                  <Pressable
                    onPress={() => onSelect(item)}
                    accessibilityLabel={`Use ${item} icon`}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.iconOption,
                      {
                        width: iconOptionWidth,
                        backgroundColor: isSelected
                          ? theme.colors.secondaryContainer
                          : pressed
                            ? theme.colors.surfaceVariant
                            : "transparent"
                      }
                    ]}
                  >
                    <Icon
                      source={item}
                      size={24}
                      color={isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurface}
                    />
                  </Pressable>
                );
              }}
              ListEmptyComponent={(
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No matching icons.
                </Text>
              )}
            />
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => onSelect(undefined)}>Reset</Button>
          <Button onPress={dismiss}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function getColumnCount(gridWidth: number) {
  if (gridWidth <= 0) {
    return 1;
  }

  return Math.max(1, Math.floor((gridWidth + iconOptionGap) / (iconOptionMaxWidth + iconOptionGap)));
}

function getIconOptionWidth(gridWidth: number, columnCount: number) {
  if (gridWidth <= 0) {
    return iconOptionMaxWidth;
  }

  return (gridWidth - iconOptionGap * (columnCount - 1)) / columnCount;
}

const styles = StyleSheet.create({
  dialog: {
    flexShrink: 1
  },
  content: {
    gap: spacing.md
  },
  searchShell: {
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingLeft: spacing.md,
    overflow: "hidden"
  },
  searchInput: {
    flex: 1,
    height: 56,
    padding: spacing.none,
    fontSize: 16,
    backgroundColor: "transparent"
  },
  clearSearchButton: {
    width: 48,
    height: 48,
    margin: spacing.none
  },
  gridContainer: {
    flexShrink: 1
  },
  iconList: {
    flexGrow: 0,
    flexShrink: 1
  },
  iconGrid: {
    gap: iconOptionGap,
    paddingBottom: spacing.xs
  },
  iconRow: {
    gap: iconOptionGap
  },
  iconOption: {
    height: 48,
    borderRadius: shape.medium,
    alignItems: "center",
    justifyContent: "center"
  }
});
