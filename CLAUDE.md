# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Angular 20.3 application for a Sinterklaas Quiz. Uses modern Angular features including:
- **Zoneless change detection** (`provideZonelessChangeDetection()`)
- **Signals** for reactive state management
- **Standalone components** (no NgModules)

## Development Commands

```bash
# Start development server (http://localhost:4200)
npm start
# or
ng serve

# Build for production
npm run build

# Run unit tests (Karma + Jasmine)
npm test

# Generate new component
ng generate component component-name

# Format code (Prettier configured)
npx prettier --write .
```

## Architecture

**Entry Point**: `src/main.ts` bootstraps the application with `App` component from `src/app/app.ts`

**Configuration**: `src/app/app.config.ts` provides:
- Zoneless change detection
- Browser global error listeners
- Router configuration

**Routing**: Defined in `src/app/app.routes.ts` (currently empty, ready for route definitions)

**Component Structure**:
- Components use separate files: `component.ts`, `component.html`, `component.css`
- All components are standalone with explicit imports
- Use signals (from `@angular/core`) for reactive state

## Prettier Configuration

Code formatting rules in package.json:
- Print width: 100 characters
- Single quotes preferred
- Angular parser for HTML files

## TypeScript Best Practices
- Use strict type checking
- Always use explicit type annotations with `:` and `<>` notations (e.g., `signal<string>('')`, `const foo: string = 'bar'`)
- Always use explicit access modifiers (`public`, `private`, `protected`) on class members
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices
- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead

## Components
- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Prefer inline templates for small components
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead

## Forms
- Always use Reactive Forms (`FormGroup`, `FormControl`) instead of template-driven forms with `ngModel`
- For simple button interactions without forms, `ngModel` is acceptable
- Import `ReactiveFormsModule` when using reactive forms

## State Management
- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Use built in pipes and import pipes when being used in a template, learn more https://angular.dev/guide/templates/pipes#

## Services
- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Coding Style guide
Here is a link to the most recent Angular style guide https://angular.dev/style-guide

## Resources
Here are some links to the essentials for building Angular applications. Use these to get an understanding of how some of the core functionality works

https://angular.dev/essentials/components   
https://angular.dev/essentials/signals  
https://angular.dev/essentials/templates   
https://angular.dev/essentials/dependency-injection   

