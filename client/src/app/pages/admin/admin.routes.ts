import { Routes } from '@angular/router';
import { AdminComponent } from './admin';
import { LoginComponent } from './login/login';
import { QuestionsComponent } from './questions/questions';
import { QuestionFormComponent } from './question-form/question-form';
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
