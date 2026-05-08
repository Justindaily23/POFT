import { User } from '@prisma/client';

export type JwtSignUser = Pick<User, 'id' | 'email' | 'role' | 'tokenVersion' | 'mustChangePassword'>;
