import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import config from "../config/env";
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "KSI Gadgets E-Commercew API",
      version: "1.0.0",
      description:
        "Complete e-commerce backend with user management, authentication, products, cart, and orders",
      contact: {
        name: "KSI Gadgets",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Bearer token",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/**/*.ts", "./dist/routes/**/*.js"],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, { swaggerOptions: { persistAuthorization: true } }),
  );
};

export default setupSwagger;
