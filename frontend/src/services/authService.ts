import api from './api';
import type { AuthResponse } from '../types';

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then(r => r.data),

  register: (data: Record<string, unknown>) =>
    api.post<AuthResponse>('/auth/register', data).then(r => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  getMe: () =>
    api.get('/auth/me').then(r => r.data),
};
