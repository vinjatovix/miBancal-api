@plant-relations
Feature: Update Plant Relation
  In order to refine ecological companion knowledge
  As an ecological collaborator or administrator
  I want to update an existing plant relation
  And enforce optimistic concurrency with ETags

  Background:
    Given a plant relation exists between the two plants

  Scenario: Collaborator updates a plant relation successfully
    Given a PATCH collaborator request to the plant relation with If-Match "0" and body
      """
      {
        "strength": 5,
        "reason": "Updated reason with new observation."
      }
      """
    Then the response status code should be 200
    And the response ETag should match the body version
    And the response body should contain
      """
      {
        "strength": 5,
        "reason": "Updated reason with new observation.",
        "version": 1
      }
      """
    And response matches OpenAPI contract

  Scenario: Require If-Match header (OCC)
    Given a PATCH collaborator request to the plant relation with body
      """
      {
        "strength": 5
      }
      """
    Then the response status code should be 428
    And response matches OpenAPI contract

  Scenario: Prevent updates with outdated If-Match (OCC collision)
    Given a PATCH collaborator request to the plant relation with If-Match "999" and body
      """
      {
        "strength": 5
      }
      """
    Then the response status code should be 412
    And response matches OpenAPI contract

  Scenario: Unauthenticated visitor cannot update a relation
    When I send a PATCH request to the plant relation with If-Match "0" and body
      """
      {
        "strength": 5
      }
      """
    Then the response status code should be 401
    And response matches OpenAPI contract

  Scenario: Reject update changing immutable properties
    Given a PATCH collaborator request to the plant relation with If-Match "0" and body
      """
      {
        "sourcePlantId": "0192e200-0000-7000-8000-000000000999"
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract
