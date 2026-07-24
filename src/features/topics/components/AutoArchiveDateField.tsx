import { ComponentProps, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  IconButton,
  Portal,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";

import { spacing } from "@/theme/tokens";

interface AutoArchiveDateFieldProps {
  error: boolean;
  onChange: (value: string) => void;
  themeOverride?: ComponentProps<typeof TextInput>["theme"];
  value: string;
}

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"] as const;
const weekdayAccessibilityLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
] as const;
const fieldWidth = 168;

export function AutoArchiveDateField({
  error,
  onChange,
  themeOverride,
  value
}: AutoArchiveDateFieldProps) {
  const theme = useTheme();
  const selectedDate = parseDateInputValue(value);
  const displayValue = formatDisplayValue(selectedDate);
  const [dialogIsVisible, setDialogIsVisible] = useState(false);
  const [draftDate, setDraftDate] = useState(() => selectedDate ?? new Date());
  const monthDates = useMemo(() => getCalendarDates(draftDate), [draftDate]);

  function openDialog() {
    setDraftDate(selectedDate ?? new Date());
    setDialogIsVisible(true);
  }

  function closeDialog() {
    setDialogIsVisible(false);
  }

  function handleConfirm() {
    onChange(formatDateInputValue(draftDate));
    closeDialog();
  }

  function moveMonth(offset: number) {
    setDraftDate((currentDate) => (
      new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1)
    ));
  }

  return (
    <>
      <View style={styles.fieldPressable}>
        <TextInput
          mode="outlined"
          label="Auto-archive"
          value={displayValue}
          editable={false}
          placeholder="Optional"
          error={error}
          accessibilityLabel="Auto-archive date"
          style={styles.field}
          theme={themeOverride}
          right={
            value ? (
              <TextInput.Icon
                icon="close"
                onPress={() => onChange("")}
                accessibilityLabel="Clear auto-archive date"
                forceTextInputFocus={false}
              />
            ) : (
              <TextInput.Icon
                icon="calendar"
                onPress={openDialog}
                accessibilityLabel="Choose auto-archive date"
                forceTextInputFocus={false}
              />
            )
          }
        />
        <Pressable
          onPress={openDialog}
          accessibilityRole="button"
          accessibilityLabel="Choose auto-archive date"
          style={[
            styles.fieldOverlay,
            value ? styles.fieldOverlayWithClearButton : undefined
          ]}
        />
      </View>
      <Portal>
        <Dialog visible={dialogIsVisible} onDismiss={closeDialog} style={styles.dialog}>
          <Dialog.Title>Auto-archive</Dialog.Title>
          <Dialog.Content>
            <View style={styles.monthHeader}>
              <IconButton
                icon="chevron-left"
                onPress={() => moveMonth(-1)}
                accessibilityLabel={`Previous month, ${formatMonthLabel(getAdjacentMonth(draftDate, -1))}`}
              />
              <Text variant="titleMedium" style={styles.monthLabel}>
                {formatMonthLabel(draftDate)}
              </Text>
              <IconButton
                icon="chevron-right"
                onPress={() => moveMonth(1)}
                accessibilityLabel={`Next month, ${formatMonthLabel(getAdjacentMonth(draftDate, 1))}`}
              />
            </View>
            <View style={styles.weekdays}>
              {weekdayLabels.map((label, index) => (
                <Text
                  key={`${label}-${index}`}
                  variant="labelMedium"
                  accessibilityLabel={weekdayAccessibilityLabels[index]}
                  style={[styles.weekday, { color: theme.colors.onSurfaceVariant }]}
                >
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {monthDates.map((date) => {
                const isCurrentMonth = date.getMonth() === draftDate.getMonth();
                const isSelected = datesMatch(date, draftDate);
                const isToday = datesMatch(date, new Date());

                return (
                  <Pressable
                  key={date.toISOString()}
                  onPress={() => setDraftDate(date)}
                  accessibilityRole="button"
                    accessibilityLabel={getDayAccessibilityLabel(date, isSelected, isToday)}
                    accessibilityState={{ disabled: !isCurrentMonth, selected: isSelected }}
                  disabled={!isCurrentMonth}
                  style={styles.dayButton}
                  >
                    {isCurrentMonth ? (
                      <View
                        style={[
                          styles.dayState,
                          isToday && !isSelected
                            ? { borderColor: theme.colors.primary }
                            : undefined,
                          isSelected
                            ? { backgroundColor: theme.colors.primary }
                            : undefined
                        ]}
                      >
                        <Text
                          variant="bodyMedium"
                          style={{
                            color: isSelected
                              ? theme.colors.onPrimary
                              : theme.colors.onSurface
                          }}
                        >
                          {date.getDate()}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button onPress={handleConfirm}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

function getCalendarDates(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = new Date(firstOfMonth);

  calendarStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => (
    new Date(
      calendarStart.getFullYear(),
      calendarStart.getMonth(),
      calendarStart.getDate() + index
    )
  ));
}

function getAdjacentMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function parseDateInputValue(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return null;
  }

  const [yearText, monthText, dayText] = trimmedValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatAccessibleDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  }).format(date);
}

function getDayAccessibilityLabel(date: Date, isSelected: boolean, isToday: boolean) {
  const stateLabels = [
    isToday ? "today" : "",
    isSelected ? "selected" : ""
  ].filter(Boolean);
  const stateSuffix = stateLabels.length > 0 ? `, ${stateLabels.join(", ")}` : "";

  return `Select ${formatAccessibleDate(date)}${stateSuffix}`;
}

function datesMatch(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

const styles = StyleSheet.create({
  field: {
    width: fieldWidth
  },
  fieldPressable: {
    width: fieldWidth
  },
  fieldOverlay: {
    position: "absolute",
    top: spacing.none,
    right: spacing.none,
    bottom: spacing.none,
    left: spacing.none
  },
  fieldOverlayWithClearButton: {
    right: 48
  },
  dialog: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  monthLabel: {
    flex: 1,
    textAlign: "center"
  },
  weekdays: {
    flexDirection: "row",
    paddingTop: spacing.xs
  },
  weekday: {
    flex: 1,
    textAlign: "center"
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: spacing.xs
  },
  dayButton: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  dayState: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center"
  }
});
