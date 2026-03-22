import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Question } from '../../../shared/models';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-questions',
  imports: [],
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionsComponent implements OnInit {
  private readonly adminService: AdminService = inject(AdminService);
  private readonly router: Router = inject(Router);

  public readonly questions = signal<Question[]>([]);
  public readonly currentPage = signal<number>(1);
  public readonly totalPages = signal<number>(1);
  public readonly total = signal<number>(0);
  public readonly includeDeleted = signal<boolean>(false);
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  public async ngOnInit(): Promise<void> {
    await this.loadQuestions();
  }

  public async loadQuestions(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.adminService.listQuestions(this.currentPage(), this.includeDeleted());
      this.questions.set(result.questions);
      this.totalPages.set(result.pagination.totalPages);
      this.total.set(result.pagination.total);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Laden mislukt');
    } finally {
      this.loading.set(false);
    }
  }

  public async setPage(page: number): Promise<void> {
    this.currentPage.set(page);
    await this.loadQuestions();
  }

  public async toggleIncludeDeleted(): Promise<void> {
    this.includeDeleted.update((v) => !v);
    this.currentPage.set(1);
    await this.loadQuestions();
  }

  public navigateToNew(): void {
    this.router.navigate(['/admin/questions/new']);
  }

  public navigateToEdit(id: string): void {
    this.router.navigate(['/admin/questions', id, 'edit']);
  }

  public async deleteQuestion(id: string): Promise<void> {
    if (!confirm('Weet je zeker dat je deze vraag wilt verwijderen?')) return;
    try {
      await this.adminService.deleteQuestion(id);
      await this.loadQuestions();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Verwijderen mislukt');
    }
  }

  public async restoreQuestion(id: string): Promise<void> {
    try {
      await this.adminService.restoreQuestion(id);
      await this.loadQuestions();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Herstellen mislukt');
    }
  }
}
