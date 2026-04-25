/**
 * DR.D AI-HUB Knowledge Base
 * Complete platform reference for AI Chat & AI Manager
 */

window.DRD_KNOWLEDGE = {
  services: {
    pebalaash: {name:"Pebalaash",emoji:"🔄",tagline:"Barter. Trade. Acquire.",desc:"P2P marketplace for trading codes",features:["List items","Browse offers","Propose trades","Escrow","Reputation"]},
    farragna: {name:"Farragna",emoji:"❤️",tagline:"Like. Share. Earn.",desc:"Social platform - give likes, earn codes",features:["Standard/Mega/Super likes","Creator tiers","Leaderboards","Monetization"]},
    battalooda: {name:"Battalooda",emoji:"🎵",tagline:"Create. Produce. Shine.",desc:"Audio studio for music & beats",features:["Recording","Beat making","Audio FX","Mastering","Distribution"]},
    corsa: {name:"CoRsA",emoji:"📈",tagline:"Invest. Grow. Prosper.",desc:"Trading platform for tokens",features:["Buy/Sell tokens","Portfolio tracking","Analytics","Bots"]},
    e7ki: {name:"E7ki",emoji:"💬",tagline:"Chat. Connect. Communicate.",desc:"Secure messaging with E2E encryption",features:["Text/Voice","Encryption","File sharing","Zagel integrated"]},
    zagel: {name:"Zagel OS",emoji:"🧠",tagline:"Your AI Companion",desc:"Advanced AI assistant 24/7",features:["Code analysis","Platform help","File upload","Voice I/O","Creative help"]},
    safecode: {name:"SafeCode",emoji:"🔒",tagline:"Secure. Organized. Yours.",desc:"Central wallet for codes/silver/gold",features:["View balance","Transfer","Convert","History","Security"]},
    samma3ny: {name:"Samma3ny",emoji:"🎧",tagline:"Listen. Enjoy. Discover.",desc:"Audio streaming - music/podcasts",features:["Stream music","Podcasts","Audiobooks","Playlists"]},
    gamesCentre: {name:"Games Centre",emoji:"🎰",tagline:"Play. Risk. Win.",desc:"Casino games with RNG",features:["Slots","Blackjack","Dice","Tournaments"]},
    eb3at: {name:"Eb3at",emoji:"📤",tagline:"Send. Share. Deliver.",desc:"Transfer codes & assets",features:["Send codes","QR sharing","Bulk transfers"]},
    aichat: {name:"AI-Chat",emoji:"🤖",tagline:"Chat. Learn. Create.",desc:"AI with file upload & analysis",features:["Multi-personality AI","File upload","Code analysis","Creative help"]}
  },
  faqs: [
    {q:"How do I earn codes?",a:"Watch YouTube via yt-new-clear.html player"},
    {q:"What can I do with codes?",a:"Barter, gamble, invest, give likes, unlock features"},
    {q:"Is it safe?",a:"Yes! E2E encryption, biometric locks, multi-layer security"},
    {q:"Can I earn real money?",a:"No, codes are in-game currency only"},
    {q:"What's Zagel?",a:"Your 24/7 AI assistant available across entire Dr.D"},
    {q:"How do I transfer codes?",a:"Use Eb3at or SafeCode transfer feature"},
    {q:"Can I lose codes?",a:"Only if you trade/gamble or account is breached (prevented by security)"},
    {q:"Is there support?",a:"Zagel (instant), Email (24-48h), Community (E7ki)"}
  ]
};

window.AI_RESPONSES = {
  detectIntent: (msg) => {
    const m = msg.toLowerCase();
    if(m.match(/code|earn|watch/)) return "earning";
    if(m.match(/pebalaash|farragna|battalooda|corsa|e7ki|zagel|safecode|games|samma3ny/)) return "service";
    if(m.match(/safe|secure|private|hack/)) return "security";
    if(m.match(/how|guide|tip|help/)) return "help";
    return "general";
  },
  
  respond: (intent, msg) => {
    const knowledge = window.DRD_KNOWLEDGE;
    
    if(intent === "earning") {
      return `💰 **How to Earn Codes**\n\n▶️ Watch YouTube via yt-new-clear.html\n❤️ Create content (get likes in Farragna)\n🎵 Make music (earn royalties)\n🔄 Barter services in Pebalaash\n🎰 Gamble in Games Centre\n📈 Invest in CoRsA\n\nWhat would you like to know more about?`;
    }
    
    if(intent === "service") {
      for(let [k,v] of Object.entries(knowledge.services)) {
        if(msg.toLowerCase().includes(k) || msg.toLowerCase().includes(v.name.toLowerCase())) {
          return `${v.emoji} **${v.name}** — ${v.tagline}\n\n${v.desc}\n\n**Features:**\n${v.features.map(f => "• "+f).join("\n")}\n\nAsk me more!`;
        }
      }
    }
    
    if(intent === "security") {
      return `🔒 **Security & Safety**\n\n✅ Enable biometric lock on mobile\n✅ Use strong, unique password\n✅ Enable 2-factor auth\n✅ Never share session ID\n✅ Logout from shared devices\n✅ Review SafeCode regularly\n\nFeel safe? Your data is encrypted E2E!`;
    }
    
    return "I'm here to help! Ask about services, earning strategies, security, or anything Dr.D related. You can also upload files for analysis! 🤖";
  }
};

console.log("[AI-Hub] Knowledge base loaded ✓");
