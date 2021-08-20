import { User } from '../models/User';
import { JwtUser } from '../services/JwtService';

export interface Context {
  jwtUser?: JwtUser;
  user?: Promise<User>;
}
