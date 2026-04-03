## ADDED Requirements

### Requirement: Subscription entry card on WelcomeScreen
The system SHALL display a subscription action card on the WelcomeScreen, alongside the existing "New Vault", "Open Local File", and "Connect Git Repo" cards.

#### Scenario: Subscription card display
- **WHEN** the WelcomeScreen is rendered
- **THEN** a card labeled with subscription icon and title SHALL be displayed, allowing users to input a subscription URL

#### Scenario: Input subscription URL and fetch
- **WHEN** user enters a URL in the subscription input and submits
- **THEN** the system SHALL call the fetch_subscription_vault command and transition to MainScreen on success

#### Scenario: Fetch failure feedback
- **WHEN** the subscription fetch fails (network error, invalid URL, decryption failure)
- **THEN** the system SHALL display an error message on the WelcomeScreen without transitioning to MainScreen

### Requirement: Subscription history list on WelcomeScreen
The system SHALL display a list of recent subscription URLs on the WelcomeScreen for quick access, similar to the existing recent vaults and recent git repos lists.

#### Scenario: History list display
- **WHEN** the WelcomeScreen is rendered and subscription_history is non-empty
- **THEN** a list of subscription history entries SHALL be displayed, each showing the vault name, entry count, and last accessed date

#### Scenario: Quick access from history
- **WHEN** user clicks on a subscription history entry
- **THEN** the system SHALL fetch the subscription from that URL and transition to MainScreen on success

#### Scenario: Remove history entry
- **WHEN** user removes a subscription history entry (via delete button or context menu)
- **THEN** the entry SHALL be removed from the list and from the persisted config

#### Scenario: Empty history state
- **WHEN** subscription_history is empty
- **THEN** the subscription history section SHALL be hidden or show an empty state message

### Requirement: Merged entry display in MainScreen
The system SHALL display subscription entries alongside local entries in the EntryList, with a visual indicator distinguishing subscription entries from local entries.

#### Scenario: Subscription entry indicator
- **WHEN** subscription entries are present and displayed in the EntryList
- **THEN** each subscription entry SHALL show a lock icon (or similar visual indicator) to denote read-only status

#### Scenario: Subscription groups in SideNavBar
- **WHEN** subscription data includes groups
- **THEN** the subscription groups SHALL appear in the SideNavBar under a distinct section or merged with local groups, with visual distinction from local groups

#### Scenario: No active subscription
- **WHEN** no subscription data is loaded
- **THEN** the MainScreen SHALL display only local vault entries with no subscription-related UI elements

### Requirement: Read-only enforcement for subscription entries
The system SHALL prevent all editing operations on subscription entries and display a message when the user attempts to modify them.

#### Scenario: Block edit action
- **WHEN** user clicks the edit button on a subscription entry in EntryDetail
- **THEN** the system SHALL NOT enter edit mode and SHALL display a toast/notification with the message "订阅信息无法修改"

#### Scenario: Block context menu edit
- **WHEN** user right-clicks a subscription entry and selects "Edit" from the context menu
- **THEN** the system SHALL display the message "订阅信息无法修改" and not open edit mode

#### Scenario: Block delete action
- **WHEN** user attempts to delete a subscription entry
- **THEN** the system SHALL display the message "订阅信息无法修改" and not perform the deletion

#### Scenario: Block create entry in subscription context
- **WHEN** a subscription group is selected and the user clicks "New Entry"
- **THEN** the system SHALL display the message "订阅信息无法修改" and not open the create form

### Requirement: View subscription entry details
The system SHALL allow users to view all fields of a subscription entry, including copying field values to clipboard.

#### Scenario: View subscription entry
- **WHEN** user selects a subscription entry
- **THEN** the system SHALL display all fields (title, username, password, URL, notes, etc.) in read-only mode with copy buttons enabled

#### Scenario: Copy field value
- **WHEN** user clicks the copy button on a subscription entry field
- **THEN** the system SHALL copy the field value to the clipboard, same behavior as local entries

#### Scenario: Toggle password visibility
- **WHEN** user clicks the visibility toggle on a subscription entry password field
- **THEN** the system SHALL show or hide the password value, same behavior as local entries

### Requirement: Clear subscription on lock
The system SHALL clear all subscription data from memory when the user locks the vault or returns to the WelcomeScreen.

#### Scenario: Lock clears subscription
- **WHEN** user clicks the lock button in MainScreen
- **THEN** the system SHALL clear the subscription vault, subscription entries, and subscription source from the store, then return to WelcomeScreen

#### Scenario: Back to WelcomeScreen clears subscription
- **WHEN** user navigates back to WelcomeScreen from MainScreen
- **THEN** the system SHALL clear all subscription-related state from the frontend store
