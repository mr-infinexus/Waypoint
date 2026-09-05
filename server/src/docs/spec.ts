export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Waypoint Backend APIs',
    version: '1.0.0',
    description: 'Comprehensive API documentation for Waypoint: a multi-modal journey planning, real-time booking, and disruption recovery platform.',
  },
  servers: [
    {
      url: '/api',
      description: 'Default API Base URL',
    },
  ],
  tags: [
    { name: 'System', description: 'System health and diagnostics' },
    { name: 'Authentication', description: 'User registration, login session, and token generation' },
    { name: 'Stations', description: 'Public station hubs and transit nodes' },
    { name: 'Search & Routing', description: 'Multi-modal itinerary search with RAPTOR algorithm' },
    { name: 'Bookings', description: 'Pessimistic-locked bookings, QR tickets, and traveler journeys' },
    { name: 'Operator Services', description: 'Transit operator schedule and route catalog management' },
    { name: 'Disruptions', description: 'Operator delay/cancellation reporting and automated cascade replanning' },
    { name: 'Admin Management', description: 'Platform administration, operator onboarding, and analytics' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        description: 'Returns operational status of the Waypoint backend service.',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Backend service is online and healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    message: { type: 'string', example: 'Waypoint API is running' },
                  },
                },
                example: {
                  status: 'ok',
                  message: 'Waypoint API is running',
                },
              },
            },
          },
        },
      },
    },

    '/auth/register': {
      post: {
        summary: 'Register a new account',
        description: 'Registers a new user account as either a traveler or a transit operator. Operators require administrative approval before activation.',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              example: {
                name: 'Aarav Patel',
                email: 'aarav.patel@example.com',
                password: 'Password123!',
                role: 'traveler',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterResponse' },
                example: {
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  pendingApproval: false,
                  user: {
                    id: 'e7b0e1a4-9276-4d2a-b67f-4cb123e45678',
                    name: 'Aarav Patel',
                    email: 'aarav.patel@example.com',
                    role: 'traveler',
                    isActive: true,
                    createdAt: '2026-09-05T00:00:00.000Z',
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
        },
      },
    },

    '/auth/login': {
      post: {
        summary: 'Log in to account',
        description: 'Authenticates user credentials and issues a JWT token in the response and sets an HttpOnly cookie.',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: {
                email: 'aarav.patel@example.com',
                password: 'Password123!',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            headers: {
              'Set-Cookie': {
                schema: { type: 'string' },
                description: 'HttpOnly cookie jwt=<token>; Path=/; Max-Age=86400',
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
                example: {
                  message: 'Login successful',
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
        },
      },
    },

    '/auth/logout': {
      post: {
        summary: 'Log out of account',
        description: 'Clears the HttpOnly JWT authentication cookie.',
        tags: ['Authentication'],
        responses: {
          '200': {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  message: 'Logged out successfully',
                },
              },
            },
          },
        },
      },
    },

    '/stations': {
      get: {
        summary: 'List all public stations',
        description: 'Retrieves all stations and transit hubs with geographic coordinates, sorted by city and name.',
        tags: ['Stations'],
        responses: {
          '200': {
            description: 'List of transit stations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Station' },
                },
                example: [
                  {
                    id: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
                    code: 'DEL',
                    name: 'Indira Gandhi International Airport',
                    city: 'New Delhi',
                    latitude: 28.5562,
                    longitude: 77.1000,
                    createdAt: '2026-09-01T00:00:00.000Z',
                    updatedAt: '2026-09-01T00:00:00.000Z',
                  },
                  {
                    id: 'c2b3a4d5-f6e7-4b8c-9d0e-1f2a3b4c5d6e',
                    code: 'NDLS',
                    name: 'New Delhi Railway Station',
                    city: 'New Delhi',
                    latitude: 28.6429,
                    longitude: 77.2195,
                    createdAt: '2026-09-01T00:00:00.000Z',
                    updatedAt: '2026-09-01T00:00:00.000Z',
                  },
                  {
                    id: 'd3c4b5a6-e7f8-4c9d-0e1f-2a3b4c5d6e7f',
                    code: 'BOM',
                    name: 'Chhatrapati Shivaji Maharaj International Airport',
                    city: 'Mumbai',
                    latitude: 19.0896,
                    longitude: 72.8656,
                    createdAt: '2026-09-01T00:00:00.000Z',
                    updatedAt: '2026-09-01T00:00:00.000Z',
                  },
                ],
              },
            },
          },
        },
      },
    },

    '/search': {
      get: {
        summary: 'Search multi-modal journeys',
        description: 'Uses the RAPTOR routing algorithm with candidate station radius walking to discover multi-leg routes and rank them by heuristic criteria.',
        tags: ['Search & Routing'],
        parameters: [
          {
            name: 'originLat',
            in: 'query',
            required: true,
            schema: { type: 'number', example: 28.6139 },
            description: 'Latitude of origin location (e.g. Connaught Place)',
          },
          {
            name: 'originLng',
            in: 'query',
            required: true,
            schema: { type: 'number', example: 77.2090 },
            description: 'Longitude of origin location',
          },
          {
            name: 'destinationLat',
            in: 'query',
            required: true,
            schema: { type: 'number', example: 19.0760 },
            description: 'Latitude of destination location (e.g. Mumbai Gateway)',
          },
          {
            name: 'destinationLng',
            in: 'query',
            required: true,
            schema: { type: 'number', example: 72.8777 },
            description: 'Longitude of destination location',
          },
          {
            name: 'date',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time', example: '2026-09-05T08:00:00.000Z' },
            description: 'Earliest departure timestamp (ISO 8601)',
          },
          {
            name: 'sortBy',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['fastest', 'cheapest', 'transfers'], default: 'cheapest' },
            description: 'Sorting heuristic for ranking routes',
          },
        ],
        responses: {
          '200': {
            description: 'Ranked candidate journey paths',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SearchResultPath' },
                },
                example: [
                  {
                    services: [
                      {
                        id: 's1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
                        type: 'flight',
                        serviceNumber: '6E-501',
                        originStation: {
                          id: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
                          code: 'DEL',
                          name: 'Indira Gandhi International Airport',
                          city: 'New Delhi',
                          latitude: 28.5562,
                          longitude: 77.1000,
                        },
                        destinationStation: {
                          id: 'd3c4b5a6-e7f8-4c9d-0e1f-2a3b4c5d6e7f',
                          code: 'BOM',
                          name: 'Chhatrapati Shivaji Maharaj International Airport',
                          city: 'Mumbai',
                          latitude: 19.0896,
                          longitude: 72.8656,
                        },
                        departureTime: '2026-09-05T10:00:00.000Z',
                        arrivalTime: '2026-09-05T12:15:00.000Z',
                        price: 4500,
                        isDelayed: false,
                        isCancelled: false,
                      },
                    ],
                    totalPrice: 4500,
                    totalDurationMs: 8100000,
                    totalDisplayDurationMs: 9600000,
                    transfers: 0,
                    originWalk: {
                      distanceKm: 0.6,
                      durationMinutes: 8,
                      toStationId: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
                    },
                    destinationWalk: {
                      distanceKm: 0.9,
                      durationMinutes: 12,
                      fromStationId: 'd3c4b5a6-e7f8-4c9d-0e1f-2a3b4c5d6e7f',
                    },
                  },
                ],
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
        },
      },
    },

    '/bookings': {
      post: {
        summary: 'Book a multi-leg itinerary',
        description: 'Creates an itinerary and books all constituent service legs using database transactions and pessimistic locking to avoid overbooking.',
        tags: ['Bookings'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBookingRequest' },
              example: {
                serviceIds: [
                  's1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
                  's2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
                ],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Itinerary and tickets booked successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Itinerary' },
                example: {
                  id: 'it-9a8b7c6d-5e4f-3a2b-1c0d-e1f2a3b4c5d6',
                  totalCost: 5700,
                  status: 'active',
                  originWalk: null,
                  destinationWalk: null,
                  segments: [
                    {
                      id: 'seg-1111-2222-3333-4444',
                      segmentOrder: 0,
                      service: {
                        id: 's1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
                        type: 'train',
                        serviceNumber: 'TR-12001',
                        price: 1200,
                        departureTime: '2026-09-05T08:00:00.000Z',
                        arrivalTime: '2026-09-05T12:00:00.000Z',
                        originStation: { code: 'NDLS', name: 'New Delhi Railway Station', city: 'New Delhi' },
                        destinationStation: { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur' },
                      },
                      tickets: [
                        {
                          id: 'tkt-aaaa-bbbb-cccc-dddd',
                          status: 'valid',
                          qrCode: 'waypoint-qr-3f1b4a8e-28c0-4217-bf28-b9a35e8841ad',
                        },
                      ],
                    },
                  ],
                  createdAt: '2026-09-05T00:30:00.000Z',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/bookings/events': {
      get: {
        summary: 'Stream live disruption events (SSE)',
        description: 'Establishes a Server-Sent Events (SSE) persistent stream for the traveler to receive real-time disruption and resolution alerts.',
        tags: ['Bookings'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'JWT token when EventSource does not support custom Authorization headers',
          },
        ],
        responses: {
          '200': {
            description: 'SSE event stream established',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                  example: 'event: disruption\ndata: {"type":"disruption","itineraryId":"it-123","message":"Service 6E-501 delayed"}\n\n',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
        },
      },
    },

    '/bookings/my': {
      get: {
        summary: 'List user bookings',
        description: 'Returns all itineraries booked by the currently authenticated traveler.',
        tags: ['Bookings'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'List of user itineraries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Itinerary' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
        },
      },
    },

    '/bookings/my/{id}': {
      get: {
        summary: 'Get booking details by ID',
        description: 'Fetches full booking details including service legs, station hubs, operator info, and QR tickets. Automatically marks active itineraries as completed if past arrival time.',
        tags: ['Bookings'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Itinerary UUID',
          },
        ],
        responses: {
          '200': {
            description: 'Itinerary details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Itinerary' },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/bookings/my/{id}/accept-alternative': {
      post: {
        summary: 'Accept rebooking route alternative',
        description: 'Confirms a recommended alternative route for a disrupted journey. Voids broken leg tickets and issues new replacement tickets in a single atomic transaction.',
        tags: ['Bookings'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Disrupted Itinerary UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AcceptAlternativeRequest' },
              example: {
                alternativeIndex: 0,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Alternative accepted and itinerary updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Itinerary' },
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/services': {
      post: {
        summary: 'Create a new transit service',
        description: 'Allows an authenticated operator to schedule a new flight, train, bus, or metro service between two stations.',
        tags: ['Operator Services'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateServiceRequest' },
              example: {
                type: 'flight',
                serviceNumber: '6E-501',
                originStationId: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
                destinationStationId: 'd3c4b5a6-e7f8-4c9d-0e1f-2a3b4c5d6e7f',
                departureTime: '2026-09-06T10:00:00.000Z',
                arrivalTime: '2026-09-06T12:15:00.000Z',
                price: 4500,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Service created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Service' },
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/services/my': {
      get: {
        summary: 'List services managed by operator',
        description: 'Retrieves all transit services owned and scheduled by the logged-in operator.',
        tags: ['Operator Services'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'List of operator services',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Service' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
        },
      },
    },

    '/services/{id}': {
      patch: {
        summary: 'Update transit service details',
        description: 'Modifies schedule timing or price for an operator-owned service. Cancellations must be performed via the dedicated cancellation endpoint.',
        tags: ['Operator Services'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Service UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateServiceRequest' },
              example: {
                departureTime: '2026-09-06T10:30:00.000Z',
                arrivalTime: '2026-09-06T12:45:00.000Z',
                price: 4800,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Service updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Service' },
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
      delete: {
        summary: 'Delete transit service',
        description: 'Permanently deletes a transit service owned by the operator.',
        tags: ['Operator Services'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Service UUID',
          },
        ],
        responses: {
          '200': {
            description: 'Service deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  message: 'Service deleted successfully',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/services/{serviceId}/disruptions/delay': {
      post: {
        summary: 'Report a service delay',
        description: 'Flags a service as delayed with a revised arrival time. Automatically checks connecting itineraries, marks broken connections as DISRUPTED, computes RAPTOR alternative routes, and alerts travelers via SSE and email.',
        tags: ['Disruptions'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'serviceId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Service UUID to flag delay for',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReportDelayRequest' },
              example: {
                newArrivalTime: '2026-09-06T14:30:00.000Z',
                description: 'Technical delay due to air traffic congestion',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Delay reported and cascade notification executed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DisruptionReportResponse' },
                example: {
                  message: 'Delay reported and cascade flagging triggered',
                  event: {
                    id: 'dis-1234-5678-90ab',
                    type: 'delay',
                    description: 'Technical delay due to air traffic congestion',
                    delayMinutes: 45,
                    createdAt: '2026-09-05T01:00:00.000Z',
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/services/{serviceId}/disruptions/cancel': {
      post: {
        summary: 'Report a service cancellation',
        description: 'Cancels a service leg, marks affected itineraries as DISRUPTED, runs RAPTOR from breakdown stations, and dispatches real-time SSE notifications and email alerts with instant alternative paths.',
        tags: ['Disruptions'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'serviceId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Service UUID to cancel',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReportCancellationRequest' },
              example: {
                description: 'Service cancelled due to severe weather and localized visibility issues',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Cancellation reported and cascade notification executed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DisruptionReportResponse' },
                example: {
                  message: 'Cancellation reported and cascade flagging triggered',
                  event: {
                    id: 'dis-c1a2-b3c4-d5e6',
                    type: 'cancellation',
                    description: 'Service cancelled due to severe weather and localized visibility issues',
                    createdAt: '2026-09-05T01:00:00.000Z',
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/admin/stats': {
      get: {
        summary: 'Platform dashboard overview metrics',
        description: 'Provides aggregated statistics including active itineraries, disrupted trips, and registered transit operators.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'Platform metrics snapshot',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminStats' },
                example: {
                  totalOperators: 8,
                  activeItineraries: 42,
                  disruptedItineraries: 2,
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
        },
      },
    },

    '/admin/stations': {
      get: {
        summary: 'List all stations (Admin)',
        description: 'Retrieves all stations in alphabetical order.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'List of all stations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Station' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
        },
      },
      post: {
        summary: 'Register a new station node',
        description: 'Creates a transit hub or station with geographic coordinates for multi-modal routing.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateStationRequest' },
              example: {
                code: 'BLR',
                name: 'Kempegowda International Airport',
                city: 'Bengaluru',
                latitude: 13.1986,
                longitude: 77.7066,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Station created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Station' },
                example: {
                  id: 'stn-blr-9999-8888',
                  code: 'BLR',
                  name: 'Kempegowda International Airport',
                  city: 'Bengaluru',
                  latitude: 13.1986,
                  longitude: 77.7066,
                  createdAt: '2026-09-05T01:10:00.000Z',
                  updatedAt: '2026-09-05T01:10:00.000Z',
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400BadRequest' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
        },
      },
    },

    '/admin/operators': {
      get: {
        summary: 'List transit operators',
        description: 'Returns all operator accounts registered on the platform.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'List of transit operators',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
                example: [
                  {
                    id: 'op-1234-5678-90ab',
                    name: 'IndiGo Airlines',
                    email: 'operations@goindigo.in',
                    role: 'operator',
                    isActive: true,
                    createdAt: '2026-09-01T00:00:00.000Z',
                  },
                ],
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
        },
      },
    },

    '/admin/operators/{id}/suspend': {
      post: {
        summary: 'Suspend an operator account',
        description: 'Revokes active login and service management permissions for the designated operator.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Operator User UUID',
          },
        ],
        responses: {
          '200': {
            description: 'Operator suspended successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  message: 'Operator access revoked successfully',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/admin/operators/{id}/activate': {
      post: {
        summary: 'Activate an operator account',
        description: 'Approves or reactivates a transit operator account, allowing them to manage services and report disruptions.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Operator User UUID',
          },
        ],
        responses: {
          '200': {
            description: 'Operator activated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  message: 'Operator access granted successfully',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/admin/users': {
      get: {
        summary: 'List registered traveler accounts',
        description: 'Retrieves all traveler users registered in the system.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'List of travelers',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
        },
      },
    },

    '/admin/users/{id}/suspend': {
      post: {
        summary: 'Suspend a traveler account',
        description: 'Suspends a traveler account preventing subsequent logins and reservations.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Traveler User UUID',
          },
        ],
        responses: {
          '200': {
            description: 'User suspended successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  message: 'User access revoked successfully',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },

    '/admin/users/{id}/activate': {
      post: {
        summary: 'Activate a traveler account',
        description: 'Reactivates a previously suspended traveler account.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Traveler User UUID',
          },
        ],
        responses: {
          '200': {
            description: 'User activated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  message: 'User access granted successfully',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '404': { $ref: '#/components/responses/404NotFound' },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JSON Web Token passed in Authorization header: Bearer <token>',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'jwt',
        description: 'HttpOnly cookie containing the JWT session token',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Aarav Patel' },
          email: { type: 'string', format: 'email', example: 'aarav.patel@example.com' },
          password: { type: 'string', format: 'password', example: 'Password123!' },
          role: { type: 'string', enum: ['traveler', 'operator'], example: 'traveler' },
        },
      },
      RegisterResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', nullable: true, example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          pendingApproval: { type: 'boolean', example: false },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'aarav.patel@example.com' },
          password: { type: 'string', format: 'password', example: 'Password123!' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Login successful' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'e7b0e1a4-9276-4d2a-b67f-4cb123e45678' },
          name: { type: 'string', example: 'Aarav Patel' },
          email: { type: 'string', format: 'email', example: 'aarav.patel@example.com' },
          role: { type: 'string', enum: ['admin', 'operator', 'traveler'], example: 'traveler' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-01T00:00:00.000Z' },
        },
      },
      Station: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' },
          code: { type: 'string', example: 'DEL' },
          name: { type: 'string', example: 'Indira Gandhi International Airport' },
          city: { type: 'string', example: 'New Delhi' },
          latitude: { type: 'number', nullable: true, example: 28.5562 },
          longitude: { type: 'number', nullable: true, example: 77.1000 },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-01T00:00:00.000Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2026-09-01T00:00:00.000Z' },
        },
      },
      CreateStationRequest: {
        type: 'object',
        required: ['code', 'name', 'city'],
        properties: {
          code: { type: 'string', example: 'BLR' },
          name: { type: 'string', example: 'Kempegowda International Airport' },
          city: { type: 'string', example: 'Bengaluru' },
          latitude: { type: 'number', example: 13.1986 },
          longitude: { type: 'number', example: 77.7066 },
        },
      },
      Service: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 's1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c' },
          type: { type: 'string', enum: ['flight', 'train', 'bus', 'metro', 'walk'], example: 'flight' },
          serviceNumber: { type: 'string', example: '6E-501' },
          originStation: { $ref: '#/components/schemas/Station' },
          destinationStation: { $ref: '#/components/schemas/Station' },
          departureTime: { type: 'string', format: 'date-time', example: '2026-09-06T10:00:00.000Z' },
          arrivalTime: { type: 'string', format: 'date-time', example: '2026-09-06T12:15:00.000Z' },
          price: { type: 'number', example: 4500 },
          isDelayed: { type: 'boolean', example: false },
          isCancelled: { type: 'boolean', example: false },
          operator: { $ref: '#/components/schemas/User' },
        },
      },
      CreateServiceRequest: {
        type: 'object',
        required: ['type', 'serviceNumber', 'originStationId', 'destinationStationId', 'departureTime', 'arrivalTime', 'price'],
        properties: {
          type: { type: 'string', enum: ['flight', 'train', 'bus', 'metro', 'walk'], example: 'train' },
          serviceNumber: { type: 'string', example: 'TR-12001' },
          originStationId: { type: 'string', format: 'uuid', example: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' },
          destinationStationId: { type: 'string', format: 'uuid', example: 'd3c4b5a6-e7f8-4c9d-0e1f-2a3b4c5d6e7f' },
          departureTime: { type: 'string', format: 'date-time', example: '2026-09-06T08:00:00.000Z' },
          arrivalTime: { type: 'string', format: 'date-time', example: '2026-09-06T12:00:00.000Z' },
          price: { type: 'number', example: 1200 },
        },
      },
      UpdateServiceRequest: {
        type: 'object',
        properties: {
          departureTime: { type: 'string', format: 'date-time', example: '2026-09-06T08:30:00.000Z' },
          arrivalTime: { type: 'string', format: 'date-time', example: '2026-09-06T12:30:00.000Z' },
          price: { type: 'number', example: 1350 },
        },
      },
      CreateBookingRequest: {
        type: 'object',
        required: ['serviceIds'],
        properties: {
          serviceIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            example: ['s1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'],
          },
        },
      },
      AcceptAlternativeRequest: {
        type: 'object',
        required: ['alternativeIndex'],
        properties: {
          alternativeIndex: { type: 'integer', example: 0, description: '0-based index of the chosen alternative route in pendingAlternatives' },
        },
      },
      ReportDelayRequest: {
        type: 'object',
        required: ['newArrivalTime'],
        properties: {
          newArrivalTime: { type: 'string', format: 'date-time', example: '2026-09-06T14:30:00.000Z' },
          description: { type: 'string', example: 'Technical delay due to runway maintenance' },
        },
      },
      ReportCancellationRequest: {
        type: 'object',
        properties: {
          description: { type: 'string', example: 'Service cancelled due to bad weather' },
        },
      },
      DisruptionReportResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Delay reported and cascade flagging triggered' },
          event: { $ref: '#/components/schemas/DisruptionEvent' },
        },
      },
      WalkLeg: {
        type: 'object',
        properties: {
          distanceKm: { type: 'number', example: 0.6 },
          durationMinutes: { type: 'number', example: 8 },
          toStationId: { type: 'string', format: 'uuid', nullable: true },
          fromStationId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      SearchResultPath: {
        type: 'object',
        properties: {
          services: {
            type: 'array',
            items: { $ref: '#/components/schemas/Service' },
          },
          totalPrice: { type: 'number', example: 4500 },
          totalDurationMs: { type: 'integer', example: 8100000 },
          totalDisplayDurationMs: { type: 'integer', example: 9600000 },
          transfers: { type: 'integer', example: 0 },
          originWalk: {
            anyOf: [{ $ref: '#/components/schemas/WalkLeg' }, { type: 'null' }],
          },
          destinationWalk: {
            anyOf: [{ $ref: '#/components/schemas/WalkLeg' }, { type: 'null' }],
          },
        },
      },
      Itinerary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'it-9a8b7c6d-5e4f-3a2b-1c0d-e1f2a3b4c5d6' },
          totalCost: { type: 'number', example: 5700 },
          status: { type: 'string', enum: ['active', 'disrupted', 'completed', 'cancelled'], example: 'active' },
          originWalk: {
            anyOf: [{ $ref: '#/components/schemas/WalkLeg' }, { type: 'null' }],
          },
          destinationWalk: {
            anyOf: [{ $ref: '#/components/schemas/WalkLeg' }, { type: 'null' }],
          },
          segments: {
            type: 'array',
            items: { $ref: '#/components/schemas/ItinerarySegment' },
          },
          pendingAlternatives: {
            type: 'array',
            items: { $ref: '#/components/schemas/SearchResultPath' },
            nullable: true,
          },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-05T00:30:00.000Z' },
        },
      },
      ItinerarySegment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'seg-1111-2222-3333-4444' },
          segmentOrder: { type: 'integer', example: 0 },
          service: { $ref: '#/components/schemas/Service' },
          tickets: {
            type: 'array',
            items: { $ref: '#/components/schemas/Ticket' },
          },
        },
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'tkt-aaaa-bbbb-cccc-dddd' },
          status: { type: 'string', enum: ['valid', 'cancelled'], example: 'valid' },
          qrCode: { type: 'string', example: 'waypoint-qr-3f1b4a8e-28c0-4217-bf28-b9a35e8841ad' },
        },
      },
      DisruptionEvent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'dis-1234-5678-90ab' },
          type: { type: 'string', enum: ['delay', 'cancellation'], example: 'delay' },
          description: { type: 'string', example: 'Technical delay due to air traffic congestion' },
          delayMinutes: { type: 'integer', nullable: true, example: 45 },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-05T01:00:00.000Z' },
        },
      },
      AdminStats: {
        type: 'object',
        properties: {
          totalOperators: { type: 'integer', example: 8 },
          activeItineraries: { type: 'integer', example: 42 },
          disruptedItineraries: { type: 'integer', example: 2 },
        },
      },
      MessageResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Operation completed successfully' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Invalid request parameter or unauthorized operation' },
        },
      },
    },
    responses: {
      '400BadRequest': {
        description: 'Bad Request - Validation or parameter error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              status: 'error',
              message: 'Invalid request body or parameters',
            },
          },
        },
      },
      '401Unauthorized': {
        description: 'Unauthorized - Missing or invalid JWT credentials',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              status: 'error',
              message: 'Authentication token missing or expired',
            },
          },
        },
      },
      '403Forbidden': {
        description: 'Forbidden - Insufficient role permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              status: 'error',
              message: 'Access denied: Insufficient permissions',
            },
          },
        },
      },
      '404NotFound': {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              status: 'error',
              message: 'Resource not found',
            },
          },
        },
      },
    },
  },
};
