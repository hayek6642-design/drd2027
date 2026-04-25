// Wrap global Matter from UMD into an ESM export
const M = window.Matter || window.MatterJS || window.Matter
export default M
export const Engine = M && M.Engine
export const World = M && M.World
export const Bodies = M && M.Bodies
export const Events = M && M.Events
