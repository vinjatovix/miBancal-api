@plants @plant-slug-lookup
Feature: Look up a plant by slug

  # The plant detail route accepts either a UUID or a slug. The slug is the
  # URL-friendly form of the scientific name, derived server-side.
  Scenario: Get a plant by its slug
    Given a family exists
    And the following plants exist:
      | name   | scientificName |
      | Garlic | allium sativum |
    When I send a GET request to "/api/v1/plants/allium-sativum"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "slug": "allium-sativum",
        "identity": { "scientificName": "allium sativum" }
      }
      """
    And response matches OpenAPI contract

  Scenario: An unknown slug returns 404
    Given a family exists
    When I send a GET request to "/api/v1/plants/this-slug-does-not-exist"
    Then the response status code should be 404
