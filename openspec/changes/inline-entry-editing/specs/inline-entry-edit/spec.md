## ADDED Requirements

### Requirement: Right panel supports three display modes
The right panel (EntryDetail) SHALL support three modes: `viewing` (read-only), `editing` (editing existing entry), and `creating` (creating new entry). The system SHALL NOT use a modal for entry editing or creation.

#### Scenario: View an entry
- **WHEN** user selects an entry from the list
- **THEN** right panel displays the entry in read-only mode with all field values, copy buttons, and an edit icon

#### Scenario: Edit an entry
- **WHEN** user clicks the edit icon on a viewed entry
- **THEN** right panel switches from viewing to editing mode, displaying editable form fields pre-populated with the entry's current values
- **THEN** the entry type selector SHALL NOT be displayed (entry type is immutable after creation)

#### Scenario: Create a new entry
- **WHEN** user clicks the "+" button
- **THEN** a virtual entry placeholder appears at the top of the entry list
- **THEN** right panel switches to creating mode with an empty form
- **THEN** the entry type selector SHALL be displayed
- **THEN** the group field SHALL default to the currently selected group

### Requirement: Virtual entry placeholder for creation
The system SHALL use a virtual entry placeholder in the entry list during creation mode. This placeholder SHALL NOT be persisted to the backend until the user explicitly saves.

#### Scenario: Virtual entry display
- **WHEN** user is in creating mode
- **THEN** entry list displays a virtual placeholder at the top with a distinct visual style (e.g., italic title, "New Entry" default text)
- **THEN** the virtual entry SHALL be selected/highlighted in the list

#### Scenario: Save virtual entry
- **WHEN** user fills in the form and clicks "Create Entry"
- **THEN** system calls `createEntry` backend API
- **THEN** virtual placeholder is removed from the list
- **THEN** the newly created entry appears in the list as a real entry
- **THEN** right panel switches to viewing mode showing the created entry

#### Scenario: Cancel creation
- **WHEN** user clicks "Cancel" while in creating mode
- **THEN** virtual placeholder is removed from the list
- **THEN** right panel switches to viewing mode (showing previously selected entry or empty state)

#### Scenario: Application restart during creation
- **WHEN** user closes the application while in creating mode
- **THEN** virtual entry is discarded (not persisted)
- **THEN** no data loss occurs for existing entries

### Requirement: Inline edit form layout
The edit form in the right panel SHALL provide sufficient space for all fields without crowding.

#### Scenario: Field layout in editing/creating mode
- **WHEN** right panel is in editing or creating mode
- **THEN** form displays: title input, entry type selector (create only), group selector, favorite checkbox, and dynamic fields list
- **THEN** each field row displays: field name, field type selector, field value, and delete button
- **THEN** password fields include a "Generate Password" button
- **THEN** an "Add Field" button allows adding new fields
- **THEN** form has "Cancel" and "Save" / "Create" buttons at the bottom

### Requirement: Entry type is immutable after creation
The entry type (Website Login / Secure Note) SHALL only be selectable during entry creation.

#### Scenario: Entry type in creating mode
- **WHEN** user is in creating mode
- **THEN** entry type selector is visible and changeable

#### Scenario: Entry type in editing mode
- **WHEN** user is in editing mode
- **THEN** entry type selector is NOT displayed
- **THEN** entry type remains unchanged after saving
