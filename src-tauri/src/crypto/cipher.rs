//! Symmetric encryption using ChaCha20-Poly1305

use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305, Key, Nonce,
};
use zeroize::ZeroizeOnDrop;

use crate::error::{AppError, Result};

/// Size of the nonce in bytes (96 bits)
pub const NONCE_SIZE: usize = 12;

/// Size of the authentication tag in bytes (128 bits)
pub const TAG_SIZE: usize = 16;

/// Encrypted data with nonce prepended
#[derive(ZeroizeOnDrop)]
pub struct EncryptedData {
    #[zeroize(skip)]
    pub nonce: [u8; NONCE_SIZE],
    pub ciphertext: Vec<u8>,
}

impl EncryptedData {
    /// Serialize to bytes (nonce + ciphertext)
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(NONCE_SIZE + self.ciphertext.len());
        bytes.extend_from_slice(&self.nonce);
        bytes.extend_from_slice(&self.ciphertext);
        bytes
    }

    /// Deserialize from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < NONCE_SIZE {
            return Err(AppError::Decryption("Data too short".into()));
        }

        let mut nonce = [0u8; NONCE_SIZE];
        nonce.copy_from_slice(&bytes[..NONCE_SIZE]);
        let ciphertext = bytes[NONCE_SIZE..].to_vec();

        Ok(Self { nonce, ciphertext })
    }
}

/// Encrypt data using ChaCha20-Poly1305
pub fn encrypt(plaintext: &[u8], key: &[u8; 32], nonce: &[u8; NONCE_SIZE]) -> Result<EncryptedData> {
    let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
    let nonce = Nonce::clone_from_slice(nonce);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| AppError::Encryption(e.to_string()))?;

    Ok(EncryptedData {
        nonce: nonce.into(),
        ciphertext,
    })
}

/// Decrypt data using ChaCha20-Poly1305
pub fn decrypt(encrypted: &EncryptedData, key: &[u8; 32]) -> Result<Vec<u8>> {
    let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
    let nonce = Nonce::clone_from_slice(&encrypted.nonce);

    let plaintext = cipher
        .decrypt(&nonce, encrypted.ciphertext.as_slice())
        .map_err(|_| AppError::Decryption("Failed to decrypt data".into()))?;

    Ok(plaintext)
}

/// Encrypt a string
pub fn encrypt_string(plaintext: &str, key: &[u8; 32], nonce: &[u8; NONCE_SIZE]) -> Result<EncryptedData> {
    encrypt(plaintext.as_bytes(), key, nonce)
}

/// Decrypt to a string
pub fn decrypt_to_string(encrypted: &EncryptedData, key: &[u8; 32]) -> Result<String> {
    let plaintext = decrypt(encrypted, key)?;
    String::from_utf8(plaintext).map_err(|e| AppError::Decryption(format!("Invalid UTF-8: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let key = [0u8; 32];
        let nonce = [0u8; NONCE_SIZE];
        let plaintext = b"Hello, World!";

        let encrypted = encrypt(plaintext, &key, &nonce).unwrap();
        let decrypted = decrypt(&encrypted, &key).unwrap();

        assert_eq!(plaintext.to_vec(), decrypted);
    }

    #[test]
    fn test_encrypt_decrypt_string() {
        let key = [1u8; 32];
        let nonce = [2u8; NONCE_SIZE];
        let plaintext = "这是一个测试 🔐";

        let encrypted = encrypt_string(plaintext, &key, &nonce).unwrap();
        let decrypted = decrypt_to_string(&encrypted, &key).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_wrong_key_fails() {
        let key1 = [1u8; 32];
        let key2 = [2u8; 32];
        let nonce = [0u8; NONCE_SIZE];
        let plaintext = b"Secret data";

        let encrypted = encrypt(plaintext, &key1, &nonce).unwrap();
        let result = decrypt(&encrypted, &key2);

        assert!(result.is_err());
    }

    #[test]
    fn test_serialization() {
        let key = [0u8; 32];
        let nonce = [5u8; NONCE_SIZE];
        let plaintext = b"Test data";

        let encrypted = encrypt(plaintext, &key, &nonce).unwrap();
        let bytes = encrypted.to_bytes();
        let restored = EncryptedData::from_bytes(&bytes).unwrap();
        let decrypted = decrypt(&restored, &key).unwrap();

        assert_eq!(plaintext.to_vec(), decrypted);
    }
}
