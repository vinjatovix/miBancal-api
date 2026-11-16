@garden-inputs
Feature: Garden inputs knowledge catalog and recipes
  In order to safely prepare and apply organic remedies, fertilizers, and soil amendments
  As an anonymous visitor or curator
  I want to list, filter, and inspect detailed recipes and dosages for organic garden inputs

  Scenario: Public visitor lists active garden inputs with pagination
    When I send a GET request to "/api/v1/garden-inputs?pagination[page]=1&pagination[limit]=5"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "data": [
          { "slug": "jabon-potasico", "category": "defense" }
        ],
        "pagination": {
          "page": 1,
          "limit": 5
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: Public visitor filters garden inputs by category
    When I send a GET request to "/api/v1/garden-inputs?filter[category][eq]=fertilizer"
    Then the response status code should be 200
    And every item should match:
      | field    | operator | value      |
      | category | eq       | fertilizer |
    And response matches OpenAPI contract

  Scenario: Public visitor filters garden inputs by action
    When I send a GET request to "/api/v1/garden-inputs?filter[action][eq]=fungicide"
    Then the response status code should be 200
    And every item should match:
      | field   | operator | value     |
      | actions | hasAny   | fungicide |
    And response matches OpenAPI contract

  Scenario: Public visitor requests sparse fieldset on listing
    When I send a GET request to "/api/v1/garden-inputs?fields[gardenInputs]=id,slug,name"
    Then the response status code should be 200
    And each item should hold exactly the fields "id,slug,name"
    And response matches OpenAPI contract

  Scenario: Public visitor requests sparse fieldset on single item
    When I send a GET request to "/api/v1/garden-inputs/jabon-potasico?fields[gardenInputs]=id,slug,name"
    Then the response status code should be 200
    And the response body should hold exactly the fields "id,slug,name"
    And the response should not have an ETag
    And response matches OpenAPI contract

  Scenario: Public visitor retrieves garden input with recipes by slug
    When I send a GET request to "/api/v1/garden-inputs/jabon-potasico"
    Then the response status code should be 200
    And the response ETag should match the body version
    And the response body should contain
      """
      {
        "slug": "jabon-potasico",
        "name": "Jabón potásico",
        "category": "defense",
        "actions": ["insecticide"],
        "recipes": [
          {
            "name": "Fabricación casera de jabón potásico",
            "dosage": {
              "method": "foliar",
              "dilution": "15-20 g/L (1.5-2%)"
            }
          }
        ]
      }
      """
    And response matches OpenAPI contract

  Scenario: A matching If-None-Match returns 304 without a body
    Given I use If-None-Match '"0"'
    When I send a GET user request to "/api/v1/garden-inputs/jabon-potasico"
    Then the response status code should be 304
    And the response body should be empty
    And response matches OpenAPI contract

  Scenario: Public visitor retrieves garden input by UUID
    Given a seeded garden input "jabon-potasico" exists
    When I send a GET request to "/api/v1/garden-inputs/<gardenInputId>"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "id": "<gardenInputId>",
        "slug": "jabon-potasico"
      }
      """
    And response matches OpenAPI contract

  Scenario: Nonexistent garden input slug returns 404
    When I send a GET request to "/api/v1/garden-inputs/nonexistent-input-slug"
    Then the response status code should be 404
    And the response body should contain
      """
      {
        "message": "GardenInput not found with slug: nonexistent-input-slug"
      }
      """
    And response matches OpenAPI contract

  Scenario: Nonexistent garden input UUID returns 404
    When I send a GET request to "/api/v1/garden-inputs/00000000-0000-4000-8000-000000000000"
    Then the response status code should be 404
    And the response body should contain
      """
      {
        "message": "GardenInput not found: 00000000-0000-4000-8000-000000000000"
      }
      """
    And response matches OpenAPI contract

  Scenario: Curator creates a garden input successfully
    Given a POST collaborator request to "/api/v1/garden-inputs/" with body
      """
      {
        "id": "01a17846-1207-7582-aaba-a80d77f6642b",
        "slug": "macerado-ajo",
        "name": "Macerado de ajo",
        "category": "defense",
        "actions": ["repellent", "insecticide"],
        "recipes": [
          {
            "name": "Maceración alcohólica de ajo",
            "ingredients": [
              { "item": "Dientes de ajo triturados", "quantity": "100 g" },
              { "item": "Alcohol 96º o agua", "quantity": "1 L" }
            ],
            "instructions": [
              "Triturar el ajo y dejar macerar 24 horas tapado.",
              "Filtrar y diluir al 10% en agua antes de pulverizar."
            ],
            "dosage": {
              "method": "foliar",
              "dilution": "10%",
              "frequency": "Cada 7 días"
            }
          }
        ]
      }
      """
    Then the response status code should be 201
    And the response should have ETag '"0"'
    And the response body should contain
      """
      {
        "id": "01a17846-1207-7582-aaba-a80d77f6642b",
        "slug": "macerado-ajo",
        "name": "Macerado de ajo",
        "category": "defense"
      }
      """
    And response matches OpenAPI contract

  Scenario: Creating a garden input with duplicate slug returns conflict
    Given a POST collaborator request to "/api/v1/garden-inputs/" with body
      """
      {
        "id": "01a17846-1207-7582-aaba-aed0f567e339",
        "slug": "jabon-potasico",
        "name": "Jabón potásico duplicado",
        "category": "defense"
      }
      """
    Then the response status code should be 409
    And response matches OpenAPI contract

  Scenario: Creating a garden input with invalid slug format returns bad request
    Given a POST collaborator request to "/api/v1/garden-inputs/" with body
      """
      {
        "id": "01a17846-1207-7582-aaba-b3baaae83466",
        "slug": "Invalid_Slug!",
        "name": "Slug inválido",
        "category": "defense"
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Anonymous request cannot create garden input
    Given a POST request to "/api/v1/garden-inputs/" with body
      """
      {
        "id": "01a17846-1207-7582-aaba-b5feb55e3f61",
        "slug": "anon-input",
        "name": "Intento anónimo",
        "category": "defense"
      }
      """
    Then the response status code should be 401
    And response matches OpenAPI contract

  Scenario: Plain user cannot create garden input
    Given a POST user request to "/api/v1/garden-inputs/" with body
      """
      {
        "id": "01a17846-1207-7582-aaba-b89f82f19db8",
        "slug": "user-input",
        "name": "Intento de usuario plano",
        "category": "defense"
      }
      """
    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: Curator updates garden input with matching If-Match
    Given I use If-Match '"0"'
    When I send a PATCH collaborator request to "/api/v1/garden-inputs/jabon-potasico" with body
      """
      {
        "description": "Fórmula actualizada de jabón potásico para huerto."
      }
      """
    Then the response status code should be 200
    And the response should have ETag '"1"'
    And the response body should contain
      """
      {
        "slug": "jabon-potasico",
        "description": "Fórmula actualizada de jabón potásico para huerto.",
        "version": 1
      }
      """
    And response matches OpenAPI contract

  Scenario: Updating garden input with stale ETag returns precondition failed
    Given I use If-Match '"999"'
    When I send a PATCH collaborator request to "/api/v1/garden-inputs/jabon-potasico" with body
      """
      {
        "description": "Fórmula desactualizada."
      }
      """
    Then the response status code should be 412
    And response matches OpenAPI contract

  Scenario: Updating garden input without If-Match returns precondition required
    When I send a PATCH collaborator request to "/api/v1/garden-inputs/jabon-potasico" with body
      """
      {
        "description": "Fórmula sin header If-Match."
      }
      """
    Then the response status code should be 428
    And response matches OpenAPI contract

  Scenario: Curator soft-deletes garden input with matching If-Match
    Given I use If-Match '"0"'
    When I send a DELETE collaborator request to "/api/v1/garden-inputs/jabon-potasico"
    Then the response status code should be 204
    And the stored garden input "jabon-potasico" has status "deleted"
    When I send a GET request to "/api/v1/garden-inputs/jabon-potasico"
    Then the response status code should be 404
    When I send a GET collaborator request to "/api/v1/garden-inputs/jabon-potasico"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "slug": "jabon-potasico",
        "status": "deleted"
      }
      """

  Scenario: Public visitor discovers organic remedy matching pest treatment guidance
    Given a seeded anomaly "pulgon" exists with treatment "jabon-potasico"
    When I send a GET request to "/api/v1/anomalies/pulgon"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "slug": "pulgon",
        "treatment": ["jabon-potasico"]
      }
      """
    When I send a GET request to "/api/v1/garden-inputs/jabon-potasico"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "slug": "jabon-potasico",
        "targets": ["Pulgón"]
      }
      """
    And the response recipe should contain ingredient "Aceite vegetal"
