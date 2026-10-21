// Temporary access only. Credentials are intentionally neither checked nor retained.
export function createPreviewUser({ firstName, lastName, username, email, photo } = {}) {
  return {
    id: crypto.randomUUID(),
    firstName: firstName?.trim() || 'Player',
    lastName: lastName?.trim() || '',
    username: username?.trim() || 'player',
    email: email?.trim() || '',
    photo: photo || '',
    bio: '', position: '', jersey: '', role: 'kid',
    completed: {}, progress: {}, rulebooks: [],
    privacy: { showStats: true },
    notifications: { training: true, team: true },
  };
}
