@plant-relations
Feature: Public Consultation of Plant Relations Collection
  In order to plan polycultures and companion plantings
  As an anonymous visitor, gardener, or curator
  I want to list, filter, and paginate plant companion relations

  Background:
    Given seeded plant relations exist

  Scenario: Public visitor lists plant relations with pagination and default sort
    When I send a GET request to "/api/v1/plant-relations?pagination[page]=1&pagination[limit]=2"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "pagination": {
          "page": 1,
          "limit": 2
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: Public visitor filters relations by polarity type
    When I send a GET request to "/api/v1/plant-relations?filter[type][eq]=beneficial"
    Then the response status code should be 200
    And every item should match:
      | field | operator | value      |
      | type  | eq       | beneficial |
    And response matches OpenAPI contract

  Scenario: Public visitor filters relations by biological mechanism
    When I send a GET request to "/api/v1/plant-relations?filter[mechanism][eq]=pest_repellent"
    Then the response status code should be 200
    And every item should match:
      | field     | operator | value          |
      | mechanism | eq       | pest_repellent |
    And response matches OpenAPI contract

  Scenario: Public visitor filters relations by unified plantId
    When I send a GET request to "/api/v1/plant-relations?filter[plantId][eq]=0192e200-0000-7000-8000-000000000001"
    Then the response status code should be 200
    And response matches OpenAPI contract

  Scenario: Public visitor lists plant relations with embedded companion plants
    Given two catalog plants exist
    And a plant relation exists between the two plants
    When I send a GET request to "/api/v1/plant-relations?filter[plantId][eq]=<plantId>&include=sourcePlant,targetPlant"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "data": [
          {
            "id": "<plantRelationId>",
            "sourcePlant": {
              "id": "<sourcePlantId>"
            },
            "targetPlant": {
              "id": "<targetPlantId>"
            }
          }
        ]
      }
      """
    And response matches OpenAPI contract

