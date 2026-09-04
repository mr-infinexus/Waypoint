import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../docs/spec';

const router = Router();

const swaggerOptions = {
  customSiteTitle: 'Waypoint API Explorer',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list'
  }
};

router.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));

export default router;
