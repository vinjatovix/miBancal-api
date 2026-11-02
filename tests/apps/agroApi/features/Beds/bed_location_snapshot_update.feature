@beds @geographic-snapshot @location-update
Feature: Correct a Bed's Location Snapshot After Creation
    As a registered gardener
    I want to create beds without a location and set, replace or clear their snapshot later
    So that I can correct the climate context of a bed without recreating it

    Scenario: Creating a bed with no location omits geographic fields
        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c01",
                "name": "No Location Bed",
                "width": 100,
                "height": 200,
                "depth": 25
            }
            """
        Then the response status code should be 201
        And the response body should not contain
            """
            {
                "hemisphere": "south"
            }
            """

    Scenario: Setting a locationId on an existing bed via PATCH adds the snapshot
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "d1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c02",
                "name": "Finca a asignar",
                "country": "Argentina",
                "hemisphere": "south"
            }
            """
        Then the response status code should be 201
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c02",
                "name": "Bed To Assign",
                "width": 100,
                "height": 200,
                "depth": 25
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/beds/c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c02" with body
            """
            {
                "locationId": "d1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c02"
            }
            """
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "country": "Argentina",
                "hemisphere": "south"
            }
            """

    Scenario: Replacing the locationId on an existing bed via PATCH swaps the snapshot
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "d1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c03",
                "name": "Finca origen",
                "country": "Argentina"
            }
            """
        Then the response status code should be 201
        And a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "d1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c04",
                "name": "Finca destino",
                "country": "Spain"
            }
            """
        Then the response status code should be 201
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c03",
                "name": "Bed To Swap",
                "width": 100,
                "height": 200,
                "depth": 25,
                "locationId": "d1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c03"
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/beds/c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c03" with body
            """
            {
                "locationId": "d1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c04"
            }
            """
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "country": "Spain"
            }
            """
        And the response body should not contain
            """
            {
                "country": "Argentina"
            }
            """

    Scenario: Clearing the locationId with null removes the snapshot
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "d1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c05",
                "name": "Finca a quitar",
                "country": "Argentina"
            }
            """
        Then the response status code should be 201
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c04",
                "name": "Bed To Clear",
                "width": 100,
                "height": 200,
                "depth": 25,
                "locationId": "d1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c05"
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/beds/c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c04" with body
            """
            {
                "locationId": null
            }
            """
        Then the response status code should be 200
        And the response body should not contain
            """
            {
                "country": "Argentina"
            }
            """

    Scenario: Sending a raw geographic field on bed update is rejected
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c05",
                "name": "Protected Bed",
                "width": 100,
                "height": 200,
                "depth": 25
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/beds/c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c05" with body
            """
            {
                "country": "Argentina"
            }
            """
        Then the response status code should be 400

    Scenario: Updating with a non-owned locationId is rejected and the snapshot is unchanged
        And a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c06",
                "name": "Guarded Bed",
                "width": 100,
                "height": 200,
                "depth": 25
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/beds/c1c2d3e4-2b6a-4f3c-9a8b-2e0d4f6a8c06" with body
            """
            {
                "locationId": "00000000-0000-0000-0000-000000000000"
            }
            """
        Then the response status code should be 404
