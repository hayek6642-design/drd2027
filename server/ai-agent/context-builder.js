function buildContext(user, assets, services) {
  const codes = assets?.codes?.length || 0;
  const silver = assets?.silver?.length || 0;
  const gold = assets?.gold?.length || 0;
  const totalValue = calculateEstimatedValue(assets);
  const riskProfile = calculateRiskProfile(assets);

  const activeServices = services.filter(s => s.status === 'active');
  const inactiveServices = services.filter(s => s.status !== 'active');

  return `
========================================
USER PROFILE & ASSET CONTEXT
========================================

USER INFORMATION:
- Username: ${user.username || 'Guest'}
- User ID: ${user.id}
- Session Status: Active
- Authentication: ${user.authenticated ? 'Verified' : 'Guest'}

CURRENT ASSET PORTFOLIO:
- Codes (Primary Currency): ${codes} units
- Silver (Mid-Tier Asset): ${silver} units  
- Gold (Premium Asset): ${gold} units
- Total Estimated Value: ${totalValue} points
- Risk Profile: ${riskProfile}

PORTFOLIO ANALYSIS:
${getPortfolioAnalysis(codes, silver, gold)}

AVAILABLE SERVICES (${activeServices.length} active):
${activeServices.map(s => `  ✓ ${s.name}: ${s.description}`).join('\n')}
${inactiveServices.length > 0 ? '\nInactive Services:\n' + inactiveServices.map(s => `  ✗ ${s.name}: ${s.description}`).join('\n') : ''}

STRATEGIC RECOMMENDATIONS:
${getStrategicRecommendations(codes, silver, gold, riskProfile)}

INTENT ANALYSIS:
Determine if the user wants:
1. Information/Explanation (provide detailed answer)
2. Action/Navigation (suggest specific service)
3. Strategy/Advice (analyze portfolio and recommend)
4. Support/Help (guide step-by-step)

Respond as the Platform Manager using this context.
`;
}

function calculateEstimatedValue(assets) {
  if (!assets) return 0;
  const codeValue = (assets.codes?.length || 0) * 1;
  const silverValue = (assets.silver?.length || 0) * 5;
  const goldValue = (assets.gold?.length || 0) * 25;
  return codeValue + silverValue + goldValue;
}

function calculateRiskProfile(assets) {
  const codes = assets?.codes?.length || 0;
  const gold = assets?.gold?.length || 0;
  
  if (gold > 5) return 'Conservative (High assets - protect them)';
  if (codes > 20) return 'Aggressive (Liquid assets - good for risk)';
  if (codes > 0 || gold > 0) return 'Moderate (Balanced portfolio)';
  return 'New User (Start building portfolio)';
}

function getPortfolioAnalysis(codes, silver, gold) {
  const parts = [];
  
  if (codes > 20) {
    parts.push('- High liquid assets: Perfect for trading and gaming');
  } else if (codes > 0) {
    parts.push('- Moderate codes: Good for starting trades');
  } else {
    parts.push('- No codes: Need to earn via YT-Player');
  }
  
  if (silver > 10) {
    parts.push('- Strong silver position: Excellent for bartering');
  } else if (silver > 0) {
    parts.push('- Some silver: Can make small trades');
  }
  
  if (gold > 5) {
    parts.push('- Premium gold holder: High-value portfolio');
  } else if (gold > 0) {
    parts.push('- Gold assets: Secure these immediately');
  }
  
  return parts.join('\n') || '- Empty portfolio: Start earning codes';
}

function getStrategicRecommendations(codes, silver, gold, riskProfile) {
  const recs = [];
  
  if (codes > 0 && silver === 0 && gold === 0) {
    recs.push('- PRIORITY: Convert codes to silver/gold via Pebalaash for stability');
  }
  
  if (gold > 0) {
    recs.push('- SECURE: Move gold to SafeCode for protection');
  }
  
  if (codes > 10) {
    recs.push('- GROWTH: Use excess codes in Games Centre (risk/reward)');
  }
  
  if (silver > 5) {
    recs.push('- TRADE: Silver is optimal for Pebalaash bartering');
  }
  
  if (codes === 0 && silver === 0 && gold === 0) {
    recs.push('- START: Watch videos in YT-Player to earn initial codes');
  }
  
  return recs.join('\n') || '- Explore services to find opportunities';
}

module.exports = { buildContext, calculateEstimatedValue };