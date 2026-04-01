export function generateIdentityFingerprint(features = {}) {
  const {
    blurMetric = 0,
    lightingConsistency = 0,
    noiseLevel = 0,
    bodyBoxAspect = 1,
    liveFramesVariance = 0
  } = features;

  const vector = [
    blurMetric.toFixed(2),
    lightingConsistency.toFixed(2),
    noiseLevel.toFixed(2),
    bodyBoxAspect.toFixed(2),
    liveFramesVariance.toFixed(2)
  ].join("|");

  let hash = 0;
  for (let i = 0; i < vector.length; i++) {
    hash = ((hash << 5) - hash) + vector.charCodeAt(i);
    hash |= 0;
  }

  return `ID-${Math.abs(hash)}`;
}