import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet } from 'react-native';

export default function ProjectScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Projects</ThemedText>
      <ThemedText>Manage your projects here</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
