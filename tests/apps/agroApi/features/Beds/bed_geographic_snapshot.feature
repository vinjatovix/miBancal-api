@beds @geographic-snapshot
Feature: Bed Geographic Snapshot on Creation
    As a registered gardener
    I want newly created beds to capture an immutable snapshot of a location's geographic coordinates
    So that localized growing calendars and climate calculations remain stable over time

    Scenario: Creating a bed from a location captures its geographic snapshot
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a90",
                "name": "Finca del Sur",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """
        Then the response status code should be 201
        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a90",
                "name": "Raised Bed #1",
                "width": 120,
                "height": 240,
                "depth": 30,
                "locationId": "a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a90"
            }
            """
        Then the response status code should be 201
        And the response body should contain
            """
            {
                "id": "e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a90",
                "name": "Raised Bed #1",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """

    Scenario: Creating a bed with a coordinate-less location omits geographic fields
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a91",
                "name": "Finca sin coordenadas"
            }
            """
        Then the response status code should be 201
        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a91",
                "name": "Default Bed",
                "width": 100,
                "height": 200,
                "depth": 25,
                "locationId": "a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a91"
            }
            """
        Then the response status code should be 201
        And the response body should not have the fields "latitude,longitude"
        And the response body should contain
            """
            {
                "locationId": "a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a91"
            }
            """

    Scenario: Editing the source location does not alter an existing bed's snapshot
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a92",
                "name": "Finca estable",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """
        Then the response status code should be 201
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a92",
                "name": "Stable Climate Bed",
                "width": 150,
                "height": 300,
                "depth": 35,
                "locationId": "a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a92"
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/locations/a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a92" with body
            """
            {
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 200
        When I send a GET user request to "/api/v1/beds/e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a92"
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a92",
                "name": "Stable Climate Bed",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """

    Scenario: Deleting the source location does not alter an existing bed's snapshot
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a93",
                "name": "Finca a borrar",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """
        Then the response status code should be 201
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a93",
                "name": "Surviving Climate Bed",
                "width": 150,
                "height": 300,
                "depth": 35,
                "locationId": "a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a93"
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a DELETE user request to "/api/v1/locations/a1b2c3d4-0c5a-4e2b-8a7f-1d9c3e5b7a93"
        Then the response status code should be 204
        When I send a GET user request to "/api/v1/beds/e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a93"
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a93",
                "name": "Surviving Climate Bed",
                "latitude": -34.6037,
                "longitude": -58.3816
            }
            """

    Scenario: Unknown locationId is rejected before the bed is persisted
        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a94",
                "name": "Rejected Bed",
                "width": 100,
                "height": 200,
                "depth": 25,
                "locationId": "00000000-0000-0000-0000-000000000000"
            }
            """
        Then the response status code should be 404
        When I send a GET user request to "/api/v1/beds/e4f8b2d1-0c5a-4e2b-8a7f-1d9c3e5b7a94"
        Then the response status code should be 404
