## ADDED Requirements

### Requirement: Password field stores history of previous values
When a password field's value is changed during entry update, the system SHALL automatically record the previous value and the timestamp of the change. The system SHALL store up to 3 historical entries per password field, using FIFO eviction when the limit is exceeded.

#### Scenario: Password value changed during update
- **WHEN** user updates an entry and a password-type field's value changes from "oldPass" to "newPass"
- **THEN** the system SHALL add a `PasswordHistoryEntry { value: "oldPass", changedAt: "<current timestamp>" }` to that field's `passwordHistory`
- **THEN** the field's `value` SHALL be "newPass"

#### Scenario: Non-password field value changed
- **WHEN** user updates an entry and a non-password-type field's value changes
- **THEN** the system SHALL NOT add any history entry

#### Scenario: Password value unchanged during update
- **WHEN** user updates an entry and a password-type field's value remains the same
- **THEN** the system SHALL NOT add any history entry

#### Scenario: History exceeds maximum of 3 entries
- **WHEN** a password field already has 3 history entries and the password is changed again
- **THEN** the system SHALL add the new history entry at the beginning
- **THEN** the system SHALL remove the oldest (last) entry to maintain a maximum of 3

#### Scenario: Field matching by name
- **WHEN** the system compares old and new fields during update
- **THEN** the system SHALL match fields by their `name` property
- **THEN** if no matching old field is found by name, no history entry SHALL be created

### Requirement: Password history data model
The `Field` structure SHALL include a `passwordHistory` array. Each entry in the array SHALL be a `PasswordHistoryEntry` containing `value` (the previous password) and `changedAt` (ISO 8601 timestamp of when the change occurred).

#### Scenario: New vault file field structure
- **WHEN** a new entry is created with a password field
- **THEN** the password field SHALL have an empty `passwordHistory` array

#### Scenario: Legacy vault file backward compatibility
- **WHEN** a vault file created before this feature is loaded
- **THEN** all fields SHALL deserialize with an empty `passwordHistory` array
- **THEN** the vault SHALL function normally without errors

### Requirement: Password history display in entry detail
When viewing an entry, the system SHALL display historical password values for any password-type field that has non-empty `passwordHistory`. Each historical entry SHALL show the password value (masked by default), a toggle to reveal it, a copy button, and the change timestamp.

#### Scenario: View entry with password history
- **WHEN** user views an entry that has a password field with 2 history entries
- **THEN** the system SHALL display a "历史密码" section below the current password field
- **THEN** each history entry SHALL show a masked password with show/hide toggle, a copy button, and the change date

#### Scenario: View entry without password history
- **WHEN** user views an entry that has a password field with empty `passwordHistory`
- **THEN** the system SHALL NOT display any history section

#### Scenario: Copy historical password
- **WHEN** user clicks the copy button on a historical password entry
- **THEN** the historical password value SHALL be copied to the clipboard
