/**
 * Authentication Service - Handle user authentication logic
 */

import { generateJWT, hashPassword, comparePasswords, verifyJWT } from '../utils/jwt.js';
import { validateEmail, validatePassword, mergeValidationResults } from '../utils/validators.js';
import { v4 as uuidv4 } from 'uuid';

class AuthService {
  constructor(userRepository, kvService, jwtSecret = 'dev-secret') {
    this.userRepository = userRepository;
    this.kvService = kvService;
    this.jwtSecret = jwtSecret;
  }

  async signup(email, password, name) {
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const result = mergeValidationResults(emailValidation, passwordValidation);

    if (!result.isValid()) {
      const errors = result.getErrors();
      throw new Error(`Validation failed: ${errors.map((e) => e.message).join(', ')}`);
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const userId = `user_${uuidv4()}`;
    const passwordHash = await hashPassword(password);

    const user = await this.userRepository.create({
      id: userId,
      email,
      name,
    });

    await this.userRepository.updatePasswordHash(userId, passwordHash);

    const token = await generateJWT({ userId, email }, this.jwtSecret, 86400);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      expiresIn: 86400,
    };
  }

  async login(email, password) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid()) {
      throw new Error('Invalid email format');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const passwordHash = await this.userRepository.getPasswordHash(user.id);
    const isPasswordValid = await comparePasswords(password, passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    const token = await generateJWT({ userId: user.id, email: user.email }, this.jwtSecret, 86400);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      expiresIn: 86400,
    };
  }

  async verifyToken(token) {
    const payload = await verifyJWT(token, this.jwtSecret);

    if (!payload) {
      return null;
    }

    const user = await this.userRepository.findById(payload.userId);
    return user;
  }

  async logout(userId) {
    await this.kvService.deleteToken(userId);
  }
}

export default AuthService;
