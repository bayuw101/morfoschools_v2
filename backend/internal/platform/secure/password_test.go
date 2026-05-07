package secure

import "testing"

func TestFormatAndVerifyPasswordHash(t *testing.T) {
	hash := FormatPasswordHash("morfosis123", []byte("deterministic-salt"), 210000)
	if !VerifyPassword(hash, "morfosis123") {
		t.Fatal("expected correct password to verify")
	}
	if VerifyPassword(hash, "wrong") {
		t.Fatal("expected wrong password to fail")
	}
}

func TestVerifyPasswordRejectsMalformedHash(t *testing.T) {
	if VerifyPassword("morfosis123", "dev-placeholder-hash-change-me") {
		t.Fatal("expected malformed legacy hash to fail closed")
	}
}
