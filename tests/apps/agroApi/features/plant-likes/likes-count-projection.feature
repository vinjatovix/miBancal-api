Feature: Read-only likes counter projected on the catalog
    As a catalog reader
    I want every plant to carry its likes count
    So that popularity is visible without any per-request aggregation

    Scenario: The projected counter is returned on a single plant read
        Given a family exists
        And a plant exists
        And the plant has 3 likes
        When I get the plant
        Then the response status code should be 200
        And the response should have ETag '"0-3"'
        And response matches OpenAPI contract
        And the plant response likesCount should be 3

    Scenario: A plant update succeeds when If-Match carries the counter ETag
        Given a family exists
        And a plant exists
        And the plant has 3 likes
        And I use If-Match '"0-3"'
        When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
            """
            {
                "identity": {
                    "name": {
                        "primary": "Updated Popular Plant"
                    }
                }
            }
            """
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should have ETag '"1"'

    Scenario: The projected counter is returned on the catalog list
        Given a family exists
        And a plant exists
        And the plant has 2 likes
        When I send a GET request to "/api/v1/plants"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And every listed plant should include a likesCount

    Scenario: The counter cannot be tampered with through a plant write
        Given a family exists
        And a plant exists
        And the plant has 3 likes
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
            """
            {
                "likesCount": 99
            }
            """
        Then the response status code should be 400
        And response matches OpenAPI contract
        And the stored plant likesCount should be 3

    Scenario: A never-liked plant reports a zero counter
        Given a family exists
        And a plant exists
        When I get the plant
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the plant response likesCount should be 0
