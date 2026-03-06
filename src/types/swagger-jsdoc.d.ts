declare module "swagger-jsdoc" {
  interface SwaggerDefinition {
    openapi?: string;
    info: {
      title: string;
      version: string;
      description?: string;
    };
    servers?: Array<{
      url: string;
      description?: string;
    }>;
    [key: string]: any;
  }

  interface Options {
    definition?: SwaggerDefinition;
    swaggerDefinition?: SwaggerDefinition;
    apis: string[];
  }

  function swaggerJsdoc(options: Options): any;
  export = swaggerJsdoc;
}
