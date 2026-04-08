// Package tui provides the Bubble Tea model and styles for the dm interactive TUI.
package tui

import "github.com/charmbracelet/lipgloss"

var (
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#C53030")). // deep red — D&D flavour
			MarginBottom(1)

	subtitleStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#718096")).
			Italic(true)

	bodyStyle = lipgloss.NewStyle().
			MarginTop(1).
			MarginBottom(1)

	footerStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#A0AEC0")).
			MarginTop(1)
)
