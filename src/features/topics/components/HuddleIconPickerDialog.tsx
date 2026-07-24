import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Button, Dialog, Icon, Portal, Searchbar, Text, useTheme } from "react-native-paper";

import { HuddleIcon } from "@/features/topics/components/HuddleIcon";
import { shape, spacing } from "@/theme/tokens";

interface HuddleIconPickerDialogProps {
  icon?: string;
  onDismiss: () => void;
  onSelect: (icon: string | undefined) => void;
  title: string;
  visible: boolean;
}

const availableIcons = Object.keys(MaterialCommunityIcons.glyphMap).sort();

export function HuddleIconPickerDialog({
  icon,
  onDismiss,
  onSelect,
  title,
  visible
}: HuddleIconPickerDialogProps) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingIcons = useMemo(() => (
    normalizedQuery
      ? availableIcons.filter((name) => name.includes(normalizedQuery))
      : availableIcons
  ), [normalizedQuery]);

  function selectIcon(nextIcon: string | undefined) {
    onSelect(nextIcon);
    setQuery("");
  }

  function dismiss() {
    setQuery("");
    onDismiss();
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={dismiss} style={styles.dialog}>
        <Dialog.Title>Choose huddle icon</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <View style={styles.previewRow}>
            <HuddleIcon
              icon={icon}
              label={title || "H"}
              size={48}
              backgroundColor={theme.colors.primaryContainer}
              color={theme.colors.onPrimaryContainer}
            />
            <Button icon="format-letter-case" onPress={() => selectIcon(undefined)}>
              Use title initial
            </Button>
          </View>
          <Searchbar
            placeholder="Search icons"
            value={query}
            onChangeText={setQuery}
            onClearIconPress={() => setQuery("")}
            accessibilityLabel="Search huddle icons"
          />
          <FlatList
            data={matchingIcons}
            keyExtractor={(item) => item}
            numColumns={5}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.iconGrid}
            style={styles.iconList}
            renderItem={({ item }) => {
              const isSelected = item === icon;

              return (
                <Pressable
                  onPress={() => selectIcon(item)}
                  accessibilityLabel={`Use ${item} icon`}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.iconOption,
                    {
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
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={dismiss}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxHeight: "84%"
  },
  content: {
    gap: spacing.md
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  iconList: {
    maxHeight: 312
  },
  iconGrid: {
    gap: spacing.xxs,
    paddingBottom: spacing.xs
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: shape.medium,
    alignItems: "center",
    justifyContent: "center"
  }
});
