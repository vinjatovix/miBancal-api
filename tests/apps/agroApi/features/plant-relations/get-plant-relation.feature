@plant-relations
Feature: Get Plant Relation By ID
  In order to inspect complete scientific companion relationship data
  As an anonymous visitor, gardener, or curator
  I want to fetch a single plant relation by its UUID and verify its version ETag

  Background:
    Given a seeded plant relation exists with id "0192e201-0000-7000-8000-000000000001"

  Scenario: Public visitor retrieves existing plant relation by UUID
    When I send a GET request to "/api/v1/plant-relations/0192e201-0000-7000-8000-000000000001"
    Then the response status code should be 200
    And the response ETag should match the body version
    And the response body should contain
      """
      {
        "id": "0192e201-0000-7000-8000-000000000001",
        "sourcePlantId": "0192e200-0000-7000-8000-000000000002",
        "targetPlantId": "0192e200-0000-7000-8000-000000000001",
        "type": "beneficial",
        "mechanism": "pest_repellent",
        "strength": 4,
        "proximity": {
          "minDistanceCm": 0,
          "maxDistanceCm": 50
        },
        "version": 0
      }
      """
    And response matches OpenAPI contract

  Scenario: Public visitor retrieves existing plant relation with embedded companion plants
    Given two catalog plants exist
    And a plant relation exists between the two plants
    When I send a GET request to "/api/v1/plant-relations/<plantRelationId>?include=sourcePlant,targetPlant"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "id": "<plantRelationId>",
        "sourcePlantId": "<sourcePlantId>",
        "targetPlantId": "<targetPlantId>",
        "sourcePlant": {
          "id": "<sourcePlantId>"
        },
        "targetPlant": {
          "id": "<targetPlantId>"
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: Requesting nonexistent plant relation returns 404
    When I send a GET request to "/api/v1/plant-relations/0192e201-0000-7000-8000-000000000999"
    Then the response status code should be 404
    And the response body should contain
      """
      {
        "message": "PlantRelation not found: 0192e201-0000-7000-8000-000000000999"
      }
      """
    And response matches OpenAPI contract
