import {
  PrizeDistribution,
  PrizeDistributionEntry,
  PrizeOutcome,
  PrizeTier,
  TicketType,
} from '../domain/types.js';

const DEFAULT_POOL_SIZE = 100_000;

const clampProbability = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

const normaliseShares = (tiers: PrizeTier[]): PrizeTier[] => {
  const totalShare = tiers.reduce((total, tier) => total + (tier.share ?? 0), 0);
  if (totalShare <= 0) {
    return tiers;
  }
  return tiers.map((tier) => ({
    ...tier,
    share: (tier.share ?? 0) / totalShare,
  }));
};

export const buildPrizeDistribution = (
  ticket: TicketType,
  poolSize = DEFAULT_POOL_SIZE,
): PrizeDistribution => {
  const tiers = ticket.prizeTiers;
  if (!tiers.length) {
    return { entries: [], nonWinningProbability: 1 };
  }

  const allTiersHaveShare = tiers.every((tier) => typeof tier.share === 'number');
  if (allTiersHaveShare) {
    const normalisedShares = normaliseShares(
      tiers.map((tier) => ({ ...tier })),
    );
    const totalSales = poolSize * ticket.faceValue;
    const payoutTarget = totalSales * ticket.rtpTarget;
    let cumulative = 0;

    const entries = normalisedShares.map((tier) => {
      const tierShare = tier.share ?? 0;
      const tierBudget = payoutTarget * tierShare;
      if (tier.amount <= 0) {
        return {
          ...tier,
          expectedWins: 0,
          probability: 0,
        } satisfies PrizeDistributionEntry;
      }
      const rawExpectedWins = tierBudget / tier.amount;
      const expectedWins = rawExpectedWins >= 1 ? Math.floor(rawExpectedWins) : rawExpectedWins;
      const probability = clampProbability(expectedWins / poolSize);
      cumulative += probability;
      return {
        ...tier,
        expectedWins,
        probability,
      } satisfies PrizeDistributionEntry;
    });

    const nonWinningProbability = Math.max(0, 1 - cumulative);
    return { entries, nonWinningProbability };
  }

  const totalWeight = tiers.reduce((total, tier) => total + (tier.weight ?? 0), 0);
  if (totalWeight <= 0) {
    return {
      entries: tiers.map(
        (tier) =>
          ({
            ...tier,
            probability: 0,
          } satisfies PrizeDistributionEntry),
      ),
      nonWinningProbability: 1,
    } satisfies PrizeDistribution;
  }

  const rawProbabilities = tiers.map((tier) =>
    (tier.weight ?? 0) / totalWeight,
  );
  const expectedPayout = rawProbabilities.reduce((sum, probability, index) => {
    const amount = tiers[index]?.amount ?? 0;
    return sum + probability * amount;
  }, 0);
  const targetPayout = ticket.faceValue * ticket.rtpTarget;
  const scalingFactor = expectedPayout > 0 ? targetPayout / expectedPayout : 0;

  let probabilitySum = 0;
  const entries: PrizeDistributionEntry[] = tiers.map((tier, index) => {
    const scaledProbability = clampProbability(
      rawProbabilities[index]! * scalingFactor,
    );
    probabilitySum += scaledProbability;
    return {
      ...tier,
      probability: scaledProbability,
    } satisfies PrizeDistributionEntry;
  });

  if (probabilitySum > 1) {
    entries.forEach((entry) => {
      entry.probability = entry.probability / probabilitySum;
    });
    probabilitySum = 1;
  }

  const nonWinningProbability = Math.max(0, 1 - probabilitySum);

  return {
    entries,
    nonWinningProbability,
  } satisfies PrizeDistribution;
};

export interface RollPrizeOptions {
  rng?: () => number;
  rtpMultiplier?: number;
}

export const rollPrize = (
  distribution: PrizeDistribution,
  options: RollPrizeOptions = {},
): PrizeOutcome | null => {
  const rng = options.rng ?? Math.random;
  const rtpMultiplier = options.rtpMultiplier ?? 1;
  const scaledEntries = distribution.entries.map((entry) => ({
    ...entry,
    probability: clampProbability(entry.probability * rtpMultiplier),
  }));

  let totalWinProbability = scaledEntries.reduce(
    (sum, entry) => sum + entry.probability,
    0,
  );
  if (totalWinProbability > 1) {
    scaledEntries.forEach((entry) => {
      entry.probability = entry.probability / totalWinProbability;
    });
    totalWinProbability = 1;
  }

  const roll = (() => {
    const value = rng();
    if (!Number.isFinite(value)) {
      return Math.random();
    }
    if (value < 0) {
      return 0;
    }
    if (value > 1) {
      return value % 1;
    }
    return value;
  })();

  let cumulative = 0;
  for (const entry of scaledEntries) {
    cumulative += entry.probability;
    if (roll < cumulative) {
      return {
        label: entry.label,
        amount: entry.amount,
      } satisfies PrizeOutcome;
    }
  }

  return null;
};
