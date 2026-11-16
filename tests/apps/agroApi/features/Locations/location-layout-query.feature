@locations @spatial @layoutQuery
Feature: Location Visual Layout & Lightweight Embedding
    As a registered gardener
    I want to query my garden layout and optionally embed bed summaries
    So that my frontend canvas can render visual elements efficiently

    Scenario: Retrieve full visual canvas layout with strong ETag and lightweight beds embedding
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111144",
                "name": "Visual Canvas Garden",
                "northAngle": 45
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222201",
                "name": "Placed Bed",
                "width": 100,
                "height": 200,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111144"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222202",
                "name": "Unplaced Bed",
                "width": 80,
                "height": 120,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111144"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        Given I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111144/beds-layout" with body
            """
            [
                {
                    "id": "22222222-2222-4222-8222-222222222201",
                    "position": { "x": 300, "y": 200 },
                    "rotation": 90
                }
            ]
            """
        Then the response status code should be 204
        And response matches OpenAPI contract

        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111144/layout"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should have ETag '"1"'
        And the response body should contain
            """
            {
                "location": {
                    "id": "11111111-1111-4111-8111-111111111144",
                    "name": "Visual Canvas Garden",
                    "northAngle": 45
                },
                "placedBeds": [
                    {
                        "id": "22222222-2222-4222-8222-222222222201",
                        "name": "Placed Bed",
                        "width": 100,
                        "height": 200,
                        "position": { "x": 300, "y": 200 },
                        "rotation": 90,
                        "netOrientation": 135
                    }
                ],
                "unplacedBeds": [
                    {
                        "id": "22222222-2222-4222-8222-222222222202",
                        "name": "Unplaced Bed",
                        "width": 80,
                        "height": 120,
                        "position": null,
                        "rotation": 0
                    }
                ],
                "companionGraph": []
            }
            """

        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111144?include=beds"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should not have an ETag
        And the response body should contain
            """
            {
                "id": "11111111-1111-4111-8111-111111111144",
                "name": "Visual Canvas Garden",
                "beds": [
                    {
                        "id": "22222222-2222-4222-8222-222222222201",
                        "name": "Placed Bed",
                        "position": { "x": 300, "y": 200 },
                        "rotation": 90,
                        "netOrientation": 135
                    },
                    {
                        "id": "22222222-2222-4222-8222-222222222202",
                        "name": "Unplaced Bed",
                        "position": null,
                        "rotation": 0
                    }
                ]
            }
            """

    Scenario: Return 404 for non-existent location layout
        When I send a GET user request to "/api/v1/locations/99999999-9999-4999-8999-999999999999/layout"
        Then the response status code should be 404
        And response matches OpenAPI contract
