export const users = [
  { id: 1, name: "UserA", balance: 100, assets: [] },
  { id: 2, name: "UserB", balance: 50, assets: [] }
];

export const transactions = [
  { id: 1, type: "transfer", from: 1, to: 2, amount: 10, status: "success", timestamp: 1670000000 },
  { id: 2, type: "like", from: 2, to: 1, contentId: 101, likeType: "super", amount: 5, status: "pending", timestamp: 1670000500 },
  { id: 3, type: "gameAssetPurchase", userId: 1, assetId: 201, amount: 20, status: "failed", timestamp: 1670001000 }
];
