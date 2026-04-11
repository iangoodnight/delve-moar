package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/iangoodnight/delve-moar/cli/internal/apiclient"
)

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

var spellListOpts struct {
	school   string
	levelMin int
	levelMax int
	search   string
	orderBy  string
	limit    int
	offset   int
}

var spellGetOpts struct {
	namespace string
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

var spellCmd = &cobra.Command{
	Use:   "spell",
	Short: "Look up spells from the SRD catalog",
}

var spellListCmd = &cobra.Command{
	Use:   "list",
	Short: "List spells with optional filters",
	RunE:  runSpellList,
}

var spellGetCmd = &cobra.Command{
	Use:   "get <slug>",
	Short: "Get full details for a spell by slug",
	Args:  cobra.ExactArgs(1),
	RunE:  runSpellGet,
}

func init() {
	spellListCmd.Flags().StringVar(&spellListOpts.school, "school", "", "Exact match on spell school (e.g. 'evocation')")
	spellListCmd.Flags().IntVar(&spellListOpts.levelMin, "level-min", 0, "Inclusive minimum spell level (0–9)")
	spellListCmd.Flags().IntVar(&spellListOpts.levelMax, "level-max", 0, "Inclusive maximum spell level (0–9)")
	spellListCmd.Flags().StringVar(&spellListOpts.search, "search", "", "Case-insensitive substring search on spell name")
	spellListCmd.Flags().StringVar(&spellListOpts.orderBy, "order-by", "", "Sort order, e.g. 'level:asc,name:asc'")
	spellListCmd.Flags().IntVar(&spellListOpts.limit, "limit", 20, "Maximum number of results to return")
	spellListCmd.Flags().IntVar(&spellListOpts.offset, "offset", 0, "Number of results to skip")

	spellGetCmd.Flags().StringVar(&spellGetOpts.namespace, "namespace", "", "Source namespace (default: srd-5.1)")

	spellCmd.AddCommand(spellListCmd, spellGetCmd)
	rootCmd.AddCommand(spellCmd)
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

func runSpellList(cmd *cobra.Command, _ []string) error {
	client, err := newClient()
	if err != nil {
		return fmt.Errorf("creating API client: %w", err)
	}

	params := &apiclient.ListSpellsV1SpellsGetParams{
		Limit:  ptrInt(spellListOpts.limit),
		Offset: ptrInt(spellListOpts.offset),
	}
	if cmd.Flags().Changed("school") {
		params.School = ptrStr(spellListOpts.school)
	}
	if cmd.Flags().Changed("level-min") {
		params.LevelMin = ptrInt(spellListOpts.levelMin)
	}
	if cmd.Flags().Changed("level-max") {
		params.LevelMax = ptrInt(spellListOpts.levelMax)
	}
	if cmd.Flags().Changed("search") {
		params.Search = ptrStr(spellListOpts.search)
	}
	if cmd.Flags().Changed("order-by") {
		params.OrderBy = ptrStr(spellListOpts.orderBy)
	}

	resp, err := client.ListSpellsV1SpellsGetWithResponse(context.Background(), params)
	if err != nil {
		return fmt.Errorf("calling API: %w", err)
	}
	if resp.JSON200 == nil {
		if resp.JSON422 != nil {
			return fmt.Errorf("validation error: %s", resp.JSON422.UserMessage)
		}
		return fmt.Errorf("unexpected status %s", resp.Status())
	}

	data := resp.JSON200.Data
	meta := resp.JSON200.Metadata.Resultset

	if meta.Count == 0 {
		fmt.Println("No spells found.")
		return nil
	}

	w := newTabW(os.Stdout)
	w.println("NAME\tLEVEL\tSCHOOL")
	for _, s := range data {
		school := "-"
		if s.School != nil {
			school = *s.School
		}
		w.printf("%s\t%s\t%s\n", s.Name, s.Level, school)
	}
	if err := w.flush(); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	start := meta.Offset + 1
	end := meta.Offset + len(data)
	fmt.Printf("\nShowing %d\u2013%d of %d\n", start, end, meta.Count)
	return nil
}

func runSpellGet(_ *cobra.Command, args []string) error {
	client, err := newClient()
	if err != nil {
		return fmt.Errorf("creating API client: %w", err)
	}

	slug := args[0]
	params := &apiclient.GetSpellV1SpellsSlugGetParams{}
	if spellGetOpts.namespace != "" {
		params.Namespace = ptrStr(spellGetOpts.namespace)
	}

	resp, err := client.GetSpellV1SpellsSlugGetWithResponse(context.Background(), slug, params)
	if err != nil {
		return fmt.Errorf("calling API: %w", err)
	}
	if resp.JSON404 != nil {
		fmt.Fprintf(os.Stderr, "error: %s\n", resp.JSON404.UserMessage)
		os.Exit(1)
	}
	if resp.JSON200 == nil {
		return fmt.Errorf("unexpected status %s", resp.Status())
	}

	s := resp.JSON200
	school := "-"
	if s.School != nil {
		school = *s.School
	}

	w := newTabW(os.Stdout)
	w.printf("%s\n", s.Name)
	w.printf("Slug:\t%s\n", s.Slug)
	w.printf("Level:\t%s\n", s.Level)
	w.printf("School:\t%s\n", school)
	if err := w.flush(); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	return nil
}
