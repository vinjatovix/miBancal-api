@anomalies @get-anomaly
Feature: Get anomaly encyclopedic content
  In order to recognise a problem in the garden
  As an anonymous reader
  I want an anomaly to carry its support resources and its look-alikes

  Scenario: An anonymous reader sees the resource and the confusable look-alikes
    Given a seeded anomaly "mildiu" exists
    And a seeded anomaly "oidio" with a support image resource and confusedWith "mildiu"
    When I send a GET request to "/api/v1/anomalies/oidio"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "slug": "oidio",
        "resources": [{ "type": "image", "url": "https://example.org/oidio.jpg" }],
        "confusedWith": ["mildiu"]
      }
      """
    And response matches OpenAPI contract

  Scenario: Following the differential-diagnosis pointer returns the look-alike
    Given a seeded anomaly "mildiu" exists
    And a seeded anomaly "oidio" with a support image resource and confusedWith "mildiu"
    When I send a GET request to "/api/v1/anomalies/mildiu"
    Then the response status code should be 200
    And the response body should contain
      """
      { "slug": "mildiu" }
      """
    And response matches OpenAPI contract

  Scenario: A legacy entry reads with both fields simply absent
    Given a seeded anomaly "roya" exists
    When I send a GET request to "/api/v1/anomalies/roya"
    Then the response status code should be 200
    And the response body should not echo "resources"
    And the response body should not echo "confusedWith"
    And response matches OpenAPI contract
