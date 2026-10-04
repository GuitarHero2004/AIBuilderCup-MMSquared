import { describe, expect, it } from 'vitest';
import { SessionBoundary } from './sessionBoundary';

describe('owner-scoped asynchronous UI results', () => {
  it('does not permit an old owner response after switching to another visitor', async () => {
    const session = new SessionBoundary();
    session.enter('visitor-a');
    const acceptOldResult = session.capture();
    const response = Promise.resolve('visitor-a-private-case');
    session.enter('visitor-b');
    let visibleCase: string | undefined;
    await response.then((value) => { if (acceptOldResult()) visibleCase = value; });
    expect(visibleCase).toBeUndefined();
    expect(session.capture()()).toBe(true);
  });
  it('invalidates outstanding work after sign-out even if the same UID signs back in', () => {
    const session = new SessionBoundary();
    session.enter('visitor-a');
    const oldSession = session.capture();
    session.enter(null);
    expect(session.capture()()).toBe(false);
    session.enter('visitor-a');
    expect(oldSession()).toBe(false);
    expect(session.capture()()).toBe(true);
  });
});
