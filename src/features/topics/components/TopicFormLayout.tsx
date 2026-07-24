import { ReactNode, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { TextInput, useTheme } from "react-native-paper";

import {
  NetworkMemberSection,
  networkMemberSectionStyles
} from "@/features/connections/components/NetworkMemberSection";
import { AutoArchiveDateField } from "@/features/topics/components/AutoArchiveDateField";
import { HuddleIcon } from "@/features/topics/components/HuddleIcon";
import { HuddleIconPickerDialog } from "@/features/topics/components/HuddleIconPickerDialog";
import { spacing, shape } from "@/theme/tokens";

interface TopicFormLayoutProps {
  autoArchiveError: boolean;
  autoArchiveValue: string;
  children: ReactNode;
  icon?: string;
  titleAutoFocus?: boolean;
  memberError: boolean;
  memberSearchValue: string;
  memberSearchVisible?: boolean;
  onChangeMemberSearch: (value: string) => void;
  onChangeIcon: (icon: string | undefined) => void;
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
  icon,
  titleAutoFocus = true,
  memberError,
  memberSearchValue,
  memberSearchVisible = true,
  onChangeMemberSearch,
  onChangeIcon,
  onChangeAutoArchive,
  onClearMemberSearch,
  onChangeTitle,
  titleError,
  titleMaxLength,
  titleValue
}: TopicFormLayoutProps) {
  const theme = useTheme();
  const [iconPickerIsVisible, setIconPickerIsVisible] = useState(false);
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
          <Pressable
            onPress={() => setIconPickerIsVisible(true)}
            accessibilityLabel="Choose huddle icon"
            accessibilityRole="button"
            style={styles.iconButton}
          >
            <HuddleIcon
              icon={icon}
              label={titleValue || "H"}
              size={48}
              backgroundColor={theme.colors.primaryContainer}
              color={theme.colors.onPrimaryContainer}
            />
          </Pressable>
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
                  forceTextInputFocus={false}
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
        <NetworkMemberSection
          searchHasError={memberError}
          searchValue={memberSearchValue}
          searchVisible={memberSearchVisible}
          onChangeSearch={onChangeMemberSearch}
          onClearSearch={onClearMemberSearch}
          style={networkMemberSectionStyles.lastCard}
        >
          {children}
        </NetworkMemberSection>
      </View>
      <HuddleIconPickerDialog
        icon={icon}
        visible={iconPickerIsVisible}
        onDismiss={() => setIconPickerIsVisible(false)}
        onSelect={onChangeIcon}
      />
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
  titleField: {
    flex: 1
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xxs
  }
});
