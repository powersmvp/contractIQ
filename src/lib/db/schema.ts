/** Snake_case shape returned by Supabase PostgREST */
export interface DbJobRow {
  id: string;
  tenant_id: string;
  status: string;
  contract_type: string;
  side: string;
  jurisdiction: string;

  current_stage: string | null;
  progress_completed: number | null;
  progress_total: number | null;

  debate_mode: string | null;
  selected_providers: string[] | null;

  error_code: string | null;
  error_message: string | null;

  feedback_rating: string | null;
  feedback_reason: string | null;
  feedback_comment: string | null;
  feedback_created_at: string | null;

  docast: unknown;
  persona_outputs: Record<string, unknown> | null;
  debate_outputs: Record<string, unknown> | null;
  verdict_outputs: Record<string, unknown> | null;
  consolidated: unknown;
  report: unknown;

  created_at: string;
  updated_at: string;
}

/** CamelCase shape used by the rest of the app (matches previous Drizzle $inferSelect) */
export interface JobRow {
  id: string;
  tenantId: string;
  status: string;
  contractType: string;
  side: string;
  jurisdiction: string;

  currentStage: string | null;
  progressCompleted: number | null;
  progressTotal: number | null;

  debateMode: string | null;
  selectedProviders: string[] | null;

  errorCode: string | null;
  errorMessage: string | null;

  feedbackRating: string | null;
  feedbackReason: string | null;
  feedbackComment: string | null;
  feedbackCreatedAt: Date | null;

  docast: unknown;
  personaOutputs: Record<string, unknown> | null;
  debateOutputs: Record<string, unknown> | null;
  verdictOutputs: Record<string, unknown> | null;
  consolidated: unknown;
  report: unknown;

  createdAt: Date;
  updatedAt: Date;
}

/** Map a PostgREST snake_case row to the camelCase JobRow shape */
export function dbRowToJobRow(raw: DbJobRow): JobRow {
  return {
    id: raw.id,
    tenantId: raw.tenant_id,
    status: raw.status,
    contractType: raw.contract_type,
    side: raw.side,
    jurisdiction: raw.jurisdiction,
    currentStage: raw.current_stage,
    progressCompleted: raw.progress_completed,
    progressTotal: raw.progress_total,
    debateMode: raw.debate_mode,
    selectedProviders: raw.selected_providers,
    errorCode: raw.error_code,
    errorMessage: raw.error_message,
    feedbackRating: raw.feedback_rating,
    feedbackReason: raw.feedback_reason,
    feedbackComment: raw.feedback_comment,
    feedbackCreatedAt: raw.feedback_created_at ? new Date(raw.feedback_created_at) : null,
    docast: raw.docast,
    personaOutputs: raw.persona_outputs,
    debateOutputs: raw.debate_outputs,
    verdictOutputs: raw.verdict_outputs,
    consolidated: raw.consolidated,
    report: raw.report,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
  };
}

export type NewJobRow = Partial<DbJobRow> & Pick<DbJobRow, 'tenant_id' | 'contract_type' | 'side' | 'jurisdiction'>;
