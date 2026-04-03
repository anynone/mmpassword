## ADDED Requirements

### Requirement: Fetch subscription vault from URL
The system SHALL provide a Tauri IPC command `fetch_subscription_vault(url)` that performs HTTP GET to the subscription URL, decodes the base64 response, parses the .mmp binary format, decrypts using the shared password, and returns the decrypted Vault object.

#### Scenario: Successful fetch and decrypt
- **WHEN** user provides a valid subscription URL and the server returns a valid base64-encoded .mmp encrypted payload
- **THEN** the system SHALL decrypt the payload using the shared password via Argon2id key derivation and ChaCha20-Poly1305 decryption, store the Vault in memory (not on disk), and return the Vault to the frontend

#### Scenario: Network error during fetch
- **WHEN** the HTTP GET request fails due to network error, timeout, or server unavailability
- **THEN** the system SHALL return a descriptive error message to the frontend without crashing

#### Scenario: Invalid response format
- **WHEN** the server response cannot be base64-decoded, or the decoded data does not match the .mmp format (missing MMP1 magic header)
- **THEN** the system SHALL return an error indicating invalid subscription data format

#### Scenario: Decryption failure
- **WHEN** the base64-decoded data has valid .mmp header but decryption fails (wrong shared password, corrupted data, authentication tag mismatch)
- **THEN** the system SHALL return an error indicating decryption failure

#### Scenario: HTTP error response
- **WHEN** the server returns a non-200 HTTP status code (404 not found, 410 expired)
- **THEN** the system SHALL return an appropriate error message indicating the subscription was not found or expired

### Requirement: In-memory vault decryption from bytes
The system SHALL provide a Rust function `decrypt_vault_from_bytes(data: &[u8], password: &str) -> Result<Vault>` that decrypts a Vault from raw .mmp binary data in memory, without writing to or reading from the filesystem.

#### Scenario: Decrypt valid .mmp bytes
- **WHEN** given a byte slice containing a valid .mmp file (MMP1 header + salt + nonce + ciphertext) and the correct shared password
- **THEN** the function SHALL extract salt and nonce, derive the key via Argon2id, decrypt with ChaCha20-Poly1305, deserialize the JSON, and return the Vault object

#### Scenario: Invalid binary format
- **WHEN** given bytes that do not start with the MMP1 magic header
- **THEN** the function SHALL return a format validation error

### Requirement: Subscription vault stored only in memory
The system SHALL store the decrypted subscription Vault exclusively in AppState memory. The subscription Vault SHALL NOT be persisted to the filesystem under any circumstances.

#### Scenario: Lock vault clears subscription data
- **WHEN** the user locks the current vault session
- **THEN** the system SHALL clear both the local vault session and the subscription vault from memory

#### Scenario: No disk persistence on save
- **WHEN** the user saves changes to the local vault
- **THEN** the system SHALL NOT include subscription entries in the save operation

### Requirement: Subscription history management
The system SHALL store and retrieve subscription URL history in the application configuration, with a maximum of 10 entries.

#### Scenario: Successful fetch adds to history
- **WHEN** a subscription URL is successfully fetched and decrypted
- **THEN** the system SHALL add or update the URL in subscription_history in AppConfig with the vault name, entry count, and current timestamp

#### Scenario: Get subscription history
- **WHEN** the frontend requests subscription history via `get_subscription_history` command
- **THEN** the system SHALL return the list of recent subscription metadata from AppConfig

#### Scenario: Remove subscription history entry
- **WHEN** the frontend requests removal of a subscription URL via `remove_subscription_history` command
- **THEN** the system SHALL remove that entry from subscription_history in AppConfig and persist the change

#### Scenario: History size limit
- **WHEN** subscription_history reaches 10 entries and a new entry is added
- **THEN** the system SHALL remove the oldest entry before adding the new one

### Requirement: Subscription vault independent from local vault session
The system SHALL maintain subscription vault data independently from the local VaultSession in AppState.

#### Scenario: Local vault operations unaffected
- **WHEN** subscription data is loaded in memory
- **THEN** all existing local vault commands (get_entries, create_entry, update_entry, delete_entry, save_vault, sync_git_vault) SHALL operate exclusively on the local vault session without interference from subscription data

#### Scenario: Clear subscription without affecting local vault
- **WHEN** the user clears or replaces the subscription data
- **THEN** the local vault session SHALL remain intact and functional
