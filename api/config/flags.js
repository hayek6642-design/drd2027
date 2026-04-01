export const featureFlags = {
  FEATURE_AUTH_ENABLED: true,
  FEATURE_CODEBANK_ENABLED: true,
  FEATURE_E7KI_ENABLED: false,
  FEATURE_SCREENSHOT: true,
  FEATURE_EXPERIMENTAL_UI: false
}

export function setFlag(key, value) {
  if (!(key in featureFlags)) return false
  featureFlags[key] = !!value
  return true
}