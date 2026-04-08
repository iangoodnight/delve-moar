package tui

import (
	tea "github.com/charmbracelet/bubbletea"
)

// Model is the root Bubble Tea model for the dm interactive TUI.
type Model struct {
	width  int
	height int
}

// InitialModel returns the default starting state of the TUI.
func InitialModel() Model {
	return Model{}
}

// Init is called once when the program starts. No initial commands needed.
func (m Model) Init() tea.Cmd {
	return nil
}

// Update handles all incoming messages and key events.
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c", "esc":
			return m, tea.Quit
		}
	}

	return m, nil
}

// View renders the current state of the TUI to a string.
func (m Model) View() string {
	title := titleStyle.Render("⚔  Dungeon Master")
	subtitle := subtitleStyle.Render("homebrew-first D&D utilities")
	body := bodyStyle.Render("Coming soon:\n  monster & spell catalog\n  encounter builder\n  character sheets")
	footer := footerStyle.Render("press q to quit")

	return title + "\n" + subtitle + "\n" + body + "\n" + footer
}
