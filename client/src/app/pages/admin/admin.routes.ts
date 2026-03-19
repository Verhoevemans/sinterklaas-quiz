import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { LoginComponent } from './login/login.component';
import { QuestionsComponent } from './questions/questions.component';
import { QuestionFormComponent } from './question-form/question-form.component';
import { adminAuthGuard, adminLoginGuard } from './admin-auth.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: '', redirectTo: 'questions', pathMatch: 'full' },
      { path: 'login', component: LoginComponent, canActivate: [adminLoginGuard] },
      { path: 'questions', component: QuestionsComponent, canActivate: [adminAuthGuard] },
      { path: 'questions/new', component: QuestionFormComponent, canActivate: [adminAuthGuard] },
      {
        path: 'questions/:id/edit',
        component: QuestionFormComponent,
        canActivate: [adminAuthGuard],
      },
    ],
  },
];
