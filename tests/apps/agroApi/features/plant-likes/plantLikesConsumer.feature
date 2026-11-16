@consumer
Feature: Plant likes consumer idempotence and duplicate protection
    As the system
    I want domain events consumed idempotently with deduplication
    So that plant like counters remain strictly consistent across retries and duplicates

    Scenario: Duplicate plant.liked events do not double-count
        Given a family exists
        And a plant exists
        When I send a POST user request to "/api/v1/plants/<plantId>/likes" with body
            """
            {}
            """
        Then the response status code should be 201
        When the plant likes consumer processes staged events
        Then the stored plant likesCount should be 1
        When the plant likes consumer processes staged events again
        Then the stored plant likesCount should be 1

    Scenario: Duplicate plant.unliked events do not double-decrement
        Given a family exists
        And a plant exists
        And the current user has liked the plant
        When the plant likes consumer processes staged events
        Then the stored plant likesCount should be 1
        When I send a DELETE user request to "/api/v1/plants/<plantId>/likes"
        Then the response status code should be 204
        When the plant likes consumer processes staged events
        Then the stored plant likesCount should be 0
        When the plant likes consumer processes staged events again
        Then the stored plant likesCount should be 0

    Scenario: Decrementing at zero remains at zero
        Given a family exists
        And a plant exists
        When the plant likes consumer processes a direct "plant.unliked" event for the plant
        Then the stored plant likesCount should be 0
