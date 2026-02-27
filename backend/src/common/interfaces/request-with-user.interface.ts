// src/common/interfaces/request-with-user.interface.ts
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/auth.service';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
