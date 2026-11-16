@beds @get-all-user-beds
Feature: Get all user's beds
  As a user
  I want to get all my beds
  So that I can see the details of my beds

  Scenario: Get all beds when beds exist
    Given a bed exists
    When I send a GET user request to "/api/v1/beds"
    Then the response status code should be 200
    And the response body should be a list
    And the list should contain at least 1 item
    And response matches OpenAPI contract

  Scenario: Get all beds with a query parameter is rejected
    Given a bed exists
    When I send a GET user request to "/api/v1/beds" with query:
      """
      x
      """
    Then the response status code should be 400
    And the response body should contain
      """
      {
        "errors": { "query": "Unknown field" }
      }
      """
    And response matches OpenAPI contract

  Scenario: Get all beds with a body is rejected
    Given a bed exists
    When I send a GET user request to "/api/v1/beds" with body:
      """
      {
        "name": "Bed"
      }
      """
    Then the response status code should be 400
    And the response body should contain
      """
      {
        "errors": { "name": "Unknown field" }
      }
      """
    And response matches OpenAPI contract

  Scenario: Filter beds by locationId
    Given a POST user request to "/api/v1/locations" with body
      """
      {
        "id": "e2222222-2222-4222-8222-222222222201",
        "name": "Location For Filter A",
        "latitude": 40.4168,
        "longitude": -3.7038
      }
      """
    Then the response status code should be 201
    And a POST user request to "/api/v1/locations" with body
      """
      {
        "id": "e2222222-2222-4222-8222-222222222202",
        "name": "Location For Filter B",
        "latitude": 41.3879,
        "longitude": 2.1699
      }
      """
    Then the response status code should be 201
    And a POST user request to "/api/v1/beds" with body
      """
      {
        "id": "b1111111-1111-4111-8111-111111111101",
        "name": "Bed In Location A",
        "width": 100,
        "height": 200,
        "depth": 30,
        "locationId": "e2222222-2222-4222-8222-222222222201"
      }
      """
    Then the response status code should be 201
    And a POST user request to "/api/v1/beds" with body
      """
      {
        "id": "b1111111-1111-4111-8111-111111111102",
        "name": "Bed In Location B",
        "width": 100,
        "height": 200,
        "depth": 30,
        "locationId": "e2222222-2222-4222-8222-222222222202"
      }
      """
    Then the response status code should be 201
    When I send a GET user request to "/api/v1/beds?filter[locationId]=e2222222-2222-4222-8222-222222222201"
    Then the response status code should be 200
    And the response body should be a list
    And the list should contain at least 1 item
    And the response body should contain
      """
      [
        {
          "id": "b1111111-1111-4111-8111-111111111101",
          "locationId": "e2222222-2222-4222-8222-222222222201"
        }
      ]
      """

  Scenario: Filter beds by locationId canonical syntax filter[locationId][eq]
    When I send a GET user request to "/api/v1/beds?filter[locationId][eq]=00000000-0000-4000-8000-000000000000"
    Then the response status code should be 200
    And the response body should be a list
    And the list should be empty

  Scenario: Get beds with include=location embeds location summary
    Given a POST user request to "/api/v1/locations" with body
      """
      {
        "id": "e2222222-2222-4222-8222-222222222203",
        "name": "Finca Embebida",
        "latitude": 40.4168,
        "longitude": -3.7038
      }
      """
    Then the response status code should be 201
    And a POST user request to "/api/v1/beds" with body
      """
      {
        "id": "b1111111-1111-4111-8111-111111111103",
        "name": "Bed With Location Summary",
        "width": 100,
        "height": 200,
        "depth": 30,
        "locationId": "e2222222-2222-4222-8222-222222222203"
      }
      """
    Then the response status code should be 201
    When I send a GET user request to "/api/v1/beds?include=location"
    Then the response status code should be 200
    And the response body should contain
      """
      [
        {
          "id": "b1111111-1111-4111-8111-111111111103",
          "location": {
            "id": "e2222222-2222-4222-8222-222222222203",
            "name": "Finca Embebida",
            "latitude": 40.4168,
            "longitude": -3.7038
          }
        }
      ]
      """
