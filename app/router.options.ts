import type { RouterConfig } from '@nuxt/schema'

// Mitigates CVE-2026-53721: vue-router matches paths case-insensitively by
// default while Nuxt's routeRules matcher is case-sensitive, so a route rule
// can be bypassed by varying the casing of the request path. Making the router
// case-sensitive aligns the two matchers and closes the bypass without the
// framework upgrade that took production down (PR #19, reverted in PR #20).
export default <RouterConfig>{
  sensitive: true,
}
