@plant-relations
Feature: Create Plant Relation
  In order to contribute companion relationship knowledge
  As an ecological collaborator or administrator
  I want to create a new directed plant companion relation

  Background:
    Given two catalog plants exist

  Scenario: Collaborator creates a plant relation successfully
    Given a POST collaborator request to "/api/v1/plant-relations" with body
      """
      {
        "id": "0192e201-0000-7000-8000-000000000010",
        "sourcePlantId": "<sourcePlantId>",
        "targetPlantId": "<targetPlantId>",
        "type": "beneficial",
        "mechanism": "nitrogen_fixer",
        "strength": 5,
        "proximity": {
          "minDistanceCm": 0,
          "maxDistanceCm": 40
        },
        "reason": "Fixes nitrogen in root nodules, improving companion vigor."
      }
      """
    Then the response status code should be 201
    And the response ETag should match the body version
    And the response body should contain
      """
      {
        "id": "0192e201-0000-7000-8000-000000000010",
        "sourcePlantId": "<sourcePlantId>",
        "targetPlantId": "<targetPlantId>",
        "type": "beneficial",
        "mechanism": "nitrogen_fixer",
        "strength": 5,
        "version": 0
      }
      """
    And response matches OpenAPI contract

  Scenario: Unauthenticated visitor cannot create a relation
    When I send a POST request to "/api/v1/plant-relations" with body
      """
      {
        "id": "0192e201-0000-7000-8000-000000000011",
        "sourcePlantId": "<sourcePlantId>",
        "targetPlantId": "<targetPlantId>",
        "type": "beneficial",
        "mechanism": "pest_repellent",
        "strength": 4,
        "proximity": {
          "minDistanceCm": 0,
          "maxDistanceCm": 50
        },
        "reason": "Repels pests"
      }
      """
    Then the response status code should be 401
    And response matches OpenAPI contract

  Scenario: Standard user without collaborator role cannot create a relation
    Given a POST user request to "/api/v1/plant-relations" with body
      """
      {
        "id": "0192e201-0000-7000-8000-000000000012",
        "sourcePlantId": "<sourcePlantId>",
        "targetPlantId": "<targetPlantId>",
        "type": "beneficial",
        "mechanism": "pest_repellent",
        "strength": 4,
        "proximity": {
          "minDistanceCm": 0,
          "maxDistanceCm": 50
        },
        "reason": "Repels pests"
      }
      """
    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: Reject creation when source and target are the same plant
    Given a POST collaborator request to "/api/v1/plant-relations" with body
      """
      {
        "id": "0192e201-0000-7000-8000-000000000013",
        "sourcePlantId": "<sourcePlantId>",
        "targetPlantId": "<sourcePlantId>",
        "type": "beneficial",
        "mechanism": "pest_repellent",
        "strength": 4,
        "proximity": {
          "minDistanceCm": 0,
          "maxDistanceCm": 50
        },
        "reason": "Repels pests"
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Reject creation with conflict when duplicate relation exists
    Given a plant relation exists between the two plants
    And a POST collaborator request to "/api/v1/plant-relations" with body
      """
      {
        "id": "0192e201-0000-7000-8000-000000000014",
        "sourcePlantId": "<sourcePlantId>",
        "targetPlantId": "<targetPlantId>",
        "type": "beneficial",
        "mechanism": "pest_repellent",
        "strength": 4,
        "proximity": {
          "minDistanceCm": 0,
          "maxDistanceCm": 50
        },
        "reason": "Duplicate mechanism companion"
      }
      """
    Then the response status code should be 409
    And response matches OpenAPI contract

  Scenario: Reject creation when id is missing
    Given a POST collaborator request to "/api/v1/plant-relations" with body
      """
      {
        "sourcePlantId": "<sourcePlantId>",
        "targetPlantId": "<targetPlantId>",
        "type": "beneficial",
        "mechanism": "nitrogen_fixer",
        "strength": 5,
        "proximity": {
          "minDistanceCm": 0,
          "maxDistanceCm": 40
        },
        "reason": "Fixes nitrogen in root nodules."
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract
