const firebase = window.__SUPABASE_CLIENT__ || (window.Auth && window.Auth.client);

async function getCurrentUser() {
  if (!firebase || !firebase.auth) return null;
  const { data: { user } } = await firebase.auth.getUser();
  return user || null;
}

async function getUserBalance(userId) {
  if (!firebase) return 0;
  const { data, error } = await firebase
    .from('balances')
    .select('codes')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching balance:', error);
    return 0;
  }
  return data ? data.codes : 0;
}

async function updateUserBalance(userId, newCodes) {
  if (!firebase) return;
  const { error } = await firebase
    .from('balances')
    .upsert({ user_id: userId, codes: newCodes, updated_at: new Date().toISOString() });
  if (error) console.error('Error updating balance:', error);
}

async function transferCodes(fromId, toId, amount) {
  try {
    if (firebase && typeof firebase.rpc === 'function') {
      const { data, error } = await firebase.rpc('transfer_codes', {
        from_user_id: fromId,
        to_user_id: toId,
        amount,
      });
      if (error) throw new Error(error.message || 'RPC transfer failed');
      return data || { success: true };
    }
    // Fallback: local-only update
    const fromBalance = await getUserBalance(fromId);
    const toBalance = await getUserBalance(toId);
    await updateUserBalance(fromId, Math.max(0, fromBalance - amount));
    await updateUserBalance(toId, toBalance + amount);
    return { success: true };
  } catch (err) {
    console.error('Transfer error:', err);
    throw err;
  }
}

async function handleSingleGamble(winner, userId) {
  const currentCodes = await getUserBalance(userId);
  let newCodes;
  if (winner === 'player') {
    newCodes = currentCodes + 2;
  } else if (winner === 'computer') {
    newCodes = currentCodes - 1;
    if (newCodes < 0) newCodes = 0;
  } else {
    return;
  }
  await updateUserBalance(userId, newCodes);
}

async function handleMultiGamble(stake, player1Id, player2Id, winner) {
  await transferCodes(player2Id, player1Id, stake); // player2 pays stake to player1 if player1 wins
  if (winner === 'player2') {
    await transferCodes(player1Id, player2Id, stake);
  }
  // Pot = 2*stake, winner gets all, but since deduct from loser
}
