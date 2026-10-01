import type { Horse, Race } from '../types.js';
import { enrichRacesWithSkyBetOdds } from './skyBetOdds.js';

const DEFAULT_BASE_URL = 'https://api.theracingapi.com';
const CACHE_TTL_MS = 60_000;
const MIN_REQUEST_INTERVAL_MS = 1_050;

type RacingApiPage = {
  racecards?: unknown[];
  results?: unknown[] | null;
};

type CachedPage = { value: unknown[]; expiresAt: number };

const pageCache = new Map<string, CachedPage>();
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

const asObject = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' ? value as Record<string, any> : {};

const asString = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim();

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const parseTimeToMinutes = (time: string): number | null => {
  const match = time.trim().toLowerCase().match(/^(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3];
  if (suffix === 'am' && hour === 12) hour = 0;
  if (suffix === 'pm' && hour !== 12) hour += 12;
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
};

const formatTime = (value: unknown): string => {
  const raw = asString(value);

  // The API's `off_dt` is an ISO timestamp that includes the racecourse's
  // local wall-clock time. Preserve that clock time instead of converting it
  // through the Cloud Run process timezone (which is normally UTC).
  const isoTime = raw.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (isoTime) {
    const minutes = parseTimeToMinutes(`${isoTime[1]}:${isoTime[2]}`);
    if (minutes !== null) {
      return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }
  }

  const minutes = parseTimeToMinutes(raw);
  if (minutes === null) return raw;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

const statusFromApi = (value: unknown): Race['status'] => {
  const status = normalize(asString(value));
  if (status.includes('abandon')) return 'abandoned';
  if (status.includes('void')) return 'void';
  if (status.includes('result') || status.includes('finish') || status.includes('complete')) return 'finished';
  return 'scheduled';
};

const formatDistance = (value: unknown): string => {
  const raw = asString(value);
  const furlongs = Number(raw);
  if (!Number.isFinite(furlongs) || furlongs <= 0) return raw;
  const miles = Math.floor(furlongs / 8);
  const remainder = furlongs - miles * 8;
  const parts: string[] = [];
  if (miles) parts.push(`${miles}m`);
  if (remainder) parts.push(`${Number(remainder.toFixed(2))}f`);
  return parts.join(' ') || raw;
};

const formatWeight = (value: unknown): string => {
  const lbs = asNumber(value);
  if (!lbs) return asString(value);
  return `${Math.floor(lbs / 14)}st ${lbs % 14}lb`;
};

const parseForm = (value: unknown): string[] =>
  asString(value).match(/[0-9PFURBOS-]/gi) || [];

const mapRunner = (value: unknown, index: number): Horse => {
  const runner = asObject(value);
  const rawNumber = asString(runner.number);
  const runnerStatus = normalize(asString(runner.status || runner.runner_status));
  const isNonRunner = normalize(rawNumber) === 'nr' || runner.non_runner === true || runner.nonrunner === true || runner.withdrawn === true || runnerStatus.includes('non-runner') || runnerStatus.includes('withdrawn');
  return {
    id: asString(runner.horse_id) || `runner-${index + 1}`,
    name: asString(runner.horse),
    number: asNumber(rawNumber) || index + 1,
    jockey: asString(runner.jockey),
    trainer: asString(runner.trainer),
    recentForm: parseForm(runner.form),
    currentOdds: null,
    openingOdds: null,
    weight: formatWeight(runner.lbs),
    age: asNumber(runner.age),
    status: isNonRunner ? 'non-runner' : 'runner',
  };
};

const getCredentials = () => {
  const username = (process.env.RACING_API_USERNAME || '').trim();
  const password = (process.env.RACING_API_PASSWORD || '').trim();
  if (!username || !password) {
    throw new Error('Missing RACING_API_USERNAME or RACING_API_PASSWORD');
  }
  return Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
};

const throttle = async () => {
  const previous = requestQueue;
  let release!: () => void;
  requestQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastRequestAt = Date.now();
  release();
};

const requestPage = async (path: string, collection: 'racecards' | 'results'): Promise<unknown[]> => {
  const cached = pageCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  await throttle();
  const baseUrl = (process.env.RACING_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Basic ${getCredentials()}`,
      Accept: 'application/json',
      'User-Agent': 'TurfAI/1.0',
    },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`The Racing API ${response.status}: ${detail || response.statusText}`);
  }
  const page = await response.json() as RacingApiPage;
  const items = Array.isArray(page[collection]) ? page[collection] as unknown[] : [];
  pageCache.set(path, { value: items, expiresAt: Date.now() + CACHE_TTL_MS });
  return items;
};

const isUkOrIreland = (region: string) => ['gb', 'ire', 'uk'].includes(normalize(region));

export const fetchRacingApiRacecards = async (): Promise<Race[]> => {
  const racecards = await requestPage('/v1/racecards/free?day=today&limit=500', 'racecards');
  const races = racecards.filter((value) => {
    const region = asString(asObject(value).region);
    return !region || isUkOrIreland(region);
  }).map((value) => {
    const card = asObject(value);
    const course = asString(card.course);
    // `off_time` is often a 12-hour value without AM/PM (for example `6:13`).
    // Prefer `off_dt`, which carries the unambiguous local 24-hour time.
    const time = formatTime(card.off_dt || card.off_time);
    const runners = Array.isArray(card.runners) ? card.runners : [];
    return {
      id: `${course}-${time}`,
      time,
      course,
      name: asString(card.race_name),
      distance: formatDistance(card.distance_f),
      going: asString(card.going),
      weather: asString(card.weather),
      class: asString(card.race_class),
      horses: runners.map(mapRunner).filter((runner) => runner.name),
      status: statusFromApi(card.race_status),
    } satisfies Race;
  }).filter((race) => race.course && race.time);
  return enrichRacesWithSkyBetOdds(races);
};

export const fetchRacingApiRacecard = async (course: string, time: string): Promise<Race | null> => {
  const races = await fetchRacingApiRacecards();
  const wantedMinutes = parseTimeToMinutes(time);
  return races.find((race) => {
    if (normalize(race.course) !== normalize(course)) return false;
    const raceMinutes = parseTimeToMinutes(race.time);
    return wantedMinutes !== null && raceMinutes !== null
      ? wantedMinutes === raceMinutes
      : normalize(race.time) === normalize(time);
  }) || null;
};

const runnerPosition = (runner: Record<string, any>): number =>
  asNumber(runner.position || runner.pos || runner.finish_position);

export const fetchRacingApiResults = async (): Promise<Array<{ course: string; time: string; winner: string; placed: string[] }>> => {
  const results = await requestPage('/v1/results/today/free?limit=100', 'results');
  return results.filter((value) => {
    const region = asString(asObject(value).region);
    return !region || isUkOrIreland(region);
  }).map((value) => {
    const result = asObject(value);
    const runners = (Array.isArray(result.runners) ? result.runners : [])
      .map(asObject)
      .filter((runner) => runnerPosition(runner) > 0)
      .sort((a, b) => runnerPosition(a) - runnerPosition(b));
    const placed = runners.slice(0, 4).map((runner) => asString(runner.horse)).filter(Boolean);
    return {
      course: asString(result.course),
      time: formatTime(result.off_dt || result.off || result.off_time),
      winner: placed[0] || '',
      placed,
    };
  }).filter((result) => result.course && result.time && result.winner);
};

export const findRacingApiResult = async (course: string, time: string) => {
  const results = await fetchRacingApiResults();
  const wantedMinutes = parseTimeToMinutes(time);
  return results.find((result) => {
    if (normalize(result.course) !== normalize(course)) return false;
    const resultMinutes = parseTimeToMinutes(result.time);
    return wantedMinutes !== null && resultMinutes !== null
      ? Math.abs(wantedMinutes - resultMinutes) <= 2
      : normalize(result.time) === normalize(time);
  }) || null;
};
