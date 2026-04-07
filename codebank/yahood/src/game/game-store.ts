import { create } from 'zustand';
import { generateTreasures, generateThieves, getDistanceKm, findSafeHomeNear, type GeoTreasure, type GeoThief } from './geo-engine';
import { accBridge, type PendingTreasure } from './acc-bridge';

export interface OwnedLand {
  id: string;
  lat: number;
  lng: number;
  ownerName: string;
  ownerInitials: string;
  ownerAvatar?: string;
  purchasedAt: number;
  areaLabel: string;
}

export type GamePhase = 'locating' | 'exploring' | 'mining' | 'returning' | 'deposited';
export type MapMode = 'explore' | 'dig' | 'buy';

export interface GeoPlayer {
  lat: number;
  lng: number;
  homeLat: number;
  homeLng: number;
  hasPending: boolean;
  name: string;
  accuracy: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: number;
  isSystem?: boolean;
}

export interface OnlinePlayer {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hasPending: boolean;
  phase: GamePhase;
  lastSeen: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  region: string;
  icon: string;
  userCount: number;
}

export interface DirectMessage {
  id: string;
  sender: string;
  text: string;
  time: number;
  fromMe: boolean;
}

export interface DmTarget {
  id: string;
  name: string;
  avatar: string;
  status: string;
}

interface GameState {
  phase: GamePhase;
  treasures: GeoTreasure[];
  thieves: GeoThief[];
  player: GeoPlayer;
  pending: PendingTreasure[];
  miningProgress: number;
  miningTarget: GeoTreasure | null;
  chatMessages: ChatMessage[];
  notification: { text: string; type: 'info' | 'warn' | 'danger' | 'success' } | null;
  onlinePlayers: OnlinePlayer[];
  chatRooms: ChatRoom[];
  activeRoom: string;
  gpsError: string | null;
  riskLevel: number;
  homeAssigned: boolean;
  mapMode: MapMode;
  ownedLands: OwnedLand[];
  activeDm: DmTarget | null;
  dmMessages: Record<string, DirectMessage[]>;

  initGame: () => void;
  setPlayerLocation: (lat: number, lng: number, accuracy: number) => void;
  startMining: (treasure: GeoTreasure) => void;
  progressMining: (dt: number) => boolean;
  depositTreasures: () => void;
  tick: () => void;
  addChat: (text: string) => void;
  receiveChat: (msg: ChatMessage) => void;
  setNotification: (msg: { text: string; type: 'info' | 'warn' | 'danger' | 'success' } | null) => void;
  setActiveRoom: (roomId: string) => void;
  setGpsError: (err: string | null) => void;
  addOnlinePlayer: (p: OnlinePlayer) => void;
  setMapMode: (mode: MapMode) => void;
  buyLand: (lat: number, lng: number) => void;
  openDm: (target: DmTarget) => void;
  closeDm: () => void;
  sendDm: (text: string) => void;
}

const SEED = Date.now() % 100000;
const MINE_RATE = 15;

const DEFAULT_ROOMS: ChatRoom[] = [
  { id: 'global', name: 'Global Chat', region: 'World', icon: '🌍', userCount: 0 },
  { id: 'nearby', name: 'Nearby Players', region: 'Proximity', icon: '📡', userCount: 0 },
  { id: 'thieves', name: "Thieves' Den", region: 'Underground', icon: '⚔️', userCount: 0 },
  { id: 'trade', name: 'Trade Market', region: 'Global', icon: '💹', userCount: 0 },
];

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'locating',
  treasures: [],
  thieves: [],
  player: {
    lat: 0, lng: 0,
    homeLat: 0, homeLng: 0,
    hasPending: false,
    name: 'Explorer',
    accuracy: 0,
  },
  pending: [],
  miningProgress: 0,
  miningTarget: null,
  chatMessages: [
    { id: '1', sender: 'System', text: '🌍 Welcome to Yahood! — Your real-world treasure hunt begins.', time: Date.now(), isSystem: true },
    { id: '2', sender: 'System', text: '📡 Acquiring your GPS position...', time: Date.now(), isSystem: true },
  ],
  notification: null,
  onlinePlayers: [],
  chatRooms: DEFAULT_ROOMS,
  activeRoom: 'global',
  gpsError: null,
  riskLevel: 0,
  homeAssigned: false,
  mapMode: 'explore',
  ownedLands: [],
  activeDm: null,
  dmMessages: {},

  initGame: () => {
    const treasures = generateTreasures(SEED);
    const thieves = generateThieves(treasures, 18);
    set({ treasures, thieves });
  },

  setPlayerLocation: (lat, lng, accuracy) => {
    const state = get();
    const newPlayer = { ...state.player, lat, lng, accuracy };

    // First GPS fix — auto-assign home far from treasures, no user interaction needed
    if (state.phase === 'locating' && !state.homeAssigned) {
      const home = findSafeHomeNear(lat, lng, state.treasures);
      newPlayer.homeLat = home.lat;
      newPlayer.homeLng = home.lng;

      const distKm = getDistanceKm(lat, lng, home.lat, home.lng);

      set({
        player: newPlayer,
        phase: 'exploring',
        homeAssigned: true,
        notification: {
          text: `🏠 Home Base assigned ${distKm.toFixed(1)}km away — safe from all treasure zones. Start exploring!`,
          type: 'success',
        },
        chatMessages: [...state.chatMessages, {
          id: crypto.randomUUID(),
          sender: 'System',
          text: `🏠 Home Base locked in ${distKm.toFixed(1)}km from your position. Find treasures → return home safely!`,
          time: Date.now(),
          isSystem: true,
        }],
      });
      return;
    }

    // Subsequent GPS updates — just move the player
    const updates: Partial<GameState> = { player: newPlayer };

    // Auto-deposit if player reached home
    if (state.phase === 'returning' && state.player.homeLat) {
      const distHome = getDistanceKm(lat, lng, state.player.homeLat, state.player.homeLng);
      if (distHome < 0.15) {
        set({ player: newPlayer });
        state.depositTreasures();
        return;
      }
    }

    // Update risk level when carrying loot
    if (newPlayer.hasPending) {
      const nearbyThieves = state.thieves.filter(t =>
        getDistanceKm(lat, lng, t.lat, t.lng) < 5
      ).length;
      updates.riskLevel = Math.min(100, nearbyThieves * 20);
    } else {
      updates.riskLevel = 0;
    }

    set(updates);
  },

  startMining: (treasure) => {
    if (get().phase !== 'exploring') return;
    set({ phase: 'mining', miningTarget: treasure, miningProgress: 0 });
  },

  progressMining: (dt: number) => {
    const { miningProgress, miningTarget, treasures } = get();
    if (!miningTarget) return false;

    const increment = (MINE_RATE / miningTarget.difficulty) * dt;
    const newProgress = miningProgress + increment;

    if (newProgress >= 100) {
      accBridge.addPending({
        type: miningTarget.type,
        amount: miningTarget.amount,
        lat: miningTarget.lat,
        lng: miningTarget.lng,
        regionName: miningTarget.regionName,
      });

      set({
        treasures: treasures.map(t => t.id === miningTarget.id ? { ...t, mined: true } : t),
        phase: 'returning',
        miningProgress: 0,
        miningTarget: null,
        pending: accBridge.getPending(),
        player: { ...get().player, hasPending: true },
        notification: {
          text: `⛏️ Mined ${miningTarget.amount} ${miningTarget.type} from ${miningTarget.regionName}! Rush home before thieves catch you!`,
          type: 'warn',
        },
      });
      return true;
    }

    set({ miningProgress: newProgress });
    return false;
  },

  depositTreasures: () => {
    accBridge.depositAll();
    const { pending } = get();
    const summary = pending.map(p => `${p.amount} ${p.type}`).join(', ');

    set({
      pending: [],
      player: { ...get().player, hasPending: false },
      phase: 'deposited',
      riskLevel: 0,
      notification: { text: `🏦 Deposited! ${summary} added to your account!`, type: 'success' },
    });

    setTimeout(() => set({ phase: 'exploring' }), 3000);
  },

  tick: () => {
    const { thieves, player, phase } = get();
    if (phase === 'mining' || phase === 'locating' || phase === 'deposited') return;

    const updatedThieves = thieves.map(thief => {
      if (player.hasPending) {
        const dist = getDistanceKm(thief.lat, thief.lng, player.lat, player.lng);
        if (dist < 80) {
          const dLat = player.lat - thief.lat;
          const dLng = player.lng - thief.lng;
          const d = Math.sqrt(dLat * dLat + dLng * dLng);
          if (d > 0.001) {
            return {
              ...thief,
              lat: thief.lat + (dLat / d) * thief.speed,
              lng: thief.lng + (dLng / d) * thief.speed,
            };
          }
        }
      }
      return {
        ...thief,
        lat: thief.lat + (Math.random() - 0.5) * 0.003,
        lng: thief.lng + (Math.random() - 0.5) * 0.003,
      };
    });

    // Robbery check
    if (player.hasPending) {
      const robber = updatedThieves.find(t =>
        getDistanceKm(t.lat, t.lng, player.lat, player.lng) < 0.5
      );
      if (robber) {
        accBridge.stealAll();
        set({
          thieves: updatedThieves,
          phase: 'exploring',
          pending: [],
          player: { ...player, hasPending: false },
          riskLevel: 0,
          notification: { text: `💀 Robbed by ${robber.name}! Lost all pending treasures!`, type: 'danger' },
          chatMessages: [...get().chatMessages, {
            id: crypto.randomUUID(),
            sender: 'System',
            text: `⚔️ ${robber.name} robbed ${player.name}!`,
            time: Date.now(), isSystem: true,
          }],
        });
        return;
      }
    }

    set({ thieves: updatedThieves });
  },

  addChat: (text) => {
    const { player, chatMessages } = get();
    set({
      chatMessages: [...chatMessages.slice(-100), {
        id: crypto.randomUUID(),
        sender: player.name,
        text,
        time: Date.now(),
      }],
    });
  },

  receiveChat: (msg) => set(s => ({ chatMessages: [...s.chatMessages.slice(-100), msg] })),
  setNotification: (n) => set({ notification: n }),
  setActiveRoom: (roomId) => set({ activeRoom: roomId }),
  setGpsError: (err) => set({ gpsError: err }),
  addOnlinePlayer: (p) => set(s => ({
    onlinePlayers: [...s.onlinePlayers.filter(x => x.id !== p.id), p].slice(-50),
  })),

  setMapMode: (mode) => set({ mapMode: mode }),

  openDm: (target) => {
    set({ activeDm: target });
  },

  closeDm: () => set({ activeDm: null }),

  sendDm: (text) => {
    const { activeDm, dmMessages, player } = get();
    if (!activeDm) return;

    const myMsg: DirectMessage = {
      id: crypto.randomUUID(),
      sender: player.name,
      text,
      time: Date.now(),
      fromMe: true,
    };

    const prevMsgs = dmMessages[activeDm.id] || [];
    set({ dmMessages: { ...dmMessages, [activeDm.id]: [...prevMsgs, myMsg] } });

    // Simulate a reply after a short delay
    const REPLIES = [
      `Hey ${player.name}! What's your location?`,
      'Watch out — there are thieves near me right now! ⚔️',
      'Nice! I just found some silver deposits nearby.',
      'Want to trade? I have excess codes.',
      'I can see your signal on my map 👀',
      'Be careful heading back — risky route!',
      'Good hunting! Meet near the bazaar?',
      `Roger that. I'll keep an eye out.`,
    ];
    const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];

    setTimeout(() => {
      const state = get();
      if (!state.activeDm || state.activeDm.id !== activeDm.id) return;
      const replyMsg: DirectMessage = {
        id: crypto.randomUUID(),
        sender: activeDm.name,
        text: reply,
        time: Date.now(),
        fromMe: false,
      };
      const current = state.dmMessages[activeDm.id] || [];
      set({ dmMessages: { ...state.dmMessages, [activeDm.id]: [...current, replyMsg] } });
    }, 1200 + Math.random() * 1600);
  },

  buyLand: (lat, lng) => {
    const state = get();
    const assets = accBridge.getAssets();
    const LAND_COST = 5;

    if (assets.silver < LAND_COST) {
      set({ notification: { text: `🏴 Need ${LAND_COST} silver to buy land. Mine more treasures!`, type: 'warn' } });
      return;
    }

    const existing = state.ownedLands.find(l =>
      getDistanceKm(l.lat, l.lng, lat, lng) < 0.1
    );
    if (existing) {
      set({ notification: { text: `🏴 Land already owned by ${existing.ownerName}!`, type: 'warn' } });
      return;
    }

    accBridge.spendSilver(LAND_COST);

    const name = state.player.name || 'Explorer';
    const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
    const areaLabel = `Plot #${state.ownedLands.length + 1}`;

    const newLand: OwnedLand = {
      id: crypto.randomUUID(),
      lat, lng,
      ownerName: name,
      ownerInitials: initials,
      purchasedAt: Date.now(),
      areaLabel,
    };

    set({
      ownedLands: [...state.ownedLands, newLand],
      mapMode: 'explore',
      notification: { text: `🏴 Land purchased! ${areaLabel} now belongs to ${name}. Cost: ${LAND_COST} silver.`, type: 'success' },
      chatMessages: [...state.chatMessages, {
        id: crypto.randomUUID(),
        sender: 'System',
        text: `🏴 ${name} just bought land at (${lat.toFixed(4)}, ${lng.toFixed(4)})!`,
        time: Date.now(), isSystem: true,
      }],
    });
  },
}));
