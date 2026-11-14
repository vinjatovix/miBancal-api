@outbox
Feature: Stage domain events to the outbox within transactions
    As the system
    I want every domain event staged into the outbox inside the mutation's transaction
    So that events are durable, complete and never ghosted or lost

    Scenario: Deleting a bed with crops stages exactly one bed.deleted record atomically
        Given a bed exists
        And the bed has a plant
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        And response matches OpenAPI contract
        And the bed should have no active crops
        And exactly 1 outbox records should be staged
        And a complete "bed.deleted" outbox record should be staged for the bed

    Scenario: Liking then un-liking a plant stages both events alongside the counter change
        Given a family exists
        And a plant exists
        When I send a POST user request to "/api/v1/plants/<plantId>/likes" with body
            """
            {}
            """
        Then the response status code should be 201
        When I send a DELETE user request to "/api/v1/plants/<plantId>/likes"
        Then the response status code should be 204
        And the stored plant likesCount should be 0
        And exactly 2 outbox records should be staged
        And the outbox eventNames in _id order should be "plant.liked, plant.unliked"

    Scenario: Chronological order across operations follows an ascending _id sort
        Given a family exists
        And a plant exists
        When I send a POST user request to "/api/v1/plants/<plantId>/likes" with body
            """
            {}
            """
        Then the response status code should be 201
        When I send a DELETE user request to "/api/v1/plants/<plantId>/likes"
        Then the response status code should be 204
        When I send a POST user request to "/api/v1/plants/<plantId>/likes" with body
            """
            {}
            """
        Then the response status code should be 201
        And exactly 3 outbox records should be staged
        And the outbox eventNames in _id order should be "plant.liked, plant.unliked, plant.liked"

    Scenario: Liking an already-liked plant stages nothing
        Given a family exists
        And a plant exists
        And the current user has liked the plant
        When I send a POST user request to "/api/v1/plants/<plantId>/likes" with body
            """
            {}
            """
        Then the response status code should be 200
        And no outbox records should be staged

    Scenario: Un-liking a plant the user never liked stages nothing
        Given a family exists
        And a plant exists
        When I send a DELETE user request to "/api/v1/plants/<plantId>/likes"
        Then the response status code should be 204
        And no outbox records should be staged

    Scenario: A rejected stale-version bed deletion stages nothing
        Given a bed exists
        And the bed is stored at version 1
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 412
        And no outbox records should be staged

    Scenario: Deleting a missing bed stages nothing
        Given I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
        Then the response status code should be 404
        And no outbox records should be staged
