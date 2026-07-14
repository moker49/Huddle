import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text, TextInput, useTheme } from "react-native-paper";

import { spacing, shape } from "@/theme/tokens";

interface TopicFormLayoutProps {
  autoArchiveField: ReactNode;
  children: ReactNode;
  memberError: boolean;
  memberSearchValue: string;
  onChangeMemberSearch: (value: string) => void;
  onClearMemberSearch: () => void;
  onChangeTitle: (value: string) => void;
  selectedMemberCount: number;
  titleError: boolean;
  titleMaxLength: number;
  titleValue: string;
}

export function TopicFormLayout({
  autoArchiveField,
  children,
  memberError,
  memberSearchValue,
  onChangeMemberSearch,
  onClearMemberSearch,
  onChangeTitle,
  selectedMemberCount,
  titleError,
  titleMaxLength,
  titleValue
}: TopicFormLayoutProps) {
  const theme = useTheme();

  return (
    <>
      <View style={styles.group}>
        <View
          style={[
            styles.card,
            styles.firstCard,
            { backgroundColor: theme.colors.elevation.level2 }
          ]}
        >
          <TextInput
            mode="outlined"
            label="Title"
            value={titleValue}
            onChangeText={onChangeTitle}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="next"
            error={titleError}
            maxLength={titleMaxLength}
            accessibilityLabel="Huddle title"
            style={styles.titleField}
            right={
              titleValue ? (
                <TextInput.Icon
                  icon="close"
                  onPress={() => onChangeTitle("")}
                  accessibilityLabel="Clear title"
                />
              ) : undefined
            }
          />
          {autoArchiveField}
        </View>
        <View
          style={[
            styles.card,
            styles.lastCard,
            { backgroundColor: theme.colors.elevation.level2 }
          ]}
        >
          <View style={styles.membersHeader}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
              Members
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {selectedMemberCount} selected
            </Text>
          </View>
          <View style={[styles.memberSearchShell, { backgroundColor: theme.colors.surfaceVariant }]}>
            <TextInput
              mode="flat"
              dense
              value={memberSearchValue}
              onChangeText={onChangeMemberSearch}
              placeholder="Search network"
              autoCapitalize="words"
              accessibilityLabel="Search your network"
              error={memberError}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              left={<TextInput.Icon icon="magnify" />}
              right={
                memberSearchValue ? (
                  <TextInput.Icon
                    icon="close"
                    onPress={onClearMemberSearch}
                    accessibilityLabel="Clear member search"
                  />
                ) : undefined
              }
              style={styles.memberSearch}
            />
          </View>
          {children}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  group: {
    flex: 1,
    gap: spacing.xxs
  },
  card: {
    padding: spacing.sm
  },
  firstCard: {
    borderTopLeftRadius: shape.large,
    borderTopRightRadius: shape.large,
    borderBottomLeftRadius: spacing.xxs,
    borderBottomRightRadius: spacing.xxs,
    flexDirection: "row",
    gap: spacing.xs
  },
  lastCard: {
    flex: 1,
    borderTopLeftRadius: spacing.xxs,
    borderTopRightRadius: spacing.xxs,
    borderBottomLeftRadius: shape.large,
    borderBottomRightRadius: shape.large,
    gap: spacing.xs
  },
  titleField: {
    flex: 1
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  memberSearchShell: {
    height: 56,
    borderRadius: 28,
    overflow: "hidden"
  },
  memberSearch: {
    height: 56,
    backgroundColor: "transparent"
  }
});
