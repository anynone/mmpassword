//! Secure random number generation

use rand::RngCore;
use rand_chacha::ChaCha20Rng;
use rand::SeedableRng;

use crate::error::Result;

/// Generate a random byte array of specified length
pub fn random_bytes(len: usize) -> Vec<u8> {
    let mut bytes = vec![0u8; len];
    ChaCha20Rng::from_entropy().fill_bytes(&mut bytes);
    bytes
}

/// Generate a random 16-byte salt
pub fn random_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    ChaCha20Rng::from_entropy().fill_bytes(&mut salt);
    salt
}

/// Generate a random 12-byte nonce for ChaCha20-Poly1305
pub fn random_nonce() -> [u8; 12] {
    let mut nonce = [0u8; 12];
    ChaCha20Rng::from_entropy().fill_bytes(&mut nonce);
    nonce
}

/// Generate a random password
pub fn generate_password(
    length: usize,
    uppercase: bool,
    lowercase: bool,
    digits: bool,
    symbols: bool,
    spaces: bool,
) -> Result<String> {
    let mut charset = String::new();

    if uppercase {
        charset.push_str("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    if lowercase {
        charset.push_str("abcdefghijklmnopqrstuvwxyz");
    }
    if digits {
        charset.push_str("0123456789");
    }
    if symbols {
        charset.push_str("!@#$%^&*()_+-=[]{}|;:,.<>?");
    }
    if spaces {
        charset.push(' ');
    }

    if charset.is_empty() {
        return Ok(String::new());
    }

    let charset_bytes = charset.as_bytes();
    let mut rng = ChaCha20Rng::from_entropy();
    let mut password = String::with_capacity(length);

    for _ in 0..length {
        let idx = (rng.next_u32() as usize) % charset_bytes.len();
        password.push(charset_bytes[idx] as char);
    }

    Ok(password)
}

/// Password generation options
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordOptions {
    /// Password length (10-50)
    pub length: usize,
    /// Include uppercase letters
    pub uppercase: bool,
    /// Include lowercase letters
    pub lowercase: bool,
    /// Include digits
    pub digits: bool,
    /// Include symbols
    pub symbols: bool,
    /// Include spaces
    pub spaces: bool,
}

impl Default for PasswordOptions {
    fn default() -> Self {
        Self {
            length: 20,
            uppercase: true,
            lowercase: true,
            digits: true,
            symbols: true,
            spaces: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_random_bytes() {
        let bytes1 = random_bytes(32);
        let bytes2 = random_bytes(32);

        assert_eq!(bytes1.len(), 32);
        assert_eq!(bytes2.len(), 32);
        assert_ne!(bytes1, bytes2);
    }

    #[test]
    fn test_random_salt() {
        let salt1 = random_salt();
        let salt2 = random_salt();

        assert_ne!(salt1, salt2);
    }

    #[test]
    fn test_generate_password() {
        let password = generate_password(20, true, true, true, true, false).unwrap();

        assert_eq!(password.len(), 20);
    }

    #[test]
    fn test_generate_password_empty_charset() {
        let password = generate_password(10, false, false, false, false, false).unwrap();

        assert!(password.is_empty());
    }
}
