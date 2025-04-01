import { expressjwt } from 'express-jwt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Service } from './Service';

const { JWT_NAMESPACE = 'http://localhost:4000/graphql', JWT_SECRET = 'not so secret' } = process.env;

export interface JwtUser {
  sub: string;
}

export class JwtService extends Service {
  static middleware = expressjwt({
    secret: JWT_SECRET,
    algorithms: ['HS256'],
    credentialsRequired: false,
  });

  create(user: User): string {
    return jwt.sign({ [JWT_NAMESPACE]: { roles: [] } }, JWT_SECRET, {
      algorithm: 'HS256',
      subject: user._id.toString(),
      expiresIn: '30 days',
    });
  }
}
