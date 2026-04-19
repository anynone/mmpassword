## ADDED Requirements

### Requirement: Unsaved changes confirmation dialog
The system SHALL detect when the user has unsaved modifications in editing or creating mode, and SHALL present a confirmation dialog before navigating away.

#### Scenario: Confirmation dialog appearance
- **WHEN** user has unsaved changes and attempts to navigate away
- **THEN** a confirmation dialog appears with three options: "Don't Save", "Save", and "Cancel"
- **THEN** "Don't Save" discards changes and proceeds with navigation
- **THEN** "Save" saves changes first, then proceeds with navigation
- **THEN** "Cancel" dismisses the dialog and stays in current editing state

### Requirement: Navigation guards during editing
The system SHALL block all navigation actions that would lose unsaved changes, including: selecting another entry, creating a new entry, and switching groups.

#### Scenario: Editing entry A, then selecting entry B
- **WHEN** user is editing entry A with unsaved changes and clicks entry B in the list
- **THEN** confirmation dialog appears
- **WHEN** user clicks "Don't Save"
- **THEN** changes to A are discarded, entry B is selected in viewing mode
- **WHEN** user clicks "Save"
- **THEN** changes to A are saved, entry B is selected in viewing mode
- **WHEN** user clicks "Cancel"
- **THEN** dialog closes, user remains editing entry A

#### Scenario: Editing entry A, then clicking "+ New"
- **WHEN** user is editing entry A with unsaved changes and clicks the "+" button
- **THEN** confirmation dialog appears
- **WHEN** user clicks "Don't Save"
- **THEN** changes to A are discarded, virtual entry is created, right panel enters creating mode
- **WHEN** user clicks "Save"
- **THEN** changes to A are saved, virtual entry is created, right panel enters creating mode

#### Scenario: Creating new entry, then selecting another entry
- **WHEN** user is in creating mode with form data filled and clicks an existing entry
- **THEN** confirmation dialog appears
- **WHEN** user clicks "Don't Save"
- **THEN** virtual entry is removed, selected entry is shown in viewing mode
- **WHEN** user clicks "Save"
- **THEN** new entry is created via API, virtual entry removed, selected entry is shown in viewing mode

#### Scenario: Creating new entry, then clicking "+ New" again
- **WHEN** user is in creating mode with form data filled and clicks "+" button again
- **THEN** confirmation dialog appears
- **WHEN** user clicks "Don't Save"
- **THEN** form is reset to empty creating mode with a new virtual entry
- **WHEN** user clicks "Save"
- **THEN** current entry is created, form is reset to empty creating mode with a new virtual entry

#### Scenario: Editing entry, then switching group in sidebar
- **WHEN** user is editing or creating with unsaved changes and clicks a different group in sidebar
- **THEN** confirmation dialog appears
- **WHEN** user clicks "Don't Save"
- **THEN** changes are discarded, group is switched, right panel enters viewing mode
- **WHEN** user clicks "Save"
- **THEN** changes are saved, group is switched, right panel enters viewing mode

### Requirement: No confirmation needed for unchanged forms
The system SHALL NOT show the confirmation dialog if the form has no unsaved modifications.

#### Scenario: Edit mode with no changes
- **WHEN** user enters editing mode but makes no changes to any field, then navigates away
- **THEN** no confirmation dialog appears, navigation proceeds immediately

#### Scenario: Create mode with empty form
- **WHEN** user enters creating mode but fills in no fields, then navigates away
- **THEN** virtual entry is silently removed, no confirmation dialog appears
