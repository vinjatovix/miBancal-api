@beds @geographic-inspection
Feature: Expose Frozen Climate Context on Bed Inspection
    As an authenticated gardener or collaborator
    I want to inspect a bed's frozen geographic context across single and collection read endpoints
    And ensure bed updates cannot alter those geographic attributes except through locationId
    So that localized growing calendars and climate calculations remain stable over time

    Scenario: Inspect single bed returns frozen geographic attributes
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "b1c2d3e4-1b6a-4f3c-9a8b-2e0d4f6a8b01",
                "name": "Finca de inspeccion",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """
        Then the response status code should be 201
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b01",
                "name": "Inspection Bed",
                "width": 100,
                "height": 200,
                "depth": 30,
                "locationId": "b1c2d3e4-1b6a-4f3c-9a8b-2e0d4f6a8b01"
            }
            """
        Then the response status code should be 201
        When I send a GET user request to "/api/v1/beds/f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b01"
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b01",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """

    Scenario: List all user beds includes frozen geographic attributes
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "b1c2d3e4-1b6a-4f3c-9a8b-2e0d4f6a8b02",
                "name": "Finca de coleccion",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """
        Then the response status code should be 201
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b02",
                "name": "Collection Bed",
                "width": 100,
                "height": 200,
                "depth": 30,
                "locationId": "b1c2d3e4-1b6a-4f3c-9a8b-2e0d4f6a8b02"
            }
            """
        Then the response status code should be 201
        When I send a GET user request to "/api/v1/beds"
        Then the response status code should be 200
        And the response body should be a list
        And the response body should contain
            """
            [
                {
                    "id": "f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b02",
                    "latitude": -34.6037,
                    "longitude": -58.3816
                }
            ]
            """

    Scenario: Bed PATCH request cannot send raw geographic attributes
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "b1c2d3e4-1b6a-4f3c-9a8b-2e0d4f6a8b03",
                "name": "Finca inmutable",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """
        Then the response status code should be 201
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b03",
                "name": "Immutable Climate Bed",
                "width": 100,
                "height": 200,
                "depth": 30,
                "locationId": "b1c2d3e4-1b6a-4f3c-9a8b-2e0d4f6a8b03"
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/beds/f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b03" with body
            """
            {
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 400
        And the bed "f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b03" in database should retain geographic attributes:
            | latitude  | -34.6037 |
            | longitude | -58.3816 |
        When I send a GET user request to "/api/v1/beds/f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b03"
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "f5a9c3e2-1b6a-4f3c-9a8b-2e0d4f6a8b03",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """
