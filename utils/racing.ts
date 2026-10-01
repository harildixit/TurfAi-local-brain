import type { Horse } from '../types';

export const isActiveRunner = (horse: Horse) => horse.status !== 'non-runner';

export const getActiveRunners = (horses: Horse[] = []) => horses.filter(isActiveRunner);

export const getActiveRunnerCount = (horses: Horse[] = []) => getActiveRunners(horses).length;
