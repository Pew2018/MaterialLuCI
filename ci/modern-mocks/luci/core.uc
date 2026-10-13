// Test-only OS boundary, never packaged.
export function getuid() { return 0; }
export function getspnam(name) { return { pwdp: global.test_password ?? '' }; }
