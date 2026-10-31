@anomalies @update-anomaly
Feature: Curators enrich an anomaly with media and look-alike pointers
  In order to turn the text catalog into an encyclopedic one
  As a catalog maintainer
  I want to add, revise and clear an anomaly's resources and confusedWith

  Scenario: A curator adds resources and confusedWith
    Given a seeded look-alike anomaly "mildiu" exists
    And a seeded anomaly "oidio" exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/anomalies/<anomalySlug>" with body
      """
      {
        "resources": [
          { "type": "image", "url": "https://example.org/oidio.jpg", "title": "Oidio" },
          { "type": "article", "url": "https://example.org/oidio-guide" },
          { "type": "video", "url": "https://example.org/oidio.mp4" }
        ],
        "confusedWith": ["mildiu"]
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "confusedWith": ["mildiu"],
        "resources": [{ "type": "image" }, { "type": "article" }, { "type": "video" }]
      }
      """
    And response matches OpenAPI contract

  Scenario: Omitting resources keeps the stored resources
    Given a seeded look-alike anomaly "mildiu" exists
    And a seeded anomaly "oidio" with a support image resource and confusedWith "mildiu"
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/anomalies/<anomalySlug>" with body
      """
      { "scientificName": "Erysiphales" }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      { "resources": [{ "type": "image" }], "confusedWith": ["mildiu"] }
      """
    And response matches OpenAPI contract

  Scenario: Clearing confusedWith with null leaves no stored key
    Given a seeded look-alike anomaly "mildiu" exists
    And a seeded anomaly "oidio" with a support image resource and confusedWith "mildiu"
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/anomalies/<anomalySlug>" with body
      """
      { "confusedWith": null }
      """
    Then the response status code should be 200
    And the response body should not echo "confusedWith"
    And the stored anomaly "oidio" has no "confusedWith" field
    And response matches OpenAPI contract

  Scenario: An anonymous write is rejected and the entry is unchanged
    Given a seeded anomaly "oidio" exists
    And I record the current anomaly
    And I use If-Match '"0"'
    When I send a PATCH request to "/api/v1/anomalies/<anomalySlug>" with body
      """
      { "confusedWith": [] }
      """
    Then the response status code should be 401
    And the anomaly should be unchanged
    And response matches OpenAPI contract

  Scenario: A plain user write is forbidden and the entry is unchanged
    Given a seeded anomaly "oidio" exists
    And I record the current anomaly
    And I use If-Match '"0"'
    When I send a PATCH user request to "/api/v1/anomalies/<anomalySlug>" with body
      """
      { "scientificName": "Erysiphales" }
      """
    Then the response status code should be 403
    And the anomaly should be unchanged
    And response matches OpenAPI contract
