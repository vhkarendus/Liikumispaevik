export const SPORT_TYPES = [
  "Jooksmine",
  "Ujumine",
  "Jalgpall",
  "Korvpall",
  "Jõusaal",
  "Jalgrattasõit",
  "Suusatamine",
  "Tennis",
  "Võrkpall",
  "Tantsimine",
  "Jooga",
  "Kõndimine",
  "Sõudmine",
  "Maadlus",
  "Võimlemine",
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "friends", label: "👥 Sõpradele nähtav", icon: "eye" },
  { value: "private", label: "🔒 Privaatne", icon: "eye-off" },
  { value: "hidden", label: "👁️‍🗨️ Peidetud", icon: "eye-off" },
] as const;
