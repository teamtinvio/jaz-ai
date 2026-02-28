/**
 * Tool executor — wraps registry tool execution with logging and error handling.
 *
 * Includes transparent cache layer for read-only tools:
 * - Prefetch populates the cache before the LLM runs
 * - Executor checks cache before calling the API
 * - Executor stores results after successful API calls
 * - Result: zero redundant API calls for prefetched entities
 */
import type { AgentContext } from '../../agent/context.js';
import { getToolByName } from './lookup.js';
import { validateAndWarn } from '../../agent/validation.js';
import { buildCacheKey } from '../../agent/entity-cache.js';
import { log } from '../../serve/logger.js';

/**
 * Execute a tool by name against the API.
 * Returns the result as a JSON string for the LLM response.
 *
 * Logs tool calls to ctx.toolCalls for actions summary.
 */
export async function executeTool(
  ctx: AgentContext,
  toolName: string,
  input: Record<string, unknown>,
): Promise<string> {
  const startTime = Date.now();
  const tool = getToolByName(toolName);

  if (!tool) {
    const errorMsg = `Unknown tool: ${toolName}`;
    ctx.toolCalls.push({ tool_name: toolName, input, output: null, error: errorMsg });
    log.warn({ tool: toolName }, errorMsg);
    return JSON.stringify({ error: errorMsg });
  }

  // Validate write tool inputs (fail-open: returns error as tool result for self-correction)
  const validationError = validateAndWarn(tool, input);
  if (validationError) {
    ctx.toolCalls.push({
      tool_name: toolName,
      input,
      output: null,
      error: validationError,
    });
    return JSON.stringify({ error: validationError });
  }

  // ── Cache check (read-only tools only) ──────────────────────────
  if (tool.readOnly && ctx.cache) {
    const cacheKey = buildCacheKey(toolName, input);
    const cached = ctx.cache.get<unknown>(cacheKey);
    if (cached !== null) {
      const output = typeof cached === 'string' ? cached : JSON.stringify(cached);
      ctx.toolCalls.push({ tool_name: toolName, input, output: cached });
      log.info({ tool: toolName, cacheHit: true }, 'Tool cache hit');
      return output;
    }
  }

  try {
    const result = await tool.execute(ctx, input);
    const output = typeof result === 'string' ? result : JSON.stringify(result);

    // ── Cache store (read-only tools only) ────────────────────────
    if (tool.readOnly && ctx.cache) {
      ctx.cache.set(buildCacheKey(toolName, input), result);
    }

    ctx.toolCalls.push({
      tool_name: toolName,
      input,
      output: result,
    });

    log.info(
      { tool: toolName, durationMs: Date.now() - startTime },
      'Tool executed',
    );

    return output;
  } catch (err) {
    const errorMsg = (err as Error).message;

    ctx.toolCalls.push({
      tool_name: toolName,
      input,
      output: null,
      error: errorMsg,
    });

    log.warn(
      { tool: toolName, error: errorMsg, durationMs: Date.now() - startTime },
      'Tool failed',
    );

    return JSON.stringify({ error: errorMsg });
  }
}
