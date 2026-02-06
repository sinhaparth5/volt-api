package database

import (
	"strings"
	"testing"
)

func TestCompressBody_SmallBody(t *testing.T) {
	// Small bodies should not be compressed
	small := "small body"
	result := compressBody(small)
	if result != small {
		t.Errorf("Small body should not be compressed, got: %s", result)
	}
}

func TestCompressBody_LargeBody(t *testing.T) {
	// Create a large, compressible body (JSON with repetition)
	large := `{"data":"` + strings.Repeat("hello world ", 200) + `"}`

	result := compressBody(large)

	// Should be compressed (has prefix)
	if !strings.HasPrefix(result, compressedPrefix) {
		t.Errorf("Large body should be compressed, got length %d (original %d)", len(result), len(large))
	}

	// Should be smaller than original
	if len(result) >= len(large) {
		t.Errorf("Compressed should be smaller: compressed=%d, original=%d", len(result), len(large))
	}
}

func TestDecompressBody_Uncompressed(t *testing.T) {
	// Uncompressed bodies should pass through unchanged
	plain := "plain text body"
	result := decompressBody(plain)
	if result != plain {
		t.Errorf("Uncompressed body should pass through unchanged")
	}
}

func TestCompressDecompressRoundTrip(t *testing.T) {
	// Test round-trip compression/decompression
	original := `{"users":[` + strings.Repeat(`{"name":"John","email":"john@example.com"},`, 100) + `]}`

	compressed := compressBody(original)
	decompressed := decompressBody(compressed)

	if decompressed != original {
		t.Errorf("Round-trip failed.\nOriginal length: %d\nDecompressed length: %d", len(original), len(decompressed))
	}
}

func TestDecompressBody_InvalidData(t *testing.T) {
	// Invalid compressed data should return as-is
	invalid := compressedPrefix + "invalid-base64!!!"
	result := decompressBody(invalid)
	if result != invalid {
		t.Errorf("Invalid data should return as-is")
	}
}

func TestCompressBody_IncompressibleData(t *testing.T) {
	// Random data that doesn't compress well should not use compression
	// (when compressed size >= original size)
	random := strings.Repeat("x", minCompressSize+100)

	result := compressBody(random)

	// Should still work, might or might not be compressed depending on data
	decompressed := decompressBody(result)
	if decompressed != random {
		t.Errorf("Data should be recoverable")
	}
}
