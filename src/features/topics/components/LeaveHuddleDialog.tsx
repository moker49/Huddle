import { Button, Dialog, Text, useTheme } from "react-native-paper";

import { Topic } from "@/models/topic";

interface LeaveHuddleDialogProps {
  topic: Topic | null;
  errorMessage: string;
  isLeaving: boolean;
  onDismiss(): void;
  onLeave(): void;
}

export function LeaveHuddleDialog({
  topic,
  errorMessage,
  isLeaving,
  onDismiss,
  onLeave
}: LeaveHuddleDialogProps) {
  const theme = useTheme();

  return (
    <Dialog
      visible={Boolean(topic)}
      onDismiss={() => {
        if (!isLeaving) {
          onDismiss();
        }
      }}
    >
      <Dialog.Title>Leave huddle?</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium">
          You will lose access to this huddle and its message history.
        </Text>
        {errorMessage ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {errorMessage}
          </Text>
        ) : null}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss} disabled={isLeaving}>Cancel</Button>
        <Button onPress={onLeave} loading={isLeaving} disabled={isLeaving}>
          Leave
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
