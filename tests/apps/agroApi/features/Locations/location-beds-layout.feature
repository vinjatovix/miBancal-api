@locations @spatial @bedsLayout
Feature: Location Beds Layout Batch Persistence
    As a registered gardener
    I want to update the layout of multiple beds in a single atomic request
    So that visual drag-and-drop operations persist efficiently without collisions

    Scenario: Batch update beds layout with delta semantics and OCC ETag
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111199",
                "name": "Batch Layout Garden",
                "width": 3000,
                "height": 2000,
                "northAngle": 90
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract
        And the response should have ETag '"0"'

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222211",
                "name": "Bed 1",
                "width": 100,
                "height": 200,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111199"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222222",
                "name": "Bed 2",
                "width": 100,
                "height": 200,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111199"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222233",
                "name": "Omitted Bed",
                "width": 100,
                "height": 100,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111199"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        Given I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111199/beds-layout" with body
            """
            [
                {
                    "id": "22222222-2222-4222-8222-222222222211",
                    "position": { "x": 100, "y": 100 },
                    "rotation": 0
                },
                {
                    "id": "22222222-2222-4222-8222-222222222222",
                    "position": { "x": 400, "y": 100 },
                    "rotation": 90
                }
            ]
            """
        Then the response status code should be 204
        And response matches OpenAPI contract
        And the response should have ETag '"1"'

        When I send a GET user request to "/api/v1/beds/22222222-2222-4222-8222-222222222211"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response body should contain
            """
            {
                "id": "22222222-2222-4222-8222-222222222211",
                "position": { "x": 100, "y": 100 },
                "rotation": 0,
                "netOrientation": 90
            }
            """

        When I send a GET user request to "/api/v1/beds/22222222-2222-4222-8222-222222222222"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response body should contain
            """
            {
                "id": "22222222-2222-4222-8222-222222222222",
                "position": { "x": 400, "y": 100 },
                "rotation": 90,
                "netOrientation": 180
            }
            """

    Scenario: Reject batch layout update when beds collide
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111188",
                "name": "Collision Test Garden",
                "width": 2000,
                "height": 2000
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222244",
                "name": "Bed C1",
                "width": 100,
                "height": 100,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111188"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222255",
                "name": "Bed C2",
                "width": 100,
                "height": 100,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111188"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        Given I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111188/beds-layout" with body
            """
            [
                {
                    "id": "22222222-2222-4222-8222-222222222244",
                    "position": { "x": 100, "y": 100 },
                    "rotation": 0
                },
                {
                    "id": "22222222-2222-4222-8222-222222222255",
                    "position": { "x": 120, "y": 120 },
                    "rotation": 0
                }
            ]
            """
        Then the response status code should be 400
        And response matches OpenAPI contract

        When I send a GET user request to "/api/v1/beds/22222222-2222-4222-8222-222222222244"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response body should not have the fields "position,rotation,netOrientation"

        When I send a GET user request to "/api/v1/beds/22222222-2222-4222-8222-222222222255"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response body should not have the fields "position,rotation,netOrientation"

        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111188"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should have ETag '"0"'

    Scenario: Reject batch layout update with stale ETag
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111177",
                "name": "Stale ETag Test Garden",
                "width": 2000,
                "height": 2000
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222266",
                "name": "Stale Bed",
                "width": 100,
                "height": 100,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111177"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        Given I use If-Match '"999"'
        When I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111177/beds-layout" with body
            """
            [
                {
                    "id": "22222222-2222-4222-8222-222222222266",
                    "position": { "x": 100, "y": 100 },
                    "rotation": 0
                }
            ]
            """
        Then the response status code should be 412
        And response matches OpenAPI contract

        When I send a GET user request to "/api/v1/beds/22222222-2222-4222-8222-222222222266"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response body should not have the fields "position,rotation,netOrientation"

        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111177"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should have ETag '"0"'
