@plant-relations
Feature: Delete Plant Relation
  In order to prune inaccurate companion knowledge
  As an ecological collaborator or administrator
  I want to physically delete a plant relation
  And enforce optimistic concurrency with ETags

  Background:
    Given a plant relation exists between the two plants

  Scenario: Collaborator deletes a plant relation successfully
    Given a DELETE collaborator request to the plant relation with If-Match "0"
    Then the response status code should be 204
    And response matches OpenAPI contract
    When I send a GET request to the plant relation
    Then the response status code should be 404

  Scenario: Require If-Match header (OCC)
    Given a DELETE collaborator request to the plant relation without If-Match header
    Then the response status code should be 428
    And response matches OpenAPI contract

  Scenario: Prevent deletion with outdated If-Match (OCC collision)
    Given a DELETE collaborator request to the plant relation with If-Match "999"
    Then the response status code should be 412
    And response matches OpenAPI contract

  Scenario: Unauthenticated visitor cannot delete a relation
    When I send a DELETE request to the plant relation with If-Match "0"
    Then the response status code should be 401
    And response matches OpenAPI contract
