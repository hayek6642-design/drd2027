// Wrap global gsap from UMD into an ESM export
const G = window.gsap || window.GSAP || window.gsap
export default G
export const gsap = G
