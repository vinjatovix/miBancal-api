Feature: Like and un-like a catalog plant
    As an authenticated user
    I want to like and un-like plants in the shared catalog
    So that popularity reflects the community's real interest

    Scenario: Liking an active plant increments the counter
        Given a family exists
        And a plant exists
        When I send a POST user request to "/api/v1/plants/<plantId>/likes" with body
            """
            {}
            """
        Then the response status code should be 201
        And response matches OpenAPI contract
        And the response should contain the liked plantId
        And the stored plant likesCount should be 1
        And the plant should be liked by me

    Scenario: Liking an already-liked plant is idempotent
        Given a family exists
        And a plant exists
        And the current user has liked the plant
        When I send a POST user request to "/api/v1/plants/<plantId>/likes" with body
            """
            {}
            """
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should contain the liked plantId
        And the stored plant likesCount should be 1

    Scenario: Un-liking a liked plant decrements the counter
        Given a family exists
        And a plant exists
        And the current user has liked the plant
        When I send a DELETE user request to "/api/v1/plants/<plantId>/likes"
        Then the response status code should be 204
        And the stored plant likesCount should be 0
        And the plant should not be liked by me

    Scenario: Un-liking a plant the user never liked is idempotent and never negative
        Given a family exists
        And a plant exists
        When I send a DELETE user request to "/api/v1/plants/<plantId>/likes"
        Then the response status code should be 204
        And the stored plant likesCount should be 0

    Scenario: Liking a non-existent plant returns 404 Not Found
        When I send a POST user request to "/api/v1/plants/6ba7b810-9dad-11d1-80b4-00c04fd430c9/likes" with body
            """
            {}
            """
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Liking a soft-deleted plant returns 404 Not Found
        Given a family exists
        And a soft-deleted plant exists
        When I send a POST user request to "/api/v1/plants/<plantId>/likes" with body
            """
            {}
            """
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Conditional GET returns 200 with new ETag after liking and 304 on cache hit
        Given a family exists
        And a plant exists
        And I use If-None-Match '"0"'
        When I send a GET user request to "/api/v1/plants/<plantId>"
        Then the response status code should be 304
        And the response body should be empty
        When I send a POST user request to "/api/v1/plants/<plantId>/likes" with body
            """
            {}
            """
        Then the response status code should be 201
        And I use If-None-Match '"0"'
        When I send a GET user request to "/api/v1/plants/<plantId>"
        Then the response status code should be 200
        And the response should have ETag '"0-1"'
        And response matches OpenAPI contract
        And the plant response likesCount should be 1
        And I use If-None-Match '"0-1"'
        When I send a GET user request to "/api/v1/plants/<plantId>"
        Then the response status code should be 304
        And the response body should be empty
        And response matches OpenAPI contract

    Scenario: Conditional GET returns 200 with restored ETag after un-liking and 304 on cache hit
        Given a family exists
        And a plant exists
        And the current user has liked the plant
        And I use If-None-Match '"0-1"'
        When I send a GET user request to "/api/v1/plants/<plantId>"
        Then the response status code should be 304
        And the response body should be empty
        When I send a DELETE user request to "/api/v1/plants/<plantId>/likes"
        Then the response status code should be 204
        And I use If-None-Match '"0-1"'
        When I send a GET user request to "/api/v1/plants/<plantId>"
        Then the response status code should be 200
        And the response should have ETag '"0"'
        And response matches OpenAPI contract
        And the plant response likesCount should be 0
        And I use If-None-Match '"0"'
        When I send a GET user request to "/api/v1/plants/<plantId>"
        Then the response status code should be 304
        And the response body should be empty
        And response matches OpenAPI contract
