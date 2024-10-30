// custom-request.interface.ts
import { Request } from 'express';

export interface CustomRequest extends Request {
  user?: any; // You can replace `any` with a more specific type if you have one
}
