import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  colorOrColors: string | { light: string; dark: string }
): string {
  const colorScheme = useColorScheme();

  if (typeof colorOrColors === 'string') {
    return colorOrColors;
  }

  return colorOrColors[colorScheme ?? 'light'];
}
