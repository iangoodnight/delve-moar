package cmd

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"github.com/spf13/cobra"

	"github.com/iangoodnight/delve-moar/cli/internal/apiclient"
)

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

var monsterListOpts struct {
	monsterType string
	crMin       float64
	crMax       float64
	search      string
	orderBy     string
	limit       int
	offset      int
}

var monsterGetOpts struct {
	namespace string
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

var monsterCmd = &cobra.Command{
	Use:   "monster",
	Short: "Look up monsters from the SRD catalog",
}

var monsterListCmd = &cobra.Command{
	Use:   "list",
	Short: "List monsters with optional filters",
	RunE:  runMonsterList,
}

var monsterGetCmd = &cobra.Command{
	Use:   "get <slug>",
	Short: "Get full details for a monster by slug",
	Args:  cobra.ExactArgs(1),
	RunE:  runMonsterGet,
}

func init() {
	monsterListCmd.Flags().StringVar(&monsterListOpts.monsterType, "type", "", "Exact match on monster type (e.g. 'undead')")
	monsterListCmd.Flags().Float64Var(&monsterListOpts.crMin, "cr-min", 0, "Inclusive minimum challenge rating (e.g. 0.5 for CR 1/2)")
	monsterListCmd.Flags().Float64Var(&monsterListOpts.crMax, "cr-max", 0, "Inclusive maximum challenge rating (e.g. 5)")
	monsterListCmd.Flags().StringVar(&monsterListOpts.search, "search", "", "Case-insensitive substring search on name and type")
	monsterListCmd.Flags().StringVar(&monsterListOpts.orderBy, "order-by", "", "Sort order, e.g. 'challenge_rating:asc,name:asc'")
	monsterListCmd.Flags().IntVar(&monsterListOpts.limit, "limit", 20, "Maximum number of results to return")
	monsterListCmd.Flags().IntVar(&monsterListOpts.offset, "offset", 0, "Number of results to skip")

	monsterGetCmd.Flags().StringVar(&monsterGetOpts.namespace, "namespace", "", "Source namespace (default: srd-5.1)")

	monsterCmd.AddCommand(monsterListCmd, monsterGetCmd)
	rootCmd.AddCommand(monsterCmd)
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

func runMonsterList(cmd *cobra.Command, _ []string) error {
	client, err := newClient()
	if err != nil {
		return fmt.Errorf("creating API client: %w", err)
	}

	params := &apiclient.ListMonstersV1MonstersGetParams{
		Limit:  ptrInt(monsterListOpts.limit),
		Offset: ptrInt(monsterListOpts.offset),
	}
	if cmd.Flags().Changed("type") {
		params.Type = ptrStr(monsterListOpts.monsterType)
	}
	if cmd.Flags().Changed("search") {
		params.Search = ptrStr(monsterListOpts.search)
	}
	if cmd.Flags().Changed("order-by") {
		params.OrderBy = ptrStr(monsterListOpts.orderBy)
	}

	// cr-min and cr-max are union types in the generated client (float32 | string).
	// The anonymous struct's union field is unexported, so we inject them via a
	// request editor instead of setting the params struct fields directly.
	var reqEditors []apiclient.RequestEditorFn
	crMinChanged := cmd.Flags().Changed("cr-min")
	crMaxChanged := cmd.Flags().Changed("cr-max")
	if crMinChanged || crMaxChanged {
		crMin := monsterListOpts.crMin
		crMax := monsterListOpts.crMax
		reqEditors = append(reqEditors, func(_ context.Context, r *http.Request) error {
			q := r.URL.Query()
			if crMinChanged {
				q.Set("cr_min", strconv.FormatFloat(crMin, 'f', -1, 64))
			}
			if crMaxChanged {
				q.Set("cr_max", strconv.FormatFloat(crMax, 'f', -1, 64))
			}
			r.URL.RawQuery = q.Encode()
			return nil
		})
	}

	resp, err := client.ListMonstersV1MonstersGetWithResponse(
		context.Background(), params, reqEditors...,
	)
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
		fmt.Println("No monsters found.")
		return nil
	}

	w := newTabW(os.Stdout)
	w.println("NAME\tTYPE\tCR")
	for _, m := range data {
		typ := "-"
		if m.MonsterType != nil {
			typ = *m.MonsterType
		}
		w.printf("%s\t%s\t%s\n", m.Name, typ, m.ChallengeRating)
	}
	if err := w.flush(); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	start := meta.Offset + 1
	end := meta.Offset + len(data)
	fmt.Printf("\nShowing %d\u2013%d of %d\n", start, end, meta.Count)
	return nil
}

func runMonsterGet(_ *cobra.Command, args []string) error {
	client, err := newClient()
	if err != nil {
		return fmt.Errorf("creating API client: %w", err)
	}

	slug := args[0]
	params := &apiclient.GetMonsterV1MonstersSlugGetParams{}
	if monsterGetOpts.namespace != "" {
		params.Namespace = ptrStr(monsterGetOpts.namespace)
	}

	resp, err := client.GetMonsterV1MonstersSlugGetWithResponse(context.Background(), slug, params)
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

	m := resp.JSON200
	typ := "-"
	if m.MonsterType != nil {
		typ = *m.MonsterType
	}

	w := newTabW(os.Stdout)
	w.printf("%s\n", m.Name)
	w.printf("Slug:\t%s\n", m.Slug)
	w.printf("Type:\t%s\n", typ)
	w.printf("CR:\t%s\n", m.ChallengeRating)
	if err := w.flush(); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	return nil
}
