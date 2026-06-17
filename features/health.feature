Feature: Server health
  A green Cloudflare Pages build does not prove the deployed server runs — PR
  #19 built fine and still took production down at runtime. These scenarios
  boot the server and confirm it actually serves requests.

  Scenario: The verify endpoint identifies the running app
    When I request "/api/verify" with the site token
    Then the response identifies the app as "Sink"

  Scenario: Unauthenticated API requests are rejected
    When I request "/api/verify" without a token
    Then the response status is 401
