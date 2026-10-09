import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Header } from './header';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let page: HTMLElement;
  const isLoggedIn = signal(false);

  beforeEach(async () => {
    isLoggedIn.set(false);

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), { provide: AuthService, useValue: { isLoggedIn } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  function headerButton(): HTMLAnchorElement {
    return page.querySelector('.header-button')!;
  }

  it('should offer to log in when no one is logged in', () => {
    expect(headerButton().textContent?.trim()).toBe('Se connecter');
    expect(headerButton().getAttribute('href')).toBe('/login');
  });

  it('should switch to the personal space as soon as the user logs in', async () => {
    isLoggedIn.set(true);
    await fixture.whenStable();

    expect(headerButton().textContent?.trim()).toBe('Mon espace');
    expect(headerButton().getAttribute('href')).toBe('/my-files');
  });
});
