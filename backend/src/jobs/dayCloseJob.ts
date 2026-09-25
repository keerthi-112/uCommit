import { closeMissedDays } from "../services/challengeDayCloser";

/**
 * Automatic close-out of missed days.
 *
 * OFF BY DEFAULT. This is the only thing in uCommit that takes money
 * from a stake with nobody pressing a button, so it stays disabled
 * until ENABLE_DAY_CLOSE is explicitly set to "true".
 *
 * No cron dependency is needed. closeMissedDays only ever charges a
 * day once - the unique index on (participantId, date) guarantees it -
 * so running on a plain interval is safe. Firing several times a day
 * simply means missed days are picked up sooner after midnight, and
 * a restart cannot double charge anything.
 */
export function startDayCloseJob() {
  const enabled =
    process.env.ENABLE_DAY_CLOSE ===
    "true";

  if (!enabled) {
    console.log(
      "[day-close] disabled. Set ENABLE_DAY_CLOSE=true to penalise missed days automatically."
    );
    return;
  }

  const hours = Number(
    process.env.DAY_CLOSE_INTERVAL_HOURS ??
      6
  );

  const intervalHours =
    Number.isFinite(hours) && hours > 0
      ? hours
      : 6;

  const run = async () => {
    try {
      const result =
        await closeMissedDays({
          dryRun: false,
        });

      if (result.daysPenalised > 0) {
        console.log(
          `[day-close] penalised ${result.daysPenalised} missed days across ${result.participantsAffected} participants (total ${result.totalPenalty}).`
        );
      }
    } catch (error) {
      // A failure here must never take the API down with it.
      console.error(
        "[day-close] run failed:",
        error
      );
    }
  };

  console.log(
    `[day-close] enabled, running every ${intervalHours}h.`
  );

  // Catch up on anything missed while the server was down.
  void run();

  const timer = setInterval(
    run,
    intervalHours * 60 * 60 * 1000
  );

  // Don't hold the process open on shutdown.
  timer.unref();

  return timer;
}
