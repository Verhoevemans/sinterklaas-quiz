import { Injectable, inject } from '@angular/core';

import { Question } from '../../shared/models';
import { AdminAuthService } from './admin-auth.service';
import { QuestionListResponse } from './questions/questions.models';
import { QuestionFormData } from './question-form/question-form.models';

const ADMIN_API_URL: string = 'http://localhost:3000/api/admin/questions';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly authService: AdminAuthService = inject(AdminAuthService);

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: this.authService.getAuthHeader(),
    };
  }

  public async listQuestions(page: number, includeDeleted: boolean): Promise<QuestionListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      includeDeleted: String(includeDeleted),
    });
    const response: Response = await fetch(`${ADMIN_API_URL}?${params}`, {
      headers: this.headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Laden mislukt');
    }
    return response.json();
  }

  public async getQuestion(id: string): Promise<Question> {
    const response: Response = await fetch(`${ADMIN_API_URL}/${id}`, { headers: this.headers });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Laden mislukt');
    }
    return response.json();
  }

  public async createQuestion(data: QuestionFormData): Promise<Question> {
    const response: Response = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Aanmaken mislukt');
    }
    return response.json();
  }

  public async updateQuestion(id: string, data: QuestionFormData): Promise<Question> {
    const response: Response = await fetch(`${ADMIN_API_URL}/${id}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Opslaan mislukt');
    }
    return response.json();
  }

  public async deleteQuestion(id: string): Promise<void> {
    const response: Response = await fetch(`${ADMIN_API_URL}/${id}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Verwijderen mislukt');
    }
  }

  public async restoreQuestion(id: string): Promise<void> {
    const response: Response = await fetch(`${ADMIN_API_URL}/${id}/restore`, {
      method: 'POST',
      headers: this.headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Herstellen mislukt');
    }
  }
}
