// src/@types/express/index.d.ts
import { AuthenticatedUser } from '../../auth/dto/authenticated-user.dto';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
