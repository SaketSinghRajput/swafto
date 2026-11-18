/**
 * GRACEFUL SHUTDOWN (C-15 / uptime). What a container's SIGTERM has to do for a
 * deploy or a scale-in to cost nobody a request.
 *
 * THE SEQUENCE, AND WHY IT IS IN THIS ORDER
 *  1. FLIP READINESS. `GET /ready` answers 503 from now on (`isDraining`). The
 *     listener is STILL OPEN: a load balancer needs a few health-check intervals to
 *     notice and stop routing here, and a request that arrives in that window is
 *     served, not refused. Closing the port first is how a rolling deploy drops the
 *     requests that were already in flight to this instance.
 *  2. WAIT `readyGraceMs` for the balancer to see it. 0 where there is no balancer.
 *  3. STOP ACCEPTING AND DRAIN. `app.close()` closes the listener, lets every
 *     in-flight request finish, and closes idle keep-alive sockets (Fastify 5's
 *     default `forceCloseConnections: 'idle'`), so a request mid-flight is never cut.
 *  4. RELEASE THE POOLS - only after the last request, so none of them loses its
 *     connection mid-transaction on an append-only ledger.
 *  5. A DEADLINE. If the drain has not finished in `forceAfterMs` (choose less than
 *     the orchestrator's SIGKILL, e.g. 25 s against Docker's/ECS's/systemd's 30 s):
 *     - with `forceCloseConnections` (server.ts passes it) the sockets still held are cut:
 *       a client holding a connection open with a stalled request must not be able to make
 *       every deploy skip the pool release and exit unclean (RT-W3-3). The pools are then
 *       released and the process exits 0 - it drained as far as it could and left nothing
 *       open. Every push is idempotent by id, so a phone retries what was cut.
 *     - without it there is no way to force, so it gives up with exit 1 and the pools
 *       untouched, rather than be killed with transactions open.
 *
 * STATELESSNESS is what makes this enough: the API keeps no session or user state in
 * process (tokens are signed, the OTP store is Postgres, the ledger is Postgres), so
 * any instance can be stopped at any time and the next request lands on another.
 * The per-shop rate buckets and the closed-day memo ARE in process, and both are
 * derived and safe to lose.
 *
 * Idempotent: a second signal while draining does nothing.
 */
export interface ShutdownDeps {
  /** Fastify's `close()`: stops accepting, resolves when in-flight requests are done. */
  readonly closeServer: () => Promise<unknown>;
  /** Pools etc. Called at most once, after the server has drained (or been forced). */
  readonly closeResources: () => Promise<unknown>;
  readonly readyGraceMs: number;
  readonly forceAfterMs: number;
  /** Cut every remaining socket (Node's `server.closeAllConnections`). Optional. */
  readonly forceCloseConnections?: () => void;
  /** After forcing, how long `closeServer` gets to settle before the pools are released anyway. Default 2 s. */
  readonly afterForceMs?: number;
  readonly log: (line: string) => void;
}

export interface ShutdownHandle {
  /** True from the first `begin()`. Wire it into `AppDeps.isDraining`. */
  readonly isDraining: () => boolean;
  /** Resolves with the exit code the process should use: 0 clean (or forced and released), 1 failed or unable to force. */
  readonly begin: (reason: string) => Promise<0 | 1>;
}

export function gracefulShutdown(deps: ShutdownDeps): ShutdownHandle {
  let draining = false;
  let done: Promise<0 | 1> | null = null;
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  // The pools are released once, whichever path gets there first.
  let resources: Promise<unknown> | null = null;
  const closeResourcesOnce = () => (resources ??= Promise.resolve(deps.closeResources()));
  const line = (o: object) => deps.log(JSON.stringify(o) + '\n');

  const run = async (reason: string): Promise<0 | 1> => {
    line({ level: 'info', msg: 'shutdown begins', reason, readyGraceMs: deps.readyGraceMs });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<'timeout'>((r) => {
      timer = setTimeout(() => r('timeout'), deps.forceAfterMs);
    });
    let serverClosed: Promise<unknown> = Promise.resolve();
    const orderly = (async () => {
      if (deps.readyGraceMs > 0) await sleep(deps.readyGraceMs);
      serverClosed = Promise.resolve(deps.closeServer());
      await serverClosed;
      await closeResourcesOnce();
      return 'drained' as const;
    })();
    orderly.catch(() => undefined); // a rejection after the deadline is already accounted for
    try {
      const outcome = await Promise.race([orderly, deadline]);
      if (outcome === 'timeout') {
        line({ level: 'error', msg: 'shutdown deadline passed with requests still open', forceAfterMs: deps.forceAfterMs, forcing: deps.forceCloseConnections !== undefined });
        if (!deps.forceCloseConnections) return 1;
        deps.forceCloseConnections();
        // Once its sockets are gone the server settles at once; the pools are released either way.
        await Promise.race([serverClosed.catch(() => undefined), sleep(deps.afterForceMs ?? 2_000)]);
        await closeResourcesOnce();
        line({ level: 'info', msg: 'shutdown complete after forcing held connections closed' });
        return 0;
      }
      line({ level: 'info', msg: 'shutdown complete' });
      return 0;
    } catch (e) {
      line({ level: 'error', msg: 'shutdown failed', error: String((e as Error)?.message ?? e).slice(0, 300) });
      return 1;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  return {
    isDraining: () => draining,
    begin(reason) {
      if (!done) {
        draining = true;
        done = run(reason);
      }
      return done;
    },
  };
}
