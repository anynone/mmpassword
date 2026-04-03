use argon2::{Algorithm, Argon2, Params, Version};
use base64::Engine;
use chacha20poly1305::{aead::{Aead, KeyInit}, ChaCha20Poly1305, Nonce};
use rand::RngCore;

use crate::error::AppError;

const MMP_MAGIC: &[u8; 4] = b"MMP1";
const VAULT_VERSION: u16 = 1;
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;

/// Encrypt vault JSON bytes into .mmp binary format, then base64 encode
pub fn encrypt_vault_to_base64(
    vault_json: &[u8],
    password: &str,
) -> Result<String, AppError> {
    let mut salt = [0u8; SALT_LEN];
    rand::thread_rng().fill_bytes(&mut salt);

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);

    // Argon2id key derivation
    let params = Params::new(65536, 3, 4, Some(32))
        .map_err(|e| AppError::Internal(format!("argon2 params: {}", e)))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key_bytes = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), &salt, &mut key_bytes)
        .map_err(|e| AppError::Internal(format!("argon2 derive: {}", e)))?;

    // ChaCha20-Poly1305 encrypt
    let cipher = ChaCha20Poly1305::new_from_slice(&key_bytes)
        .map_err(|e| AppError::Internal(format!("cipher init: {}", e)))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, vault_json)
        .map_err(|e| AppError::Internal(format!("chacha20 encrypt: {}", e)))?;

    // Build .mmp binary format:
    // Header: MMP1 (4B) + version u16LE (2B) + reserved u16LE (2B) = 8B
    // Salt: 16B
    // Nonce: 12B
    // Ciphertext+Tag: variable
    let mut output = Vec::with_capacity(8 + SALT_LEN + NONCE_LEN + ciphertext.len());
    output.extend_from_slice(MMP_MAGIC);
    output.extend_from_slice(&VAULT_VERSION.to_le_bytes());
    output.extend_from_slice(&0u16.to_le_bytes()); // reserved
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    Ok(base64::engine::general_purpose::STANDARD.encode(&output))
}
