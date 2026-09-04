export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Waypoint Multi-Modal Travel & Disruption API',
    version: '1.0.0',
  },
  tags: [
    { name: 'System', description: 'System health and diagnostics' },
    { name: 'Authentication', description: 'User registration, login session, and token generation' },
    { name: 'Stations', description: 'Public station nodes and transit hubs' },
    { name: 'Search & Routing', description: 'Multi-modal itinerary search with RAPTOR algorithm' },
    { name: 'Bookings', description: 'Pessimistic-locked bookings, QR tickets, and user bookings' },
    { name: 'Operator Services', description: 'Transit operator route and schedule management' },
    { name: 'Disruptions', description: 'Operator delay reporting and automated cascade replanning engine' },
    { name: 'Admin Management', description: 'Platform administration, operator onboarding, and analytics' }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        description: 'Returns operational status of the Waypoint backend service.',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Service is operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    message: { type: 'string', example: 'Waypoint API is running' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register a new traveler account',
        description: 'Creates a new user profile with Traveler privileges.',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RegisterRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Traveler registered successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse'
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/400BadRequest'
          }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user & receive JWT cookie / token',
        description: 'Validates user credentials, returns bearer JWT in JSON payload and sets HttpOnly cookie.',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            headers: {
              'Set-Cookie': {
                schema: {
                  type: 'string',
                  example: 'jwt=eyJhbGciOiJIUzI1Ni...; HttpOnly; Path=/; Max-Age=86400'
                }
              }
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse'
                }
              }
            }
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/403Forbidden'
          }
        }
      }
    },
    '/auth/logout': {
      post: {
        summary: 'Clear session cookies',
        description: 'Clears the JWT HttpOnly authentication cookie.',
        tags: ['Authentication'],
        responses: {
          '200': {
            description: 'Successfully logged out',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Logged out successfully' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/stations': {
      get: {
        summary: 'List all stations and transit hubs (Public)',
        description: 'Retrieves all available transit stations, hubs, airports, and stops with geographic coordinates.',
        tags: ['Stations'],
        responses: {
          '200': {
            description: 'List of all transit stations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Station'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/search': {
      get: {
        summary: 'Search multi-modal itineraries with RAPTOR algorithm',
        description:
          'Executes a round-based RAPTOR search connecting candidate stations near the origin pin to candidate stations near the destination pin across transit modalities (flights, trains, metros, buses) enforcing transfer buffers.',
        tags: ['Search & Routing'],
        parameters: [
          {
            name: 'originLat',
            in: 'query',
            required: true,
            description: 'Traveler origin pinpoint latitude',
            schema: {
              type: 'number',
              example: 28.5562
            }
          },
          {
            name: 'originLng',
            in: 'query',
            required: true,
            description: 'Traveler origin pinpoint longitude',
            schema: {
              type: 'number',
              example: 77.1000
            }
          },
          {
            name: 'destinationLat',
            in: 'query',
            required: true,
            description: 'Traveler destination pinpoint latitude',
            schema: {
              type: 'number',
              example: 19.0896
            }
          },
          {
            name: 'destinationLng',
            in: 'query',
            required: true,
            description: 'Traveler destination pinpoint longitude',
            schema: {
              type: 'number',
              example: 72.8656
            }
          },
          {
            name: 'date',
            in: 'query',
            required: true,
            description: 'Travel departure date (ISO-8601 or YYYY-MM-DD)',
            schema: {
              type: 'string',
              example: '2026-09-02T00:00:00.000Z'
            }
          },
          {
            name: 'sortBy',
            in: 'query',
            required: false,
            description: 'Sort strategy for resulting itineraries',
            schema: {
              type: 'string',
              enum: ['fastest', 'cheapest', 'transfers'],
              default: 'cheapest'
            }
          }
        ],
        responses: {
          '200': {
            description: 'List of synthesized transit route solutions',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/SearchResultPath'
                  }
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/400BadRequest'
          }
        }
      }
    },
    '/bookings': {
      post: {
        summary: 'Book an itinerary with pessimistic seat inventory lock',
        description:
          'Acquires database row-level pessimistic locks (SELECT FOR UPDATE) on all itinerary service segments, decrements seat inventory atomically, and generates QR ticket passes.',
        tags: ['Bookings'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['serviceIds'],
                properties: {
                  serviceIds: {
                    type: 'array',
                    description: 'Ordered array of Service UUIDs forming the multi-segment journey',
                    items: {
                      type: 'string',
                      format: 'uuid'
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Itinerary and tickets successfully confirmed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Itinerary'
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/400BadRequest'
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          }
        }
      }
    },
    '/bookings/my': {
      get: {
        summary: 'Get logged-in traveler itineraries & tickets',
        description: 'Retrieves all booked itineraries, segment statuses, and active QR ticket payloads for the authenticated traveler.',
        tags: ['Bookings'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'User itineraries with segments and QR codes',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Itinerary'
                  }
                }
              }
            }
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          }
        }
      }
    },
    '/services': {
      post: {
        summary: 'Create a new scheduled transit service',
        description: 'Allows an authenticated transit operator to publish a flight, train, bus, or metro schedule.',
        tags: ['Operator Services'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateServiceRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Service scheduled successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Service'
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/400BadRequest'
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/403Forbidden'
          }
        }
      }
    },
    '/services/my': {
      get: {
        summary: 'Get all services owned by current operator',
        description: 'Lists all transit routes and schedules published by the authenticated operator.',
        tags: ['Operator Services'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'Operator owned transit services',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Service'
                  }
                }
              }
            }
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/403Forbidden'
          }
        }
      }
    },
    '/services/{id}': {
      patch: {
        summary: 'Edit an owned service schedule or pricing',
        description: 'Updates price, capacity, departure, or arrival time for an existing operator service.',
        tags: ['Operator Services'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  price: { type: 'number', example: 1200 },
                  seatCapacity: { type: 'integer', example: 200 },
                  departureTime: { type: 'string', format: 'date-time' },
                  arrivalTime: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Service updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Service'
                }
              }
            }
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/403Forbidden'
          }
        }
      },
      delete: {
        summary: 'Delete an owned service',
        description: 'Removes an unbooked or deprecated service from the schedule.',
        tags: ['Operator Services'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Service deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Service deleted successfully' }
                  }
                }
              }
            }
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/403Forbidden'
          }
        }
      }
    },
    '/services/{serviceId}/disruptions/delay': {
      post: {
        summary: 'Report a delay on owned service (triggers cascade replan)',
        description:
          'Reports delayed arrival. Evaluates all downstream passenger connections, detects broken layover windows (< 30 min), marks affected itineraries as DISRUPTED, and initiates replanning.',
        tags: ['Disruptions'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'serviceId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newArrivalTime'],
                properties: {
                  newArrivalTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Updated delayed arrival timestamp'
                  },
                  description: {
                    type: 'string',
                    example: 'Technical delay due to runway maintenance'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Disruption recorded and cascade replanning triggered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Disruption reported and cascade replan triggered' },
                    event: {
                      $ref: '#/components/schemas/DisruptionEvent'
                    }
                  }
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/400BadRequest'
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/403Forbidden'
          }
        }
      }
    },
    '/admin/stats': {
      get: {
        summary: 'Get system-wide platform statistics',
        description: 'Returns metrics on total operators, active bookings, disrupted journeys, and transit system health.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'System metrics',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminStats'
                }
              }
            }
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/403Forbidden'
          }
        }
      }
    },
    '/admin/stations': {
      get: {
        summary: 'List all stations (Admin view)',
        description: 'Returns all stations including operational metadata.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'List of stations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Station'
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create a new station node in network',
        description: 'Adds a transit station, airport, railway terminal, or bus station to the global network graph.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateStationRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Station created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Station'
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/400BadRequest'
          },
          '401': {
            $ref: '#/components/responses/401Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/403Forbidden'
          }
        }
      }
    },
    '/admin/operators': {
      get: {
        summary: 'List all registered operators',
        description: 'Retrieves all transportation operators registered on the Waypoint platform.',
        tags: ['Admin Management'],
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          '200': {
            description: 'List of operators',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/admin/operators/{id}/suspend': {
        post: {
          summary: 'Suspend an operator account',
          description: 'Deactivates an operator profile, revoking access to schedule management.',
          tags: ['Admin Management'],
          security: [{ BearerAuth: [] }, { CookieAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Operator suspended',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Operator access revoked successfully' }
                    }
                  }
                }
              }
            },
            '401': {
              $ref: '#/components/responses/401Unauthorized'
            },
            '403': {
              $ref: '#/components/responses/403Forbidden'
            }
          }
        }
      },
      '/admin/operators/{id}/activate': {
        post: {
          summary: 'Grant access to an operator account',
          description: 'Activates an operator profile, granting access to schedule management.',
          tags: ['Admin Management'],
          security: [{ BearerAuth: [] }, { CookieAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Operator activated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Operator access granted successfully' }
                    }
                  }
                }
              }
            },
            '401': {
              $ref: '#/components/responses/401Unauthorized'
            },
            '403': {
              $ref: '#/components/responses/403Forbidden'
            }
          }
        }
      },
      '/admin/users': {
        get: {
          summary: 'List all registered travelers',
          description: 'Retrieves all traveler users registered on the platform.',
          tags: ['Admin Management'],
          security: [{ BearerAuth: [] }, { CookieAuth: [] }],
          responses: {
            '200': {
              description: 'List of travelers',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/User'
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/admin/users/{id}/suspend': {
        post: {
          summary: 'Suspend a traveler account',
          description: 'Deactivates a traveler profile, revoking access to bookings and searches.',
          tags: ['Admin Management'],
          security: [{ BearerAuth: [] }, { CookieAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid'
              }
            }
          ],
          responses: {
            '200': {
              description: 'User suspended',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'User access revoked successfully' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/admin/users/{id}/activate': {
        post: {
          summary: 'Grant access to a traveler account',
          description: 'Re-activates a traveler profile.',
          tags: ['Admin Management'],
          security: [{ BearerAuth: [] }, { CookieAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid'
              }
            }
          ],
          responses: {
            '200': {
              description: 'User activated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'User access granted successfully' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Standard JSON Web Token passed in Authorization header: Bearer <token>'
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'jwt',
          description: 'HttpOnly authentication cookie containing the JWT session token'
        }
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Aarav Patel' },
            email: { type: 'string', format: 'email', example: 'aarav@gmail.com' },
            password: { type: 'string', format: 'password', example: 'Password123!' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@waypoint.com' },
            password: { type: 'string', format: 'password', example: 'Password123!' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Login successful' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Aarav Patel' },
            email: { type: 'string', format: 'email', example: 'aarav@gmail.com' },
            role: { type: 'string', enum: ['admin', 'operator', 'traveler'], example: 'traveler' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Station: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', example: 'DEL' },
            name: { type: 'string', example: 'Indira Gandhi International Airport' },
            city: { type: 'string', example: 'New Delhi' },
            latitude: { type: 'number', example: 28.5562 },
            longitude: { type: 'number', example: 77.1000 }
          }
        },
        CreateStationRequest: {
          type: 'object',
          required: ['code', 'name', 'city'],
          properties: {
            code: { type: 'string', example: 'BOM' },
            name: { type: 'string', example: 'Chhatrapati Shivaji Maharaj International Airport' },
            city: { type: 'string', example: 'Mumbai' },
            latitude: { type: 'number', example: 19.0896 },
            longitude: { type: 'number', example: 72.8656 }
          }
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['flight', 'train', 'bus', 'metro', 'walk'], example: 'flight' },
            serviceNumber: { type: 'string', example: '6E-501' },
            originStation: { $ref: '#/components/schemas/Station' },
            destinationStation: { $ref: '#/components/schemas/Station' },
            departureTime: { type: 'string', format: 'date-time' },
            arrivalTime: { type: 'string', format: 'date-time' },
            price: { type: 'number', example: 4500.0 },
            isDelayed: { type: 'boolean', example: false },
            isCancelled: { type: 'boolean', example: false }
          }
        },
        CreateServiceRequest: {
          type: 'object',
          required: ['type', 'serviceNumber', 'originStationId', 'destinationStationId', 'departureTime', 'arrivalTime', 'price'],
          properties: {
            type: { type: 'string', enum: ['flight', 'train', 'bus', 'metro', 'walk'], example: 'train' },
            serviceNumber: { type: 'string', example: 'TR-12001' },
            originStationId: { type: 'string', format: 'uuid' },
            destinationStationId: { type: 'string', format: 'uuid' },
            departureTime: { type: 'string', format: 'date-time' },
            arrivalTime: { type: 'string', format: 'date-time' },
            price: { type: 'number', example: 1200.0 }
          }
        },
        WalkLeg: {
          type: 'object',
          properties: {
            distanceKm: { type: 'number', example: 1.2 },
            durationMinutes: { type: 'integer', example: 16 },
            toStationId: { type: 'string', format: 'uuid' },
            fromStationId: { type: 'string', format: 'uuid' }
          }
        },
        SearchResultPath: {
          type: 'object',
          properties: {
            services: {
              type: 'array',
              items: { $ref: '#/components/schemas/Service' }
            },
            totalPrice: { type: 'number', example: 5700.0 },
            totalDurationMs: { type: 'integer', example: 18000000 },
            totalDisplayDurationMs: { type: 'integer', example: 19800000 },
            transfers: { type: 'integer', example: 1 },
            originWalk: {
              anyOf: [{ $ref: '#/components/schemas/WalkLeg' }, { type: 'null' }]
            },
            destinationWalk: {
              anyOf: [{ $ref: '#/components/schemas/WalkLeg' }, { type: 'null' }]
            }
          }
        },
        Itinerary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            totalCost: { type: 'number', example: 5700.0 },
            status: { type: 'string', enum: ['active', 'disrupted', 'completed', 'cancelled'], example: 'active' },
            originWalk: {
              anyOf: [{ $ref: '#/components/schemas/WalkLeg' }, { type: 'null' }]
            },
            destinationWalk: {
              anyOf: [{ $ref: '#/components/schemas/WalkLeg' }, { type: 'null' }]
            },
            segments: {
              type: 'array',
              items: { $ref: '#/components/schemas/ItinerarySegment' }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ItinerarySegment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            segmentOrder: { type: 'integer', example: 1 },
            service: { $ref: '#/components/schemas/Service' },
            tickets: {
              type: 'array',
              items: { $ref: '#/components/schemas/Ticket' }
            }
          }
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['valid', 'cancelled'], example: 'valid' },
            qrCode: { type: 'string', example: 'wp-ticket-3f1b4a8e-28c0-4217-bf28-b9a35e8841ad' }
          }
        },
        DisruptionEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['delay', 'cancellation'], example: 'delay' },
            description: { type: 'string', example: 'Technical delay due to runway maintenance' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        AdminStats: {
          type: 'object',
          properties: {
            totalOperators: { type: 'integer', example: 12 },
            activeItineraries: { type: 'integer', example: 145 },
            disruptedItineraries: { type: 'integer', example: 3 }
          }
        },
        OnboardOperatorRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'IndiGo Airlines' },
            email: { type: 'string', format: 'email', example: 'ops@goindigo.in' },
            password: { type: 'string', format: 'password', example: 'IndiGoSecurePass1!' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Invalid request parameter or unauthorized operation' }
          }
        }
      },
      responses: {
        '400BadRequest': {
          description: 'Bad Request - Validation or parameter error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '401Unauthorized': {
          description: 'Unauthorized - Missing or invalid JWT credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '403Forbidden': {
          description: 'Forbidden - Insufficient role permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        '404NotFound': {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  };
