export default eventHandler(() => {
  return {
    name: 'Sink',
    url: 'https://sink.cool',
    // Cloudflare Pages injects the deployed commit at build time; it's absent in
    // local dev. The preview-e2e gate polls this to confirm the branch-alias URL
    // is serving THIS commit before running the suite against it.
    commit: process.env.CF_PAGES_COMMIT_SHA ?? null,
  }
})
