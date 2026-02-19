import { v4 as uuid } from 'uuid';
import { PersonaOutputSchema, type PersonaOutput, type PersonaFinding } from '@/lib/schemas/persona-output.schema';
import { FinalVerdictOutputSchema, type FinalVerdictOutput, type FinalVerdictFinding, DebateRoundOutputSchema } from '@/lib/schemas/debate.schema';
import { type Finding } from '@/lib/schemas/finding.schema';
import { PatchPlanSchema, type PatchPlan, type PatchAction } from '@/lib/schemas/patch-plan.schema';
import { getJob, updateJob, getJobFile, saveJobFile } from '@/lib/jobs/job-manager';
import { logger } from '@/lib/logger/logger';
import { PROVIDERS } from '@/lib/config/env.config';

interface ConsolidatedData {
  findings: Finding[];
  patchPlan: PatchPlan;
  generalSuggestions: string[];
  providersUsed: string[];
  debateMode: 'single' | 'debate';
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function areSimilarFindings(a: { blockId: string; severity: string }, b: { blockId: string; severity: string }): boolean {
  if (a.blockId !== b.blockId) return false;
  const sevDiff = Math.abs(SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  if (sevDiff > 1) return false;
  return true;
}

function pickHighestSeverity(severities: string[]): string {
  return severities.sort((a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b])[0];
}

/**
 * Consolidate using verdict data (debate mode).
 * Verdict findings already include confidence and debateNotes.
 */
async function consolidateFromVerdict(
  jobId: string,
  verdictOutputs: { provider: string; output: FinalVerdictOutput }[],
): Promise<{ findings: Finding[]; generalSuggestions: string[]; providersUsed: string[] }> {
  // Count agrees/disagrees from debate round
  const debateStances: Record<string, { agrees: number; disagrees: number }> = {};

  for (const provider of PROVIDERS) {
    const raw = await getJobFile(jobId, `personas/debate/${provider}.json`);
    if (!raw) continue;
    try {
      const debate = DebateRoundOutputSchema.parse(JSON.parse(raw.toString()));
      for (const response of debate.responses) {
        const key = `${response.originalProvider}:${response.blockId}`;
        if (!debateStances[key]) debateStances[key] = { agrees: 0, disagrees: 0 };
        if (response.stance === 'agree') debateStances[key].agrees++;
        else if (response.stance === 'disagree') debateStances[key].disagrees++;
        else {
          // adjust counts as partial agree
          debateStances[key].agrees++;
        }
      }
    } catch {
      // skip invalid debate output
    }
  }

  // Collect all verdict findings with source
  const allFindings: { finding: FinalVerdictFinding; provider: string }[] = [];
  for (const { provider, output } of verdictOutputs) {
    for (const finding of output.findings) {
      allFindings.push({ finding, provider });
    }
  }

  // Group similar findings
  const groups: { findings: { finding: FinalVerdictFinding; provider: string }[] }[] = [];
  for (const item of allFindings) {
    let placed = false;
    for (const group of groups) {
      if (areSimilarFindings(group.findings[0].finding, item.finding)) {
        group.findings.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push({ findings: [item] });
    }
  }

  // Merge into consolidated findings with debate enrichment
  const consolidatedFindings: Finding[] = groups.map((group) => {
    const representatives = group.findings;
    const first = representatives[0].finding;
    const sources = [...new Set(representatives.map((r) => r.provider))];
    const severities = representatives.map((r) => r.finding.severity);

    // Pick the best finding (highest severity)
    const bestFinding = representatives.sort(
      (a, b) => SEVERITY_ORDER[a.finding.severity] - SEVERITY_ORDER[b.finding.severity],
    )[0].finding;

    // Aggregate confidence: use strongest confidence from any provider
    const confidenceOrder = { strong: 0, moderate: 1, weak: 2 };
    const bestConfidence = representatives
      .map((r) => r.finding.confidence)
      .sort((a, b) => confidenceOrder[a] - confidenceOrder[b])[0];

    // Combine debate notes
    const notes = representatives
      .map((r) => r.finding.debateNotes)
      .filter(Boolean)
      .join(' | ');

    // Get debate stance counts for this blockId
    const stanceKey = `${representatives[0].provider}:${first.blockId}`;
    const stances = debateStances[stanceKey] ?? { agrees: 0, disagrees: 0 };

    return {
      id: uuid(),
      blockId: first.blockId,
      severity: pickHighestSeverity(severities) as Finding['severity'],
      original: bestFinding.original,
      suggested: bestFinding.suggested,
      justification: bestFinding.justification,
      consensus: sources.length,
      sources,
      confidence: bestConfidence,
      debateNotes: notes || undefined,
      agreesCount: stances.agrees || undefined,
      disagreesCount: stances.disagrees || undefined,
    };
  });

  // Sort by severity then blockId
  consolidatedFindings.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.blockId.localeCompare(b.blockId);
  });

  // Collect general suggestions
  const allSuggestions = new Set<string>();
  for (const { output } of verdictOutputs) {
    for (const suggestion of output.generalSuggestions ?? []) {
      allSuggestions.add(suggestion);
    }
  }

  return {
    findings: consolidatedFindings,
    generalSuggestions: [...allSuggestions],
    providersUsed: verdictOutputs.map((p) => p.provider),
  };
}

/**
 * Consolidate using Round 1 persona outputs only (single mode).
 */
function consolidateFromPersonas(
  personaOutputs: { provider: string; output: PersonaOutput }[],
): { findings: Finding[]; generalSuggestions: string[]; providersUsed: string[] } {
  const allFindings: { finding: PersonaFinding; provider: string }[] = [];
  for (const { provider, output } of personaOutputs) {
    for (const finding of output.findings) {
      allFindings.push({ finding, provider });
    }
  }

  const groups: { findings: { finding: PersonaFinding; provider: string }[] }[] = [];
  for (const item of allFindings) {
    let placed = false;
    for (const group of groups) {
      if (areSimilarFindings(group.findings[0].finding, item.finding)) {
        group.findings.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push({ findings: [item] });
    }
  }

  const consolidatedFindings: Finding[] = groups.map((group) => {
    const representatives = group.findings;
    const first = representatives[0].finding;
    const sources = [...new Set(representatives.map((r) => r.provider))];
    const severities = representatives.map((r) => r.finding.severity);

    const bestFinding = representatives.sort(
      (a, b) => SEVERITY_ORDER[a.finding.severity] - SEVERITY_ORDER[b.finding.severity],
    )[0].finding;

    return {
      id: uuid(),
      blockId: first.blockId,
      severity: pickHighestSeverity(severities) as Finding['severity'],
      original: bestFinding.original,
      suggested: bestFinding.suggested,
      justification: bestFinding.justification,
      consensus: sources.length,
      sources,
    };
  });

  consolidatedFindings.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.blockId.localeCompare(b.blockId);
  });

  const allSuggestions = new Set<string>();
  for (const { output } of personaOutputs) {
    for (const suggestion of output.generalSuggestions ?? []) {
      allSuggestions.add(suggestion);
    }
  }

  return {
    findings: consolidatedFindings,
    generalSuggestions: [...allSuggestions],
    providersUsed: personaOutputs.map((p) => p.provider),
  };
}

export async function consolidate(jobId: string): Promise<ConsolidatedData> {
  const meta = await getJob(jobId);
  if (!meta) throw new Error(`Job not found: ${jobId}`);

  await updateJob(jobId, { currentStage: 'consolidate' });

  const debateMode = meta.debateMode ?? 'single';
  let findings: Finding[];
  let generalSuggestions: string[];
  let providersUsed: string[];

  if (debateMode === 'debate') {
    // Try verdict outputs first
    const verdictOutputs: { provider: string; output: FinalVerdictOutput }[] = [];
    for (const provider of PROVIDERS) {
      const raw = await getJobFile(jobId, `personas/verdict/${provider}.json`);
      if (!raw) continue;
      try {
        const parsed = FinalVerdictOutputSchema.parse(JSON.parse(raw.toString()));
        verdictOutputs.push({ provider, output: parsed });
      } catch {
        logger.warn('Invalid verdict output, skipping', { jobId, provider });
      }
    }

    if (verdictOutputs.length >= 2) {
      logger.info('Consolidating from verdict outputs', { jobId, count: verdictOutputs.length });
      ({ findings, generalSuggestions, providersUsed } = await consolidateFromVerdict(jobId, verdictOutputs));
    } else {
      // Fallback to Round 1 if verdict didn't produce enough results
      logger.warn('Insufficient verdict outputs, falling back to Round 1', { jobId, verdictCount: verdictOutputs.length });
      const personaOutputs = await loadPersonaOutputs(jobId);
      ({ findings, generalSuggestions, providersUsed } = consolidateFromPersonas(personaOutputs));
    }
  } else {
    const personaOutputs = await loadPersonaOutputs(jobId);
    ({ findings, generalSuggestions, providersUsed } = consolidateFromPersonas(personaOutputs));
  }

  if (findings.length === 0 && providersUsed.length === 0) {
    throw new Error('No valid outputs found for consolidation');
  }

  // Generate PatchPlan
  const actions: PatchAction[] = findings
    .filter((f) => f.suggested && f.suggested !== f.original)
    .map((f) => ({
      blockId: f.blockId,
      original: f.original,
      suggested: f.suggested,
      justification: f.justification,
      severity: f.severity,
      consensus: f.consensus,
      sources: f.sources,
    }));

  const patchPlan: PatchPlan = PatchPlanSchema.parse({
    tenantId: meta.tenantId,
    jobId,
    actions,
    generatedAt: new Date().toISOString(),
  });

  const consolidatedData: ConsolidatedData = {
    findings,
    patchPlan,
    generalSuggestions,
    providersUsed,
    debateMode,
  };

  await saveJobFile(jobId, 'consolidated.json', JSON.stringify(consolidatedData, null, 2));

  logger.info('Consolidation completed', {
    jobId,
    debateMode,
    totalFindings: findings.length,
    providers: providersUsed.length,
  });

  return consolidatedData;
}

async function loadPersonaOutputs(jobId: string): Promise<{ provider: string; output: PersonaOutput }[]> {
  const outputs: { provider: string; output: PersonaOutput }[] = [];
  for (const provider of PROVIDERS) {
    const raw = await getJobFile(jobId, `personas/${provider}.json`);
    if (!raw) continue;
    try {
      const parsed = PersonaOutputSchema.parse(JSON.parse(raw.toString()));
      outputs.push({ provider, output: parsed });
    } catch {
      logger.warn('Invalid persona output, skipping', { jobId, provider });
    }
  }
  return outputs;
}
