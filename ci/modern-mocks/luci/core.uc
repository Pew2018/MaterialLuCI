// Test-only OS identity boundary; never packaged.
export function getuid() { return 0; };
export function getspnam(name) { return { pwdp: global.test_password ?? '' }; };
