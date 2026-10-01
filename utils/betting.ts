
import { Prediction, ActualResults } from '../types.js';
import { normalizeName } from './formatting.js';

export const analyzeWinningBets = (
  prediction: Prediction | null | undefined,
  actualResults: ActualResults | null | undefined,
  runnerCount: number
): string[] => {
  if (!prediction || !actualResults) return [];
  
  const bets: string[] = [];
  const pWinner = normalizeName(prediction.winner);
  // Include the three placed predictions so the full AI 1st–4th order can be
  // evaluated against the official top four.
  const pPlaced = (prediction.placed || []).slice(0, 3).map(normalizeName);
  const aWinner = normalizeName(actualResults.winner);
  const aPlaced = (actualResults.placed || [])
    .map(normalizeName)
    .filter(p => p !== aWinner);
  
  // Full ordered lists
  const aiOrder = [pWinner, ...pPlaced];
  const actualOrder = [aWinner, ...aPlaced];
  
  // 1. Single (Win)
  // Check if the horse the AI picked to win actually finished first.
  if (pWinner === aWinner) bets.push('Win Single');

  // 2. Each Way
  // Check if any of the AI's top 4 predictions finished in the top 4 official results.
  const top4Pred = aiOrder.slice(0, 4);
  const top4Actual = actualOrder.slice(0, 4);
  const anyPlaced = top4Pred.some(p => top4Actual.includes(p));
  
  if (anyPlaced) {
      bets.push('Each Way (Top 4)');
  }

  // 3. Forecast
  // Check if the AI’s first and second picks finished first and second in the exact same order.
  if (aiOrder.length >= 2 && actualOrder.length >= 2) {
    if (aiOrder[0] === actualOrder[0] && aiOrder[1] === actualOrder[1]) {
      bets.push('Forecast');
    }
  }

  // 4. Reverse Forecast
  // Check if the AI’s two selected horses finished first and second in any order.
  if (aiOrder.length >= 2 && actualOrder.length >= 2) {
    const top2Pred = aiOrder.slice(0, 2);
    const top2Actual = actualOrder.slice(0, 2);
    // Check if every horse in the top 2 actual results is present in the top 2 predictions
    const isReverse = top2Actual.every(h => top2Pred.includes(h));
    if (isReverse) bets.push('Reverse Forecast');
  }

  // 5. Combination Forecast
  // A Combination Forecast is a pair-based bet. Generate all unordered pairs
  // from the AI's top 4 selected horses (e.g. A-B through C-D).
  // The bet wins only if the actual 1st and 2nd finishers exactly match one of those pairs.
  const top4Selections = aiOrder.slice(0, 4);
  if (top4Selections.length >= 4 && actualOrder.length >= 2) {
     const pairs: string[][] = [];
     // Generate all unique pairs from top 4
     for (let i = 0; i < top4Selections.length; i++) {
       for (let j = i + 1; j < top4Selections.length; j++) {
         pairs.push([top4Selections[i], top4Selections[j]]);
       }
     }

     const actualFirst = actualOrder[0];
     const actualSecond = actualOrder[1];

     // Check if actual 1st/2nd match any pair (order independent)
     const match = pairs.some(pair => {
       return (pair.includes(actualFirst) && pair.includes(actualSecond));
     });

     if (match) bets.push('Combination Forecast');
  }

  // 6. Tricast
  // Check if the AI’s first, second, and third picks finished first, second, and third in the exact order.
  if (aiOrder.length >= 3 && actualOrder.length >= 3) {
    if (aiOrder[0] === actualOrder[0] && 
        aiOrder[1] === actualOrder[1] && 
        aiOrder[2] === actualOrder[2]) {
      bets.push('Tricast');
    }
  }

  // 7. Combination Tricast
  // Check if the actual first, second, and third horses all appear within the
  // AI's top 4 selection pool,
  // regardless of order, as long as one of the combinations matches the exact finishing order.
  if (aiOrder.length >= 3 && actualOrder.length >= 3) {
    const top3Actual = actualOrder.slice(0, 3);
    const match = top3Actual.every(h => top4Pred.includes(h));
    if (match) bets.push('Combination Tricast');
  }

  return bets;
};
