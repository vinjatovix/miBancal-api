@locations @spatial @companionGraph
Feature: Cross-Bed Companion Detection
    As an ecological gardener
    I want my visual layout to detect companion relationships across adjacent beds
    So that plant synergies are calculated even when plants grow in different beds

    Scenario: Detect cross-bed companion edge between adjacent beds within proximity
        Given two catalog plants exist
        And a POST collaborator request to "/api/v1/plant-relations" with body
            """
            {
                "id": "0192e201-0000-7000-8000-000000000099",
                "sourcePlantId": "<sourcePlantId>",
                "targetPlantId": "<targetPlantId>",
                "type": "beneficial",
                "mechanism": "pest_repellent",
                "strength": 4,
                "proximity": {
                    "minDistanceCm": 0,
                    "maxDistanceCm": 100
                },
                "reason": "Repels pests across adjacent garden beds"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111155",
                "name": "Synergistic Garden"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-2222222222aa",
                "name": "Bed A",
                "width": 120,
                "height": 200,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111155"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "22222222-2222-4222-8222-2222222222bb",
                "name": "Bed B",
                "width": 120,
                "height": 200,
                "depth": 30,
                "locationId": "11111111-1111-4111-8111-111111111155"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        Given I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111155/beds-layout" with body
            """
            [
                {
                    "id": "22222222-2222-4222-8222-2222222222aa",
                    "position": { "x": 0, "y": 0 },
                    "rotation": 0
                },
                {
                    "id": "22222222-2222-4222-8222-2222222222bb",
                    "position": { "x": 160, "y": 0 },
                    "rotation": 0
                }
            ]
            """
        Then the response status code should be 204
        And response matches OpenAPI contract

        When I send a POST user request to "/api/v1/plant-instances" with body
            """
            {
                "id": "33333333-3333-4333-8333-3333333333aa",
                "bedId": "22222222-2222-4222-8222-2222222222aa",
                "plantId": "<sourcePlantId>",
                "position": { "x": 110, "y": 50 }
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When I send a POST user request to "/api/v1/plant-instances" with body
            """
            {
                "id": "33333333-3333-4333-8333-3333333333bb",
                "bedId": "22222222-2222-4222-8222-2222222222bb",
                "plantId": "<targetPlantId>",
                "position": { "x": 10, "y": 50 }
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111155/layout"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response body should contain
            """
            {
                "location": {
                    "id": "11111111-1111-4111-8111-111111111155",
                    "name": "Synergistic Garden"
                },
                "companionGraph": [
                    {
                        "sourcePlantInstanceId": "33333333-3333-4333-8333-3333333333aa",
                        "targetPlantInstanceId": "33333333-3333-4333-8333-3333333333bb",
                        "sourceBedId": "22222222-2222-4222-8222-2222222222aa",
                        "targetBedId": "22222222-2222-4222-8222-2222222222bb",
                        "relationType": "beneficial",
                        "mechanism": "pest_repellent",
                        "strength": 4,
                        "distanceCm": 60,
                        "scope": "cross_bed"
                    }
                ]
            }
            """
