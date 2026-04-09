package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

// Version is set at build time via -ldflags:
//
//	go build -ldflags "-X github.com/iangoodnight/delve-moar/cli/cmd.Version=1.2.3"
var Version = "dev"

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the dm version",
	Long:  "Print the current version of the dm CLI binary.",
	Run: func(_ *cobra.Command, _ []string) {
		fmt.Printf("dm version %s\n", Version)
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
