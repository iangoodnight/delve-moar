package cmd

import (
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"

	"github.com/iangoodnight/dungeon-master/cli/internal/tui"
)

var tuiCmd = &cobra.Command{
	Use:   "tui",
	Short: "Launch the interactive TUI",
	Long:  "Open the full-screen interactive terminal UI for Dungeon Master.",
	Run: func(_ *cobra.Command, _ []string) {
		p := tea.NewProgram(tui.InitialModel(), tea.WithAltScreen())
		if _, err := p.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "error running TUI: %v\n", err)
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(tuiCmd)
}
