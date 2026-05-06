## MODIFIED Requirements

### Requirement: Right panel supports three display modes
The right panel (EntryDetail) SHALL support three modes: `viewing` (read-only), `editing` (editing existing entry), and `creating` (creating new entry). The system SHALL NOT use a modal for entry editing or creation. In viewing mode, password-type fields with non-empty `passwordHistory` SHALL display a historical password section.

#### Scenario: View an entry
- **WHEN** user selects an entry from the list
- **THEN** right panel displays the entry in read-only mode with all field values, copy buttons, and an edit icon
- **THEN** password fields with non-empty `passwordHistory` SHALL display a collapsible history section below the current value

#### Scenario: Edit an entry
- **WHEN** user clicks the edit icon on a viewed entry
- **THEN** right panel switches from viewing to editing mode, displaying editable form fields pre-populated with the entry's current values
- **THEN** the entry type selector SHALL NOT be displayed (entry type is immutable after creation)
- **THEN** the history section SHALL be hidden during editing

#### Scenario: Create a new entry
- **WHEN** user clicks the "+" button
- **THEN** a virtual entry placeholder appears at the top of the entry list
- **THEN** right panel switches to creating mode with an empty form
- **THEN** the entry type selector SHALL be displayed
- **THEN** the group field SHALL default to the currently selected group
