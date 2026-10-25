@anomalies @confused-with
Feature: Differential-diagnosis pointers degrade gracefully
  In order to keep the catalog trustworthy
  As a catalog maintainer and a reader
  I want confusedWith validated at write time yet tolerant of later retirement

  Scenario: A pointer to a retired look-alike still reads
    Given a seeded look-alike anomaly "mildiu" exists
    And a seeded anomaly "oidio" with confusedWith "mildiu"
    And the look-alike anomaly is soft-deleted
    When I send a GET request to "/api/v1/anomalies/oidio"
    Then the response status code should be 200
    And the response confusedWith should contain "mildiu"
    And response matches OpenAPI contract

  Scenario: A write with a never-existing slug is rejected and the entry is unchanged
    Given a seeded anomaly "oidio" exists
    And I record the current anomaly
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/anomalies/<anomalySlug>" with body
      """
      { "confusedWith": ["ghost-anomaly"] }
      """
    Then the response status code should be 400
    And the anomaly should be unchanged
    And response matches OpenAPI contract

  Scenario: A repeated slug is stored once
    Given a seeded look-alike anomaly "mildiu" exists
    And a seeded anomaly "oidio" exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/anomalies/<anomalySlug>" with body
      """
      { "confusedWith": ["mildiu", "mildiu"] }
      """
    Then the response status code should be 200
    And the response body matches "mildiu" for field "confusedWith"
    And response matches OpenAPI contract

  Scenario: The entry's own slug is stored stripped, without error
    Given a seeded look-alike anomaly "mildiu" exists
    And a seeded anomaly "oidio" exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/anomalies/<anomalySlug>" with body
      """
      { "confusedWith": ["oidio", "mildiu"] }
      """
    Then the response status code should be 200
    And the response body matches "mildiu" for field "confusedWith"
    And response matches OpenAPI contract

  Scenario: Linking is one-directional and writes no back-reference
    Given a seeded look-alike anomaly "mildiu" exists
    And a seeded anomaly "oidio" exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/anomalies/<anomalySlug>" with body
      """
      { "confusedWith": ["mildiu"] }
      """
    Then the response status code should be 200
    And the stored anomaly "mildiu" has no "confusedWith" field
    And response matches OpenAPI contract
