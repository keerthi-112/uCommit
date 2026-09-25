/**
 * The AI accountability coach.
 *
 * Design rules, in order of importance:
 *
 *  1. The model never computes anything. Streaks, consistency, misses
 *     and money are calculated from the database by code that is tested.
 *     Claude receives those finished numbers and only puts them into
 *     words. An LLM doing arithmetic on a user's stake is a bug waiting
 *     to happen.
 *
 *  2. Minimum necessary data. Only the signed in user's own aggregate
 *     figures are sent. No email, no user id, no other participant's
 *     activity, no proof URLs.
 *
 *  3. Degrades quietly. With no API key configured the endpoint returns
 *     a clear "not configured" result and the rest of uCommit is
 *     unaffected. An AI outage must never break the dashboard.
 */

import Anthropic from "@anthropic-ai/sdk";

/** Facts the coach is allowed to see. All computed server side. */
export interface CoachFacts {
  name: string;
  currentStreak: number;
  longestStreak: number;
  approvedDays: number;
  expectedDays: number;
  consistency: number | null;
  activeChallenges: number;
  completedChallenges: number;
  eliminatedChallenges: number;
  pendingSubmissions: number;
  /** Weekday name -> approved submissions, to ground any pattern claim. */
  byWeekday: Record<string, number>;
  challenges: {
    title: string;
    misses: number;
    maxMisses: number;
    daysElapsed: number;
    totalDays: number;
    approvedDays: number;
  }[];
}

export type CoachResult =
  | {
      status: "ok";
      message: string;
      model: string;
    }
  | {
      status: "not_configured";
      message: string;
    }
  | {
      status: "unavailable";
      message: string;
    };

const MODEL = "claude-opus-5";

const SYSTEM_PROMPT = `You are the accountability coach inside uCommit, a platform where people stake their own money on daily goals and submit proof each day.

You will be given a single user's real statistics as JSON. Write them a short, direct reflection.

Rules you must follow:
- Use ONLY the numbers provided. Never invent, estimate or extrapolate a figure. If something is not in the data, do not mention it.
- Do not congratulate someone on a streak they do not have, and do not scold someone for misses they have not had.
- If a weekday pattern is visible in byWeekday, you may name it. If the counts are too small or too even to support a claim, say nothing about patterns.
- consistency of null means they have not been expected to show up yet. Treat them as brand new; do not call that 0%.
- Give at most one concrete, achievable suggestion, tied to what the data actually shows.
- Never mention money, stakes, penalties or elimination as a threat. Accountability here is about the habit, not fear.
- No emoji. No headings. No bullet lists.

Write 2 to 4 sentences, second person, plain and warm. Sound like a coach who read their numbers, not a motivational poster.`;

/** Returns null when no key is configured. */
function getClient(): Anthropic | null {
  const apiKey =
    process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  return new Anthropic({
    apiKey,
    // A coach message is not worth holding a request open for.
    timeout: 20000,
    maxRetries: 1,
  });
}

export function isCoachConfigured(): boolean {
  return getClient() !== null;
}

export async function generateCoachMessage(
  facts: CoachFacts
): Promise<CoachResult> {
  const client = getClient();

  if (!client) {
    return {
      status: "not_configured",
      message:
        "The AI coach is not configured on this server. Add ANTHROPIC_API_KEY to enable it.",
    };
  }

  try {
    const response =
      await client.messages.create({
        model: MODEL,
        // Deliberately short output: the coach writes a few sentences,
        // and a low ceiling keeps the cost per dashboard load small.
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        // Summarising prepared numbers is not a reasoning-heavy task.
        output_config: { effort: "low" },
        messages: [
          {
            role: "user",
            content: JSON.stringify(
              facts
            ),
          },
        ],
      });

    if (
      response.stop_reason === "refusal"
    ) {
      return {
        status: "unavailable",
        message:
          "The coach could not produce a message for this data.",
      };
    }

    const text = response.content
      .filter(
        (
          block
        ): block is Anthropic.TextBlock =>
          block.type === "text"
      )
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) {
      return {
        status: "unavailable",
        message:
          "The coach returned an empty response.",
      };
    }

    return {
      status: "ok",
      message: text,
      model: response.model,
    };
  } catch (error) {
    // Every failure below is logged for us and softened for the user.
    // The dashboard must still render without its coach paragraph.
    if (
      error instanceof
      Anthropic.AuthenticationError
    ) {
      console.error(
        "[ai-coach] rejected API key"
      );

      return {
        status: "unavailable",
        message:
          "The AI coach is misconfigured on this server.",
      };
    }

    if (
      error instanceof
      Anthropic.RateLimitError
    ) {
      return {
        status: "unavailable",
        message:
          "The coach is busy right now. Try again in a moment.",
      };
    }

    if (
      error instanceof Anthropic.APIError
    ) {
      console.error(
        `[ai-coach] API error ${error.status}:`,
        error.message
      );
    } else {
      console.error(
        "[ai-coach] unexpected failure:",
        error
      );
    }

    return {
      status: "unavailable",
      message:
        "The coach is unavailable right now.",
    };
  }
}
