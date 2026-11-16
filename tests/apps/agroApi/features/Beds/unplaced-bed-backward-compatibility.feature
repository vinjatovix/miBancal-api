@beds @spatial @backwardCompatibility
Feature: Unplaced Bed Backward Compatibility
    As a gardener
    I want to create beds without specifying spatial coordinates
    So that existing workflows and legacy clients continue to function seamlessly

    Scenario: Create bed without position and verify unplaced layout partitioning
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111133",
                "name": "Legacy Support Garden"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-222222222288",
                "name": "Traditional Bed",
                "width": 120,
                "height": 240,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111133"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When I send a GET user request to "/api/v1/beds/22222222-2222-4222-8222-222222222288"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response body should contain
            """
            {
                "id": "22222222-2222-4222-8222-222222222288",
                "name": "Traditional Bed",
                "width": 120,
                "height": 240,
                "depth": 30
            }
            """

        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111133/layout"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response body should contain
            """
            {
                "placedBeds": [],
                "unplacedBeds": [
                    {
                        "id": "22222222-2222-4222-8222-222222222288",
                        "name": "Traditional Bed",
                        "width": 120,
                        "height": 240,
                        "position": null,
                        "rotation": 0
                    }
                ],
                "companionGraph": []
            }
            """
