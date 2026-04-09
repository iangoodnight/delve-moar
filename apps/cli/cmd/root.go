// Package cmd contains all Cobra command definitions for the dm CLI.
package cmd

import (
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "dm",
	Short: "Delve Moar — homebrew-first TTRPG utilities for the discerning GM",
	Long: `dm is a command-line companion for tabletop RPG game masters.

Look up monsters, spells, and conditions from the SRD catalog,
build encounters, roll treasure, and more — all without leaving
your terminal.

Use 'dm [command] --help' for more information about a command.`,
}

// Execute is the entrypoint called by main.go.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
