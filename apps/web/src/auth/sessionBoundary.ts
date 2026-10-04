// Invalidate outstanding UI work whenever the identity changes, including sign-out
// followed by a new session for the same UID.
export class SessionBoundary {
  private revision = 0;
  private owner: string | null = null;

  enter(owner: string | null): void {
    this.owner = owner;
    this.revision += 1;
  }

  capture(): () => boolean {
    const owner = this.owner;
    const revision = this.revision;
    return () => owner !== null && owner === this.owner && revision === this.revision;
  }
}
