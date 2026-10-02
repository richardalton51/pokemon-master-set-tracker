export type ThemeColors = {
  background: string;
  border: string;
  text: string;
  textMuted: string;
  placeholder: string;
  accent: string;
  accentText: string;
  selectedRow: string;
  error: string;
};

const dark: ThemeColors = {
  background: '#121212',
  border: '#3a3a3a',
  text: '#f2f2f2',
  textMuted: '#9a9a9a',
  placeholder: '#2a2a2a',
  accent: '#4caf50',
  accentText: '#0b0b0b',
  selectedRow: '#1b3320',
  error: '#ff6b6b',
};

export function useThemeColors(): ThemeColors {
  return dark;
}
