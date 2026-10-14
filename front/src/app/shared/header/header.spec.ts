import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Mock } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { Header } from './header';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let page: HTMLElement;
  let logout: Mock;
  const isLoggedIn = signal(false);

  beforeEach(async () => {
    isLoggedIn.set(false);
    logout = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), { provide: AuthService, useValue: { isLoggedIn, logout } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  function headerButton(): HTMLAnchorElement {
    return page.querySelector('a.button-dark')!;
  }

  async function logIn(): Promise<void> {
    isLoggedIn.set(true);
    await fixture.whenStable();
  }

  it('should offer to log in when no one is logged in', () => {
    expect(headerButton().textContent?.trim()).toBe('Se connecter');
    expect(headerButton().getAttribute('href')).toBe('/login');
    expect(page.querySelector('.logout')).toBeNull();
  });

  it('should switch to the personal space as soon as the user logs in', async () => {
    await logIn();

    expect(headerButton().textContent?.trim()).toBe('Mon espace');
    expect(headerButton().getAttribute('href')).toBe('/my-files');
  });

  it('should forget the token and go to the login page on logout', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await logIn();

    page.querySelector<HTMLButtonElement>('.logout')!.click();

    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
