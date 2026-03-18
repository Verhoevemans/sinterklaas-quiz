import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  Signal,
  OnInit,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminApiService, QuestionFormData } from '../../../services/admin-api.service';

@Component({
  selector: 'app-question-form',
  imports: [ReactiveFormsModule],
  templateUrl: './question-form.html',
  styleUrl: './question-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionFormComponent implements OnInit {
  private readonly adminApi: AdminApiService = inject(AdminApiService);
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  public readonly editId = signal<string | null>(null);
  public readonly loading = signal<boolean>(false);
  public readonly saving = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  public readonly isEditMode: Signal<boolean> = computed(() => this.editId() !== null);

  public readonly form: FormGroup = new FormGroup({
    text: new FormControl('', [Validators.required, Validators.maxLength(500)]),
    option0: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    option1: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    option2: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    option3: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    correctAnswerIndex: new FormControl(0, [Validators.required]),
    explanation: new FormControl('', [Validators.required, Validators.maxLength(1000)]),
    isActive: new FormControl(true),
  });

  public async ngOnInit(): Promise<void> {
    const id: string | null = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      await this.loadQuestion(id);
    }
  }

  private async loadQuestion(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const q = await this.adminApi.getQuestion(id);
      this.form.patchValue({
        text: q.text,
        option0: q.options[0] ?? '',
        option1: q.options[1] ?? '',
        option2: q.options[2] ?? '',
        option3: q.options[3] ?? '',
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
        isActive: q.isActive,
      });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Laden mislukt');
    } finally {
      this.loading.set(false);
    }
  }

  public async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);

    const v = this.form.value;
    const data: QuestionFormData = {
      text: v.text as string,
      options: [v.option0 as string, v.option1 as string, v.option2 as string, v.option3 as string],
      correctAnswerIndex: Number(v.correctAnswerIndex),
      explanation: v.explanation as string,
      isActive: v.isActive as boolean,
    };

    try {
      const id: string | null = this.editId();
      if (id) {
        await this.adminApi.updateQuestion(id, data);
      } else {
        await this.adminApi.createQuestion(data);
      }
      this.router.navigate(['/admin/questions']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      this.saving.set(false);
    }
  }

  public cancel(): void {
    this.router.navigate(['/admin/questions']);
  }
}
