declare module "coinbase-commerce-node" {
  export class Client {
    static init(apiKey: string): void;
  }

  export namespace resources {
    export class Charge {
      static create(data: any): Promise<any>;
      static retrieve(id: string): Promise<any>;
      static list(params?: any): Promise<any>;
      id: string;
      code: string;
      hosted_url: string;
      pricing: any;
      metadata: any;
      timeline: any[];
    }
  }

  export class Webhook {
    static verifySigHeader(
      rawBody: string,
      signature: string,
      secret: string,
    ): any;
  }
}
