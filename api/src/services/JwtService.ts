import expressJwt from 'express-jwt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const { JWT_NAMESPACE = 'http://localhost:4000/graphql', JWT_SECRET = 'not so secret' } = process.env;

export interface JwtUser {
  sub: string;
}

export class JwtService {
  static middleware = expressJwt({ secret: JWT_SECRET, algorithms: ['HS256'], credentialsRequired: false });

  static create(user: User): string {
    return jwt.sign({ [JWT_NAMESPACE]: { roles: [] } }, JWT_SECRET, {
      algorithm: 'HS256',
      subject: user._id.toString(),
    });
  }
}
