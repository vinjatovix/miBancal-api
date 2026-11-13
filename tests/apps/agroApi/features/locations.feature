@locations
Feature: User Locations
    As a registered gardener
    I want to keep several named growing locations with mandatory geographic coordinates
    So that I can apply the right climate context to different beds

    Scenario: Create a location with coordinates and read it back
        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111101",
                "name": "Huerto trasero",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201
        And the response should have ETag '"0"'
        And the response body should contain
            """
            {
                "id": "11111111-1111-4111-8111-111111111101",
                "name": "Huerto trasero",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111101"
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "11111111-1111-4111-8111-111111111101",
                "name": "Huerto trasero",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """

    Scenario: Create a location without coordinates and read it back
        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111102",
                "name": "Sin coordenadas"
            }
            """
        Then the response status code should be 201
        And the response should have ETag '"0"'
        And the response body should contain
            """
            {
                "id": "11111111-1111-4111-8111-111111111102",
                "name": "Sin coordenadas"
            }
            """
        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111102"
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "11111111-1111-4111-8111-111111111102",
                "name": "Sin coordenadas"
            }
            """

    Scenario: Creating a location with partial coordinates is rejected
        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111120",
                "name": "Solo latitud",
                "latitude": 40.4168
            }
            """
        Then the response status code should be 400

    Scenario: Clearing location coordinates sets them to null and bumps the version
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111121",
                "name": "Parcela con coordenadas",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111121" with body
            """
            {
                "latitude": null,
                "longitude": null
            }
            """
        Then the response status code should be 200
        And the response should have ETag '"1"'
        And the response body should contain
            """
            {
                "id": "11111111-1111-4111-8111-111111111121",
                "name": "Parcela con coordenadas"
            }
            """

    Scenario: Adding coordinates to a coordinate-less location succeeds
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111122",
                "name": "Parcela sin coordenadas iniciales"
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111122" with body
            """
            {
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 200
        And the response should have ETag '"1"'
        And the response body should contain
            """
            {
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """

    Scenario: Creating a location with out-of-range coordinates is rejected
        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111103",
                "name": "Coordenadas invalidas",
                "latitude": 95.0,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 400

    Scenario: Creating a location with legacy geographic fields is rejected
        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111104",
                "name": "Huerto con legado",
                "latitude": 40.4168,
                "longitude": -3.7038,
                "country": "Argentina"
            }
            """
        Then the response status code should be 400

    Scenario: Listing locations returns the owner's active locations with coordinates
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111105",
                "name": "Mi parcela",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201
        When I send a GET user request to "/api/v1/locations"
        Then the response status code should be 200
        And the response body should contain a paginated list
        And the response body should contain
            """
            {
                "data": [
                    {
                        "id": "11111111-1111-4111-8111-111111111105",
                        "latitude": 40.4168,
                        "longitude": -3.7038
                    }
                ]
            }
            """

    Scenario: Updating a location coordinates persists and bumps the version
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111106",
                "name": "Parcela a editar",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111106" with body
            """
            {
                "latitude": 41.3879,
                "longitude": 2.1699
            }
            """
        Then the response status code should be 200
        And the response should have ETag '"1"'
        And the response body should contain
            """
            {
                "latitude": 41.3879,
                "longitude": 2.1699
            }
            """

    Scenario: Updating a location with partial coordinates is rejected
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111107",
                "name": "Parcela parcial",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111107" with body
            """
            {
                "latitude": 41.3879
            }
            """
        Then the response status code should be 400

    Scenario: Updating a location with legacy fields is rejected
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111108",
                "name": "Parcela rechazo legado",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111108" with body
            """
            {
                "country": "Argentina"
            }
            """
        Then the response status code should be 400

    Scenario: Creating a second location with a duplicate active name is rejected
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111109",
                "name": "Nombre duplicado",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201
        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111110",
                "name": "nombre duplicado",
                "latitude": 41.3879,
                "longitude": 2.1699
            }
            """
        Then the response status code should be 409

    Scenario: A soft-deleted location's name becomes available again
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111111",
                "name": "Nombre reutilizable",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a DELETE user request to "/api/v1/locations/11111111-1111-4111-8111-111111111111"
        Then the response status code should be 204
        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111111"
        Then the response status code should be 404
        And a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111112",
                "name": "Nombre reutilizable",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201

    Scenario: A different account cannot reach another owner's location
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111113",
                "name": "Finca privada",
                "latitude": 40.4168,
                "longitude": -3.7038
            }
            """
        Then the response status code should be 201
        Then a GET collaborator request to "/api/v1/locations/11111111-1111-4111-8111-111111111113" should return status 404
