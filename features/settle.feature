Feature: Preview readiness settle window
  The Cloudflare Pages branch alias cuts over per-PoP and eventually-consistently,
  and every probe from a GitHub runner lands on the same PoP (anycast picks it from
  the runner's source IP), so we cannot observe the PoPs that are still serving the
  old target. PR #42 required 3 consecutive matches at 5s apart — a ~15s burst that
  a single already-cut-over PoP satisfies while others still 404 everything, which
  is how PR #60 flaked. Since the other PoPs are unobservable, readiness has to be
  gated on elapsed time as well as on consecutive matches.

  Scenario: A burst of matches inside the settle window is not enough
    Given a preview that always probes ready
    When I wait for it to settle needing 3 matches over 30 seconds, probing every 5 seconds
    Then it settles no sooner than 30 seconds in

  Scenario: A not-ready probe restarts the settle window
    Given a preview that probes ready for 20 seconds, then 404s once, then is ready
    When I wait for it to settle needing 3 matches over 30 seconds, probing every 5 seconds
    Then it settles no sooner than 55 seconds in

  Scenario: A preview that never becomes ready still fails
    Given a preview that never probes ready
    When I wait for it to settle needing 3 matches over 30 seconds, probing every 5 seconds
    Then waiting for it to settle fails
