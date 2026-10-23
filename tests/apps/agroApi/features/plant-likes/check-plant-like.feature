Feature: Know my own like state on a plant
    As an authenticated user
    I want to query whether I currently like a plant
    So that the UI can render a correct toggle without leaking other users' likes

    Scenario: My own like state is true for a plant I liked
        Given a family exists
        And a plant exists
        And the current user has liked the plant
        When I send a GET user request to "/api/v1/plants/<plantId>/likes/me"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the check response should indicate liked true

    Scenario: My own like state is false for a plant I did not like
        Given a family exists
        And a plant exists
        When I send a GET user request to "/api/v1/plants/<plantId>/likes/me"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the check response should indicate liked false

    Scenario: Another user's like is never leaked through my own state
        Given a family exists
        And a plant exists
        And another user has liked the plant
        When I send a GET user request to "/api/v1/plants/<plantId>/likes/me"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the check response should indicate liked false
