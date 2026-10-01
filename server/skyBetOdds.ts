import type { Race } from '../types.js';

const SKYBET_RACING_URL = 'https://skybet.com/horse-racing/s-7';
const SKYBET_CATALOG_URL = 'https://apitbd.skybet.com/api/tbd/bff-gql/v11/';
const SKYBET_PRICES_URL = 'https://smp.skybet.com/www/sports/fixedodds/readonly/v1/getMarketPrices';
const DEFAULT_APP_KEY = 'DuJYiLaRflSsueCd';
const DEFAULT_CARD_DOCUMENT_ID = 'Card#ed323fad2291a5bca2d048f8ec7ff0a7';
const UPCOMING_RACE_COUNT = 5;
const CACHE_TTL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;
const THROTTLE_COOLDOWN_MS = 5 * 60_000;

type SkyRunnerOdds = {
  name: string;
  currentOdds: number | null;
  openingOdds: number | null;
};

type SkyRaceOdds = {
  course: string;
  time: string;
  runners: SkyRunnerOdds[];
};

let cached: { expiresAt: number; value: SkyRaceOdds[] } | null = null;
let throttledUntil = 0;

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const isEnabled = () => {
  const flag = (
    process.env.ENABLE_SKYBET_ODDS || process.env.ENABLE_SKYBET_LOCAL_ODDS || ''
  ).trim().toLowerCase();
  return ['1', 'true', 'yes'].includes(flag);
};

const requestHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Origin: 'https://skybet.com',
  Referer: 'https://skybet.com/',
  'User-Agent': 'Mozilla/5.0 (compatible; TurfAI odds enrichment)',
};

const fetchText = async (url: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Sky Bet ${response.status} ${response.statusText}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const findNextRacesUrn = (html: string) => {
  const matches = html.match(/ppb:tbd:cardgroup:racingSwimlane:[^"\\\s]+/g) || [];
  return matches[0] || '';
};

const collectRaceMarketCards = (value: unknown, cards: any[] = []): any[] => {
  if (!value || typeof value !== 'object') return cards;
  if ((value as any).__typename === 'RaceMarketCard') cards.push(value);
  if (Array.isArray(value)) {
    for (const item of value) collectRaceMarketCards(item, cards);
  } else {
    for (const child of Object.values(value as Record<string, unknown>)) {
      collectRaceMarketCards(child, cards);
    }
  }
  return cards;
};

const londonTime = (iso: string) => {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
};

const decimalOdds = (value: any): number | null => {
  const parsed = Number(value?.decimalOdds?.decimalOdds ?? value?.decimal);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : null;
};

const fetchMarketPriceHistory = async (marketIds: string[], appKey: string) => {
  if (marketIds.length === 0) return new Map<string, any>();
  const raw = await fetchText(`${SKYBET_PRICES_URL}?priceHistory=3&_ak=${encodeURIComponent(appKey)}`, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify({ marketIds }),
  });
  const markets = JSON.parse(raw);
  return new Map((Array.isArray(markets) ? markets : []).map((market: any) => [String(market.marketId), market]));
};

const fetchSkyBetOdds = async (): Promise<SkyRaceOdds[]> => {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (throttledUntil > Date.now()) return [];

  try {
    const html = await fetchText(SKYBET_RACING_URL, {
      headers: { Accept: 'text/html', 'User-Agent': requestHeaders['User-Agent'] },
    });
    const urn = findNextRacesUrn(html);
    if (!urn) throw new Error('Sky Bet Next Races catalogue was not found');

    const appKey = (process.env.SKYBET_APP_KEY || DEFAULT_APP_KEY).trim();
    const documentId = (process.env.SKYBET_CARD_DOCUMENT_ID || DEFAULT_CARD_DOCUMENT_ID).trim();
    const catalogRaw = await fetchText(
      `${SKYBET_CATALOG_URL}?_ak=${encodeURIComponent(appKey)}&currentViewUrn=${encodeURIComponent('ppb:tbd:view:sport:7')}`,
      {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          variables: {
            urn: [urn],
            numberOfFilledCardsInCardGroup: UPCOMING_RACE_COUNT,
            preferences: { userProducts: ['SPORTSBOOK'], favoriteSports: [] },
            productExclusions: [],
            experiments: [],
          },
          documentId,
        }),
      },
    );
    // Keep the adapter focused on the next five races even if Sky Bet returns
    // additional cards in the catalogue response.
    const cards = collectRaceMarketCards(JSON.parse(catalogRaw)).slice(0, UPCOMING_RACE_COUNT);
    const marketIds = cards
      .map((card) => String(card?.displayRunners?.sportsbook?.market?.urn || '').replace('ppb:sbkMarket:', ''))
      .filter(Boolean);
    const priceHistory = await fetchMarketPriceHistory(marketIds, appKey);

    const races = cards.map((card): SkyRaceOdds | null => {
    const market = card?.displayRunners?.sportsbook?.market;
    const hierarchy = market?.hierarchy;
    const race = hierarchy?.race || card?.race;
    const course = String(hierarchy?.meeting?.venue || race?.meeting?.venue || '').trim();
    const time = londonTime(String(race?.startTime || race?.details?.scheduledTime || ''));
    const marketId = String(market?.urn || '').replace('ppb:sbkMarket:', '');
    const marketRunners = Array.isArray(market?.runners)
      ? market.runners
      : Array.isArray(hierarchy?.runners)
        ? hierarchy.runners
        : [];
    const names = new Map<string, string>(
      marketRunners
        .map((runner: any) => [String(runner.selectionId), String(runner.name || '').trim()]),
    );
    const liveRunners = Array.isArray(market?.liveData?.runners) ? market.liveData.runners : [];
    const historyRunners = new Map<string, any>(
      (Array.isArray(priceHistory.get(marketId)?.runnerDetails) ? priceHistory.get(marketId).runnerDetails : [])
        .map((runner: any) => [String(runner.selectionId), runner]),
    );
    const runners = liveRunners.map((runner: any): SkyRunnerOdds | null => {
      const selectionId = String(runner.selectionId);
      const name = names.get(selectionId) || '';
      if (!name || name.startsWith('Unnamed ')) return null;
      const history = historyRunners.get(selectionId);
      const previous = Array.isArray(history?.previousWinRunnerOdds) ? history.previousWinRunnerOdds[0] : null;
      return {
        name,
        currentOdds: decimalOdds(history?.winRunnerOdds) ?? decimalOdds(runner?.displayOdds) ?? decimalOdds(runner?.odds),
        openingOdds: decimalOdds(previous),
      };
    }).filter((runner: SkyRunnerOdds | null): runner is SkyRunnerOdds => Boolean(runner));
    return course && time && runners.length ? { course, time, runners } : null;
    }).filter((race: SkyRaceOdds | null): race is SkyRaceOdds => Boolean(race));

    cached = { value: races, expiresAt: Date.now() + CACHE_TTL_MS };
    return races;
  } catch (error) {
    if (error instanceof Error && /Sky Bet 429|Sky Bet 403/.test(error.message)) {
      throttledUntil = Date.now() + THROTTLE_COOLDOWN_MS;
    }
    throw error;
  }
};

export const enrichRacesWithSkyBetOdds = async (races: Race[]): Promise<Race[]> => {
  if (!isEnabled()) return races;
  try {
    const skyRaces = await fetchSkyBetOdds();
    return races.map((race) => {
      const skyRace = skyRaces.find((candidate) =>
        normalize(candidate.course) === normalize(race.course) && candidate.time === race.time,
      );
      if (!skyRace) return race;
      const runners = new Map(skyRace.runners.map((runner) => [normalize(runner.name), runner]));
      return {
        ...race,
        horses: race.horses.map((horse) => {
          const odds = runners.get(normalize(horse.name));
          return odds ? { ...horse, currentOdds: odds.currentOdds, openingOdds: odds.openingOdds } : horse;
        }),
      };
    });
  } catch (error) {
    console.warn(`[SkyBet odds] Enrichment unavailable; continuing without Sky Bet odds: ${error instanceof Error ? error.message : 'unknown error'}`);
    return races;
  }
};
