/**
 * Acknowledgment detection — skip the agent loop for simple auto-replies.
 *
 * Shared by email and embedded chat channels.
 * Ported from previous version's no_reply patterns.
 *
 * Design:
 * - Never skip if attachments present (user may be sending files)
 * - Emoji-only messages (≤10 chars) are auto-replies
 * - Exact match patterns for common acknowledgments/closings
 * - Messages >60 chars always pass through (likely have real content)
 */

/** Exact-match acknowledgment patterns (lowercase, no trailing punctuation). */
const EXACT_PATTERNS = [
  // Simple affirmatives
  'ok', 'okay', 'yes', 'yep', 'yeah', 'yup', 'sure', 'alright',
  // Acknowledgments
  'got it', 'noted', 'acknowledged', 'received', 'understood', 'will do',
  // Thanks
  'thank you', 'thanks', 'ty', 'thx', 'thanks!',
  // Combinations
  'ok thanks', 'ok thank you', 'okay thanks', 'okay thank you',
  'great thanks', 'great thank you', 'great, thanks', 'great, thank you',
  'perfect thanks', 'perfect thank you', 'perfect, thanks',
  'awesome thanks', 'awesome thank you', 'awesome, thanks',
  'sounds good', 'sounds good thanks', 'sounds great',
  'thanks for the help', 'thank you for the help',
  'thanks for your help', 'thank you for your help',
  'much appreciated', 'appreciate it',
  // Closings
  'no worries', 'no problem', 'all good', 'good',
  'nice', 'cool', 'wonderful', 'excellent',
];

/**
 * Detect whether a message is a simple acknowledgment that doesn't need
 * an agent response (or needs only a minimal static reply).
 *
 * @param body     - Raw message body text
 * @param hasAttachments - Whether the message includes file attachments
 * @returns true if the message is an acknowledgment
 */
export function isAcknowledgment(body: string, hasAttachments = false): boolean {
  // Never skip if attachments present — user may be sending files for processing
  if (hasAttachments) return false;

  const trimmed = body.trim();

  // Emoji-only messages (one or more emoji, no other text)
  if (/^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}\s]+$/u.test(trimmed) && trimmed.length <= 10) {
    return true;
  }

  const lower = trimmed.toLowerCase();

  // Must be short — longer messages likely have real content
  if (lower.length > 60) return false;

  // Strip trailing punctuation for matching
  const stripped = lower.replace(/[.!,]+$/, '').trim();
  return EXACT_PATTERNS.includes(stripped);
}
