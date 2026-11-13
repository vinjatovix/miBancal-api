Feature: Batch Plant Instances Operations
    As a gardener using sowing brushes and multi-selection tools
    I want to place, update, relocate, and remove plant instances in batch
    So that I can manipulate groups of crops atomically without hitting rate limits or causing partial failures

    # --------------------------------------------------------------------------
    # User Story 1: Batch Placement (POST /api/v1/plant-instances/batch)
    # --------------------------------------------------------------------------

    Scenario: Successfully place multiple crops in a bed atomically
        Given a family exists
        And a plant exists
        And a bed exists
        When I send a POST user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "bedId": "<bedId>",
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567801",
                        "plantId": "<plantId>",
                        "position": {
                            "x": 20,
                            "y": 20
                        },
                        "growthStatus": "planted",
                        "variety": "Roma",
                        "notes": "Batch item 1"
                    },
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567802",
                        "plantId": "<plantId>",
                        "position": {
                            "x": 80,
                            "y": 80
                        },
                        "growthStatus": "seeded"
                    }
                ]
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract
        And the response array should contain 2 items
        And the response array should contain crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567801" at 20, 20
        And the response array should contain crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567802" at 80, 80
        And the bed stored version should be 1
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567801" should be stored at 20, 20
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567802" should be stored at 80, 80

    Scenario: Internal collision within batch is rejected atomically
        Given a family exists
        And a plant exists
        And a bed exists
        When I send a POST user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "bedId": "<bedId>",
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567803",
                        "plantId": "<plantId>",
                        "position": {
                            "x": 50,
                            "y": 50
                        }
                    },
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567804",
                        "plantId": "<plantId>",
                        "position": {
                            "x": 50.5,
                            "y": 50
                        }
                    }
                ]
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract
        And the bed stored version should be 0
        And no crop should be stored with id "e7b0e1b2-5f11-4a12-8e12-9c1234567803"
        And no crop should be stored with id "e7b0e1b2-5f11-4a12-8e12-9c1234567804"

    Scenario: Collision against existing crop in bed is rejected atomically
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567805" exists in the bed at 50, 50
        When I send a POST user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "bedId": "<bedId>",
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567806",
                        "plantId": "<plantId>",
                        "position": {
                            "x": 51,
                            "y": 50
                        }
                    }
                ]
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract
        And the bed stored version should be 0
        And no crop should be stored with id "e7b0e1b2-5f11-4a12-8e12-9c1234567806"

    Scenario: Placing out-of-bounds crops in batch returns 409
        Given a family exists
        And a plant exists
        And a bed exists
        When I send a POST user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "bedId": "<bedId>",
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567807",
                        "plantId": "<plantId>",
                        "position": {
                            "x": 9999,
                            "y": 9999
                        }
                    }
                ]
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract
        And the bed stored version should be 0
        And no crop should be stored with id "e7b0e1b2-5f11-4a12-8e12-9c1234567807"

    # --------------------------------------------------------------------------
    # User Story 2: Batch Update & Relocation (PATCH /api/v1/plant-instances/batch)
    # --------------------------------------------------------------------------

    Scenario: Successfully update and relocate crops in batch
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567810" and version 0 exists in the bed at 20, 20
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567811" and version 0 exists in the bed at 40, 40
        When I send a PATCH user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567810",
                        "version": 0,
                        "position": {
                            "x": 25,
                            "y": 25
                        },
                        "growthStatus": "growing"
                    },
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567811",
                        "version": 0,
                        "notes": "Batch updated"
                    }
                ]
            }
            """
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response array should contain 2 items
        And the response array should contain crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567810" at 25, 25
        And the bed stored version should be 1
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567810" should be stored at 25, 25

    Scenario: Swap positions between two batch crops without self-blocking
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567812" and version 0 exists in the bed at 20, 20
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567813" and version 0 exists in the bed at 70, 70
        When I send a PATCH user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567812",
                        "version": 0,
                        "position": {
                            "x": 70,
                            "y": 70
                        }
                    },
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567813",
                        "version": 0,
                        "position": {
                            "x": 20,
                            "y": 20
                        }
                    }
                ]
            }
            """
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567812" should be stored at 70, 70
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567813" should be stored at 20, 20

    Scenario: Batch update with stale version returns 412 and rolls back atomically
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567814" and version 0 exists in the bed at 20, 20
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567815" and version 2 exists in the bed at 40, 40
        When I send a PATCH user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567814",
                        "version": 0,
                        "position": {
                            "x": 25,
                            "y": 25
                        }
                    },
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567815",
                        "version": 1
                    }
                ]
            }
            """
        Then the response status code should be 412
        And response matches OpenAPI contract
        And the bed stored version should be 0
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567814" should be stored at 20, 20

    Scenario: Relocating crop into collision with fixed neighbor returns 409
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567816" and version 0 exists in the bed at 20, 20
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567817" and version 0 exists in the bed at 50, 50
        When I send a PATCH user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567816",
                        "version": 0,
                        "position": {
                            "x": 51,
                            "y": 50
                        }
                    }
                ]
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract
        And the bed stored version should be 0
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567816" should be stored at 20, 20

    # --------------------------------------------------------------------------
    # User Story 3: Batch Removal (DELETE /api/v1/plant-instances/batch)
    # --------------------------------------------------------------------------

    Scenario: Successfully remove multiple crops in batch
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567820" and version 0 exists in the bed at 20, 20
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567821" and version 0 exists in the bed at 50, 50
        When I send a DELETE user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567820",
                        "version": 0
                    },
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567821",
                        "version": 0
                    }
                ]
            }
            """
        Then the response status code should be 204
        And response matches OpenAPI contract
        And the bed stored version should be 1
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567820" should be removed
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567821" should be removed

    Scenario: Batch delete with stale version returns 412 and rolls back atomically
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567822" and version 0 exists in the bed at 20, 20
        And a crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567823" and version 2 exists in the bed at 50, 50
        When I send a DELETE user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567822",
                        "version": 0
                    },
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567823",
                        "version": 1
                    }
                ]
            }
            """
        Then the response status code should be 412
        And response matches OpenAPI contract
        And the bed stored version should be 0
        And the crop with id "e7b0e1b2-5f11-4a12-8e12-9c1234567822" should be stored at 20, 20

    # --------------------------------------------------------------------------
    # User Story 4: Volume & Boundary Constraints
    # --------------------------------------------------------------------------

    Scenario: Empty items array is rejected with 400
        Given a bed exists
        When I send a POST user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "bedId": "<bedId>",
                "items": []
            }
            """
        Then the response status code should be 400
        And response matches OpenAPI contract

    Scenario: Duplicate item IDs within batch is rejected with 400
        Given a bed exists
        When I send a POST user request to "/api/v1/plant-instances/batch" with body
            """
            {
                "bedId": "<bedId>",
                "items": [
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567830",
                        "plantId": "e7b0e1b2-5f11-4a12-8e12-9c1234567831"
                    },
                    {
                        "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567830",
                        "plantId": "e7b0e1b2-5f11-4a12-8e12-9c1234567831"
                    }
                ]
            }
            """
        Then the response status code should be 400
        And response matches OpenAPI contract
