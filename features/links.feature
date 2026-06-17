Feature: Short links
  The core of the app: creating a short link and resolving it to its target.

  Scenario: Create a new shortened URL
    When I create a short link for "https://example.com/some/page"
    Then the short link is created

  Scenario: Resolve an existing shortened URL
    Given a short link pointing to "https://example.com/destination"
    When I visit the short link
    Then I am redirected to "https://example.com/destination"
