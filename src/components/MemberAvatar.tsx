import { useEffect, useState } from "react";
import { Image, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

import { getMemberAvatarColor, getMemberInitial } from "@/features/connections/memberAvatar";

interface MemberAvatarProps {
  avatarUrl?: string;
  label: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}

export function MemberAvatar({ avatarUrl, label, size, style }: MemberAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getMemberAvatarColor(label)
        },
        style
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
          onError={() => setImageFailed(true)}
          style={[styles.image, { borderRadius: size / 2 }]}
        />
      ) : (
        <Text variant="titleSmall" style={styles.initial}>
          {getMemberInitial(label)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  initial: {
    color: "#FFFFFF"
  }
});
