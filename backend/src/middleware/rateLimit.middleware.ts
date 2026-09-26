import rateLimit from "express-rate-limit";
import type { Request } from "express";

/**
 * Request throttling.
 *
 * Sign in had no limit at all, so passwords could be guessed as fast as
 * the network allowed. bcrypt makes each attempt slow to verify, which
 * also means an unlimited endpoint is a cheap way to burn the server's
 * CPU.
 *
 * Limits are per IP. Behind a proxy or load balancer, set
 * `app.set("trust proxy", 1)` in app.ts - otherwise every request looks
 * like it came from the proxy and the whole world shares one bucket.
 */

const isProduction =
  process.env.NODE_ENV === "production";

const LOOPBACK = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);

/**
 * Outside production, requests from this machine are not counted.
 *
 * The integration suite makes hundreds of calls from 127.0.0.1 and
 * would otherwise lock itself out, and local development would hit the
 * sign-in limit while someone is simply testing a login. Real traffic
 * never arrives from loopback, so production is unaffected - and there
 * the skip is off entirely regardless of address.
 */
const skipLocal = (req: Request) =>
  !isProduction &&
  LOOPBACK.has(req.ip ?? "");

const message = (text: string) => ({
  message: text,
});

/**
 * Sign in. Strict, because this is the endpoint worth guessing at.
 * Only failed attempts count, so somebody using the app normally is
 * never locked out by their own successful logins.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  skip: skipLocal,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message(
    "Too many sign in attempts. Please wait a few minutes and try again."
  ),
});

/** Account creation, to stop scripted signups. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  skip: skipLocal,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message(
    "Too many accounts created from here. Please try again later."
  ),
});

/**
 * Everything else. Generous - a backstop against runaway clients and
 * crude scraping, not a throttle on normal use.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  skip: skipLocal,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message(
    "Too many requests. Please slow down."
  ),
});
