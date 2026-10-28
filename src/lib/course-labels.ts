const LEVEL_LABELS: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};
export function levelLabel(level: string) {
  return LEVEL_LABELS[level] ?? level.charAt(0) + level.slice(1).toLowerCase();
}
