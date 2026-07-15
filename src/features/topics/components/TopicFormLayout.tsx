import { ReactNode } from "react";
import { StyleSheet, TextInput as NativeTextInput, View } from "react-native";
import { Icon, IconButton, TextInput, useTheme } from "react-native-paper";

import { AutoArchiveDateField } from "@/features/topics/components/AutoArchiveDateField";
import { spacing, shape } from "@/theme/tokens";

interface TopicFormLayoutProps {
  autoArchiveError: boolean;
  autoArchiveValue: string;
  children: ReactNode;
  titleAutoFocus?: boolean;
  memberError: boolean;
  memberSearchValue: string;
  onChangeMemberSearch: (value: string) => void;
  onChangeAutoArchive: (value: string) => void;
  onClearMemberSearch: () => void;
  onChangeTitle: (value: string) => void;
  titleError: boolean;
  titleMaxLength: number;
  titleValue: string;
}

export function TopicFormLayout({
  autoArchiveError,
  autoArchiveValue,
  children,
  titleAutoFocus = true,
  memberError,
  memberSearchValue,
  onChangeMemberSearch,
  onChangeAutoArchive,
  onClearMemberSearch,
  onChangeTitle,
  titleError,
  titleMaxLength,
  titleValue
}: TopicFormLayoutProps) {
  const theme = useTheme();
  const propertyCardColor = theme.colors.elevation.level2;
  const propertyFieldTheme = {
    colors: {
      background: propertyCardColor,
      surfaceVariant: propertyCardColor
    }
  };

  return (
    <>
      <View style={styles.group}>
        <View
          style={[
            styles.card,
            styles.firstCard,
            { backgroundColor: propertyCardColor }
          ]}
        >
          <TextInput
            mode="outlined"
            label="Title"
            value={titleValue}
            onChangeText={onChangeTitle}
            autoFocus={titleAutoFocus}
            autoCapitalize="sentences"
            returnKeyType="next"
            error={titleError}
            maxLength={titleMaxLength}
            accessibilityLabel="Huddle title"
            style={styles.titleField}
            theme={propertyFieldTheme}
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
          <AutoArchiveDateField
            error={autoArchiveError}
            value={autoArchiveValue}
            onChange={onChangeAutoArchive}
            themeOverride={propertyFieldTheme}
          />
        </View>
        <View
          style={[
            styles.card,
            styles.lastCard,
            { backgroundColor: theme.colors.elevation.level2 }
          ]}
        >
          <View style={[styles.memberSearchShell, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon
              source="magnify"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
            <NativeTextInput
              value={memberSearchValue}
              onChangeText={onChangeMemberSearch}
              placeholder="Search your network"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              autoCapitalize="words"
              accessibilityLabel="Search your network"
              style={[
                styles.memberSearch,
                { color: theme.colors.onSurface },
                memberError ? { color: theme.colors.error } : undefined
              ]}
            />
            {memberSearchValue ? (
              <IconButton
                icon="close"
                size={24}
                onPress={onClearMemberSearch}
                accessibilityLabel="Clear member search"
                iconColor={theme.colors.onSurfaceVariant}
                style={styles.memberSearchClear}
              />
            ) : null}
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
    padding: spacing.md
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
    borderTopLeftRadius: spacing.xxs,
    borderTopRightRadius: spacing.xxs,
    borderBottomLeftRadius: shape.large,
    borderBottomRightRadius: shape.large,
    gap: spacing.xs
  },
  titleField: {
    flex: 1
  },
  memberSearchShell: {
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingLeft: spacing.md,
    overflow: "hidden"
  },
  memberSearch: {
    flex: 1,
    height: 56,
    padding: spacing.none,
    fontSize: 16,
    backgroundColor: "transparent"
  },
  memberSearchClear: {
    width: 48,
    height: 48,
    margin: spacing.none
  }
});
