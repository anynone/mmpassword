//! Key Derivation Function using Argon2id

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2, Params,
};
use zeroize::ZeroizeOnDrop;

use crate::error::{AppError, Result};

/// Argon2id parameters for key derivation
/// These are chosen to provide strong security while maintaining reasonable performance
pub struct KdfParams {
    /// Memory cost in KiB (64 MB)
    pub m_cost: u32,
    /// Time cost (iterations)
    pub t_cost: u32,
    /// Parallelism
    pub p_cost: u32,
    /// Output length in bytes
    pub output_len: usize,
}

impl Default for KdfParams {
    fn default() -> Self {
        Self {
            m_cost: 65536,  // 64 MB
            t_cost: 3,
            p_cost: 4,
            output_len: 32, // 256 bits
        }
    }
}

/// Derived key wrapper that ensures secure memory handling
#[derive(ZeroizeOnDrop)]
pub struct DerivedKey(Vec<u8>);

impl DerivedKey {
    /// Get the key bytes
    pub fn as_bytes(&self) -> &[u8] {
        &self.0
    }

    /// Convert to fixed-size array
    pub fn into_array(self) -> Result<[u8; 32]> {
        if self.0.len() != 32 {
            return Err(AppError::Encryption("Invalid key length".into()));
        }
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&self.0);
        Ok(arr)
    }
}

/// Derive a key from a password using Argon2id
pub fn derive_key(password: &str, salt: &[u8], params: &KdfParams) -> Result<DerivedKey> {
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        Params::new(params.m_cost, params.t_cost, params.p_cost, Some(params.output_len))
            .map_err(|e| AppError::Encryption(e.to_string()))?,
    );

    let salt_string = SaltString::encode_b64(salt)
        .map_err(|e| AppError::Encryption(e.to_string()))?;

    let hash = argon2
        .hash_password(password.as_bytes(), &salt_string)
        .map_err(|e| AppError::Encryption(e.to_string()))?;

    let hash_output = hash
        .hash
        .ok_or_else(|| AppError::Encryption("Failed to derive key".into()))?;

    let mut key = Vec::new();
    key.extend_from_slice(hash_output.as_bytes());

    Ok(DerivedKey(key))
}

/// Generate a random salt
pub fn generate_salt() -> [u8; 16] {
    use rand::RngCore;
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    salt
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key() {
        let password = "test_password_123";
        let salt = generate_salt();
        let params = KdfParams::default();

        let key1 = derive_key(password, &salt, &params).unwrap();
        let key2 = derive_key(password, &salt, &params).unwrap();

        // Same password and salt should produce same key
        assert_eq!(key1.as_bytes(), key2.as_bytes());

        // Different password should produce different key
        let key3 = derive_key("different_password", &salt, &params).unwrap();
        assert_ne!(key1.as_bytes(), key3.as_bytes());
    }

    #[test]
    fn test_key_length() {
        let password = "test";
        let salt = generate_salt();
        let params = KdfParams::default();

        let key = derive_key(password, &salt, &params).unwrap();
        assert_eq!(key.as_bytes().len(), 32);
    }
}
