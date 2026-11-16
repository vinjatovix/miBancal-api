@locations @spatial
Feature: Location Spatial Configuration & Bed Placement
    As a registered gardener
    I want to configure canvas dimensions and orientation for a location and place beds
    So that my garden beds are positioned accurately without collisions

    Scenario: Configure spatial canvas and place a bed with net orientation
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222201",
                "name": "Spatial Garden",
                "northAngle": 45
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract
        And the response should have ETag '"0"'
        And the response body should contain
            """
            {
                "id": "22222222-2222-4222-8222-222222222201",
                "name": "Spatial Garden",
                "northAngle": 45
            }
            """

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "33333333-3333-4333-8333-333333333301",
                "name": "Bed A",
                "width": 100,
                "height": 200,
                "depth": 30,
                "locationId": "22222222-2222-4222-8222-222222222201"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        Given I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/beds/33333333-3333-4333-8333-333333333301" with body
            """
            {
                "position": { "x": 300, "y": 150 },
                "rotation": 90
            }
            """
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response body should contain
            """
            {
                "id": "33333333-3333-4333-8333-333333333301",
                "position": { "x": 300, "y": 150 },
                "rotation": 90,
                "netOrientation": 135
            }
            """
