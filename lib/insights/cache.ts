// lib/insights/cache.ts
import { logger } from "@/lib/logger";

export interface InsightRun {
    id: string;
    timestamp: Date;
    // Add other properties as needed
}

// Simulated storage for the sake of example
const insightRuns: InsightRun[] = [];

/**
 * Retrieves the latest insight run.
 */
export const getLatestInsightRun = (): InsightRun | null => {
    if (insightRuns.length === 0) return null;
    return insightRuns.reduce((latest, run) => (run.timestamp > latest.timestamp ? run : latest));
};

/**
 * Invalidates all insight runs, effectively clearing the cache.
 */
export const invalidateInsightRuns = (): void => {
    insightRuns.length = 0; // Clear all runs
};

/**
 * Computes insights if certain conditions are met (you can define those conditions).
 */
export const computeInsightsIfNeeded = (): void => {
    // Logic to determine if insights need computing and perform the computation
    // Add computation logic here
    logger.info("Computing insights if needed...");
    // For example, check timestamps and decide whether to compute
};
