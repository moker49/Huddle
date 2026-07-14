import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { TextInput, useTheme } from "react-native-paper";

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
    overflow: "hidden"
  },
  memberSearch: {
    height: 56,
    backgroundColor: "transparent"
  }
});
